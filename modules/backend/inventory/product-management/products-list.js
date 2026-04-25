// ============================================================
// products-list.js — Products List (ตารางรายการสินค้า)
// form อยู่ที่ products-form.html / products-form.js
// ============================================================

// ============ Database ============
let products = [];
let allUnits = []; // units จาก DB เพื่อแสดงชื่อหน่วย
var currentAppMode = "test";

function getUnitName(unitId) {
  if (!unitId) return '';
  var u = allUnits.find(function (x) { return x.id === unitId; });
  return u ? u.name : '';
}

function reloadProducts() {
  return Promise.all([
    typeof fetchProducts === "function" ? fetchProducts() : Promise.resolve([]),
    typeof fetchUnitsDB === "function" ? fetchUnitsDB() : Promise.resolve([]),
  ]).then(function (results) {
    products = (results[0] || []).map(function (p) {
      return {
        id: p.id,
        name: p.name || '',
        sku: p.sku || '',
        category: p.categories ? p.categories.name : (p.category || ''),
        price: Number(p.price) || 0,
        unit_id: p.unit_id || null,
        variants: p.variants || [],
        status: p.status || 'active',
        low_stock_threshold: p.low_stock_threshold != null ? Number(p.low_stock_threshold) : null,
      };
    });
    allUnits = (results[1] || []).map(function (u) {
      return { id: u.id, name: u.name, abbr: u.abbr || '' };
    });
    return products;
  });
}

// ============ Stats ============
function updateStats() {
  document.getElementById("statAll").textContent = products.length;
  document.getElementById("statActive").textContent = products.filter(function(p) { return p.status === "active"; }).length;
  document.getElementById("statInactive").textContent = products.filter(function(p) { return p.status === "inactive"; }).length;
}

// ============ Render Table ============
function renderTable(data) {
  updateStats();
  var tbody = document.getElementById("productTableBody");
  var showDelete = currentAppMode === "test";
  tbody.innerHTML = data.map(function(p, i) {
    var variantBadge = p.variants && p.variants.length
      ? '<span class="badge" style="background-color:#eff6ff;color:#3b82f6;">' + p.variants.length + ' variants</span>'
      : '<span style="font-size:10px;color:#cbd5e1;">—</span>';
    var unitName = getUnitName(p.unit_id);
    var unitDisplay = unitName
      ? '<span style="font-size:10px;font-weight:600;color:#47b8b4;">' + unitName + '</span>'
      : '<span style="font-size:10px;color:#cbd5e1;">—</span>';
    var lowStockDisplay = p.low_stock_threshold != null
      ? '<span style="font-size:10px;font-weight:600;color:#64748b;">' + p.low_stock_threshold + '</span>'
      : '<span style="font-size:10px;color:#94a3b8;font-style:italic;" title="ค่าเริ่มต้น (ยังไม่ได้ตั้งค่าเฉพาะ)">10</span>';
    var isActive = p.status === "active";
    var statusToggle =
      '<label class="toggle" title="' + (isActive ? "Active" : "Inactive") + '">' +
        '<input type="checkbox" ' + (isActive ? "checked" : "") + ' onchange="toggleProductStatus(' + p.id + ', this.checked)" />' +
        '<span class="toggle-slider"></span>' +
      '</label>';
    var deleteBtn = showDelete
      ? '<button class="btn-icon-sm btn-danger" onclick="deleteProduct(' + p.id + ')"><i data-lucide="trash-2"></i></button>'
      : '';
    return '<tr>' +
      bulkCheckboxCell(p.id) +
      '<td>' + (i + 1) + '</td>' +
      '<td>' + p.name + '</td>' +
      '<td>' + p.category + '</td>' +
      '<td>฿' + p.price.toLocaleString() + '</td>' +
      '<td>' + unitDisplay + '</td>' +
      '<td>' + variantBadge + '</td>' +
      '<td>' + lowStockDisplay + '</td>' +
      '<td>' + statusToggle + '</td>' +
      '<td><div class="table-actions">' +
        '<button class="btn-icon-sm" onclick="editProduct(' + p.id + ')"><i data-lucide="pencil"></i></button>' +
        deleteBtn +
      '</div></td>' +
    '</tr>';
  }).join("");
  lucide.createIcons();
  if (typeof refreshSortableHeaders === "function") refreshSortableHeaders();
  syncBulkBar();
}

// ============ Edit → ไปหน้า form ============
function editProduct(id) {
  window.location.href = "products-form.html?id=" + id;
}

