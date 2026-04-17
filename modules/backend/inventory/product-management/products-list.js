// ============================================================
// products-list.js — Products List (ตารางรายการสินค้า)
// form อยู่ที่ products-form.html / products-form.js
// ============================================================

// ============ Database ============
let products = [];
let allUnits = []; // units จาก DB เพื่อแสดงชื่อหน่วย

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
  tbody.innerHTML = data.map(function(p, i) {
    var variantBadge = p.variants && p.variants.length
      ? '<span class="badge" style="background-color:#eff6ff;color:#3b82f6;">' + p.variants.length + ' variants</span>'
      : '<span style="font-size:10px;color:#cbd5e1;">—</span>';
    var skuDisplay = p.variants && p.variants.length
      ? '<span style="font-size:10px;color:#8b5cf6;font-weight:600;">' + p.sku + '-*</span>'
      : '<span style="font-size:10px;color:#64748b;font-weight:600;">' + (p.sku || '—') + '</span>';
    var unitName = getUnitName(p.unit_id);
    var unitDisplay = unitName
      ? '<span style="font-size:10px;font-weight:600;color:#47b8b4;">' + unitName + '</span>'
      : '<span style="font-size:10px;color:#cbd5e1;">—</span>';
    return '<tr>' +
      '<td>' + (i + 1) + '</td>' +
      '<td>' + p.name + '</td>' +
      '<td>' + skuDisplay + '</td>' +
      '<td>' + p.category + '</td>' +
      '<td>฿' + p.price.toLocaleString() + '</td>' +
      '<td>' + unitDisplay + '</td>' +
      '<td>' + variantBadge + '</td>' +
      '<td><span class="badge badge-' + (p.status === "active" ? "active" : "inactive") + '">' + (p.status === "active" ? "Active" : "Inactive") + '</span></td>' +
      '<td><div class="table-actions">' +
        '<button class="btn-icon-sm" onclick="editProduct(' + p.id + ')"><i data-lucide="pencil"></i></button>' +
        '<button class="btn-icon-sm btn-danger" onclick="deleteProduct(' + p.id + ')"><i data-lucide="trash-2"></i></button>' +
      '</div></td>' +
    '</tr>';
  }).join("");
  lucide.createIcons();
  if (typeof refreshSortableHeaders === "function") refreshSortableHeaders();
}

// ============ Edit → ไปหน้า form ============
function editProduct(id) {
  window.location.href = "products-form.html?id=" + id;
}

// ============ Delete ============
function deleteProduct(id) {
  var p = products.find(function(x) { return x.id === id; });
  if (!p) return;
  showConfirm({
    title: "Confirm Delete",
    message: "ต้องการลบสินค้า <strong>" + p.name + "</strong>" + (p.sku ? " (" + p.sku + ")" : "") + " ใช่ไหม?",
    okText: "Delete", okColor: "#ef4444",
    onConfirm: function() { products = products.filter(function(x) { return x.id !== id; }); applyFilters(); }
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
    return p.name.toLowerCase().includes(keyword) || p.category.toLowerCase().includes(keyword) || (p.sku || "").toLowerCase().includes(keyword);
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

  // โหลดข้อมูลจาก Supabase
  reloadProducts()
    .then(function () { applyFilters(); })
    .catch(function (err) {
      console.error(err);
      applyFilters(); // render empty
    });
});