function toggleProductStatus(id, isActive) {
  var newStatus = isActive ? "active" : "inactive";
  if (typeof updateProductDB !== "function") {
    console.error("updateProductDB not found");
    return;
  }
  updateProductDB(id, { status: newStatus })
    .then(function () { return reloadProducts(); })
    .then(function () { applyFilters(); })
    .catch(function (err) {
      console.error(err);
      if (typeof showToast === "function") showToast("ผิดพลาด", "เปลี่ยนสถานะไม่สำเร็จ", "error");
    });
}

// ============ Delete ============
// ลบ product: ล้างรูปใน Storage ก่อน แล้วค่อยลบ row
function deleteProductWithImages(id) {
  return (typeof fetchProductById === "function" ? fetchProductById(id) : Promise.resolve(null))
    .then(function (full) {
      if (full && full.images && full.images.length) {
        return deleteProductImagesFromStorage(full.images);
      }
    })
    .then(function () { return deleteProductDB(id); });
}

function deleteProduct(id) {
  var p = products.find(function(x) { return x.id === id; });
  if (!p) return;
  showConfirm({
    title: "Confirm Delete",
    message: "ต้องการลบสินค้า <strong>" + p.name + "</strong> ใช่ไหม?",
    okText: "Delete", okColor: "#ef4444",
    onConfirm: function() {
      deleteProductWithImages(id)
        .then(function () { return reloadProducts(); })
        .then(function () { applyFilters(); })
        .catch(function (err) { console.error(err); });
    }
  });
}

// ============ Filter & Sort ============
var currentFilter = "all";
var currentSort = "default";

function getFilteredData() {
  var keyword = document.querySelector(".filter-search-input").value.toLowerCase();
  var data = products;
  if (currentFilter !== "all") data = data.filter(function(p) { return p.status === currentFilter; });
  if (keyword) data = data.filter(function(p) {
    return p.name.toLowerCase().includes(keyword) || p.category.toLowerCase().includes(keyword);
  });
  switch (currentSort) {
    case "name-asc": data = data.slice().sort(function(a, b) { return a.name.localeCompare(b.name); }); break;
    case "name-desc": data = data.slice().sort(function(a, b) { return b.name.localeCompare(a.name); }); break;
    case "price-desc": data = data.slice().sort(function(a, b) { return b.price - a.price; }); break;
    case "price-asc": data = data.slice().sort(function(a, b) { return a.price - b.price; }); break;
  }
  return data;
}

function applyFilters() { renderTable(getFilteredData()); }

// ============ Init ============
document.addEventListener("DOMContentLoaded", function() {
  initBulkSelect({
    deleteFn: deleteProductWithImages,
    onAfterDelete: function () { return reloadProducts().then(applyFilters); },
    itemLabel: "สินค้า",
  });

  document.querySelector(".filter-search-input").addEventListener("input", applyFilters);

  document.querySelectorAll(".filter-btn").forEach(function(btn) {
    btn.addEventListener("click", function() {
      document.querySelectorAll(".filter-btn").forEach(function(b) { b.classList.remove("active"); });
      this.classList.add("active");
      currentFilter = this.dataset.status;
      applyFilters();
    });
  });

  document.getElementById("sortSelect").addEventListener("change", function() {
    currentSort = this.value;
    applyFilters();
  });

  // แสดง loading state ระหว่างโหลดครั้งแรก
  var tbody = document.getElementById("productTableBody");
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;color:#94a3b8;font-size:11px;">' +
      '<span style="display:inline-flex;align-items:center;gap:10px;">' +
      '<span style="width:14px;height:14px;border:2px solid #e2e8f0;border-top-color:#47b8b4;border-radius:50%;display:inline-block;animation:spin 0.8s linear infinite;"></span>' +
      'กำลังโหลดข้อมูล...</span></td></tr>';
  }
  // ensure keyframes exist
  if (!document.getElementById("products-list-spin-style")) {
    var s = document.createElement("style");
    s.id = "products-list-spin-style";
    s.textContent = "@keyframes spin { to { transform: rotate(360deg); } }";
    document.head.appendChild(s);
  }

  // โหลดข้อมูลจาก Supabase + app mode
  var modeP = (typeof getAppMode === "function") ? getAppMode() : Promise.resolve("test");
  Promise.all([modeP, reloadProducts()])
    .then(function (results) {
      currentAppMode = results[0] || "test";
      applyFilters();
    })
    .catch(function (err) {
      console.error(err);
      applyFilters(); // render empty
    });
});
