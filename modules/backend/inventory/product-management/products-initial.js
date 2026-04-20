// ============================================================
// products-initial.js — Initial Stock (expandable by product)
// ------------------------------------------------------------
// แต่ละ product = 1 แถวหลัก, ขยายดู stock ต่อคลังด้านใน
// ============================================================

var allProducts = [];
var allWarehouses = [];
var stocks = []; // raw rows จาก DB (มี products, warehouses join)
var expanded = {}; // { productId: true }

// ============ Helpers ============
function fmtMoney(n) { return "฿" + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }); }
function fmtQty(n) { return Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 3 }); }
function groupStocks() {
  var map = {};
  stocks.forEach(function (s) {
    if (!map[s.product_id]) map[s.product_id] = [];
    map[s.product_id].push(s);
  });
  return map;
}

// ============ Update Stat Cards ============
function updateStats() {
  document.getElementById("statAll").textContent = allProducts.length;
  var totalQty = stocks.reduce(function (sum, s) { return sum + Number(s.qty || 0); }, 0);
  document.getElementById("statTotalUnits").textContent = fmtQty(totalQty);
  document.getElementById("statWarehouses").textContent = allWarehouses.length;
}

// ============ Render Table ============
function renderTable(data) {
  updateStats();
  var tbody = document.getElementById("initialTableBody");
  var grouped = groupStocks();

  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;color:#94a3b8;font-size:11px;">ยังไม่มีสินค้า — เพิ่มสินค้าที่หน้า "รายการสินค้า" ก่อน</td></tr>';
    lucide.createIcons();
    return;
  }

  var html = "";
  data.forEach(function (p, i) {
    var rows = grouped[p.id] || [];
    var totalQty = rows.reduce(function (s, r) { return s + Number(r.qty || 0); }, 0);
    var totalValue = rows.reduce(function (s, r) { return s + Number(r.qty || 0) * Number(r.cost || 0); }, 0);
    var warehouseCount = rows.length;
    var isOpen = !!expanded[p.id];
    var caret = isOpen ? "chevron-down" : "chevron-right";

    // Parent row
    html += '<tr class="stock-parent" data-pid="' + p.id + '">' +
      '<td><button class="btn-icon-sm" onclick="toggleProduct(' + p.id + ')" title="Expand"><i data-lucide="' + caret + '"></i></button></td>' +
      '<td>' + (i + 1) + '. ' + p.name + '</td>' +
      '<td>' + (warehouseCount ? '<span class="badge" style="background-color:#eff6ff;color:#3b82f6;">' + warehouseCount + ' / ' + allWarehouses.length + '</span>' : '<span style="font-size:10px;color:#cbd5e1;">—</span>') + '</td>' +
      '<td>' + fmtQty(totalQty) + '</td>' +
      '<td>' + fmtMoney(totalValue) + '</td>' +
      '<td><div class="table-actions">' +
        '<button class="btn-icon-sm" onclick="openAddStock(' + p.id + ')" title="Add stock"><i data-lucide="plus"></i></button>' +
      '</div></td>' +
    '</tr>';

    // Nested sub-table
    if (isOpen) {
      var inner = '';
      if (!rows.length) {
        inner = '<div style="padding:14px 20px;color:#94a3b8;font-size:11px;">ยังไม่มี stock ในคลังใด — กด + ที่แถวด้านบนเพื่อเพิ่ม</div>';
      } else {
        inner = '<table style="width:100%;border-collapse:collapse;font-size:10px;">' +
          '<thead><tr style="background:#eef2f7;color:#64748b;text-transform:uppercase;font-size:9px;letter-spacing:0.5px;">' +
            '<th style="padding:8px 12px;text-align:left;width:40px;"></th>' +
            '<th style="padding:8px 12px;text-align:left;">Warehouse</th>' +
            '<th style="padding:8px 12px;text-align:left;">Date</th>' +
            '<th style="padding:8px 12px;text-align:right;">Qty</th>' +
            '<th style="padding:8px 12px;text-align:right;">Cost/Unit</th>' +
            '<th style="padding:8px 12px;text-align:right;">Total</th>' +
            '<th style="padding:8px 12px;text-align:center;width:80px;">Actions</th>' +
          '</tr></thead><tbody>';
        rows.forEach(function (r) {
          var wName = r.warehouses ? r.warehouses.name : '—';
          inner += '<tr style="border-top:1px solid #e2e8f0;">' +
            '<td></td>' +
            '<td style="padding:8px 12px;color:#1e293b;font-weight:600;"><i data-lucide="warehouse" style="width:11px;height:11px;display:inline;vertical-align:-1px;color:#f59e0b;"></i> ' + wName + '</td>' +
            '<td style="padding:8px 12px;color:#64748b;">' + (r.date || '—') + '</td>' +
            '<td style="padding:8px 12px;text-align:right;color:#1e293b;font-weight:600;">' + fmtQty(r.qty) + '</td>' +
            '<td style="padding:8px 12px;text-align:right;color:#64748b;">' + fmtMoney(r.cost) + '</td>' +
            '<td style="padding:8px 12px;text-align:right;color:#10b981;font-weight:700;">' + fmtMoney(Number(r.qty || 0) * Number(r.cost || 0)) + '</td>' +
            '<td style="padding:8px 12px;"><div class="table-actions" style="justify-content:center;">' +
              '<button class="btn-icon-sm" onclick="editStock(' + r.id + ')"><i data-lucide="pencil"></i></button>' +
              '<button class="btn-icon-sm btn-danger" onclick="deleteStock(' + r.id + ')"><i data-lucide="trash-2"></i></button>' +
            '</div></td>' +
          '</tr>';
        });
        inner += '</tbody></table>';
      }
      html += '<tr class="stock-expand" data-pid="' + p.id + '"><td colspan="6" style="padding:0;background:#f8fafc;border-top:1px solid #e2e8f0;">' + inner + '</td></tr>';
    }
  });
  tbody.innerHTML = html;
  lucide.createIcons();
  if (typeof refreshSortableHeaders === "function") refreshSortableHeaders();
}

function toggleProduct(pid) {
  expanded[pid] = !expanded[pid];
  applyFilters();
}

// ============ Dropdowns ============
function populateProductDropdown(presetId) {
  var sel = document.getElementById("inputProduct");
  sel.innerHTML = allProducts.map(function (p) {
    return '<option value="' + p.id + '">' + p.name + '</option>';
  }).join("");
  if (presetId) sel.value = String(presetId);
}

function populateWarehouseDropdown(presetId) {
  var sel = document.getElementById("inputWarehouse");
  sel.innerHTML = allWarehouses.map(function (w) {
    return '<option value="' + w.id + '">' + w.name + '</option>';
  }).join("");
  if (presetId) sel.value = String(presetId);
}

function populateWarehouseFilter() {
  var sel = document.getElementById("filterWarehouse");
  var html = '<option value="all">All Warehouses</option>';
  allWarehouses.forEach(function (w) {
    html += '<option value="' + w.id + '">' + w.name + '</option>';
  });
  sel.innerHTML = html;
}

// ============ Add / Edit Modal ============
function openAddStock(productId) {
  if (!allProducts.length) return;
  if (!allWarehouses.length) { showConfirmIfAvail("ยังไม่มีคลัง", "กรุณาเพิ่มคลังที่หน้า Warehouses ก่อน"); return; }
  document.getElementById("modalTitle").textContent = "Add Initial Stock";
  document.getElementById("editId").value = "";
  populateProductDropdown(productId);
  populateWarehouseDropdown();
  document.getElementById("inputQty").value = "";
  document.getElementById("inputCost").value = "";
  openModalById("initialModal", function () { document.getElementById("inputQty").focus(); });
}

function editStock(id) {
  var s = stocks.find(function (x) { return x.id === id; });
  if (!s) return;
  document.getElementById("modalTitle").textContent = "Edit Initial Stock";
  document.getElementById("editId").value = s.id;
  populateProductDropdown(s.product_id);
  populateWarehouseDropdown(s.warehouse_id);
  document.getElementById("inputQty").value = s.qty;
  document.getElementById("inputCost").value = s.cost;
  openModalById("initialModal", function () { document.getElementById("inputQty").focus(); });
}

function showConfirmIfAvail(title, message) {
  if (typeof showConfirm === "function") {
    showConfirm({ title: title, message: message, okText: "OK", okColor: "#47b8b4", onConfirm: function () {} });
  } else {
    alert(message);
  }
}

function saveInitial() {
  var id = document.getElementById("editId").value;
  var productId = Number(document.getElementById("inputProduct").value);
  var warehouseId = Number(document.getElementById("inputWarehouse").value);
  var qty = parseFloat(document.getElementById("inputQty").value) || 0;
  var cost = parseFloat(document.getElementById("inputCost").value) || 0;
  if (!productId || !warehouseId) return;
  if (!qty) return document.getElementById("inputQty").focus();

  var payload = { product_id: productId, warehouse_id: warehouseId, qty: qty, cost: cost };

  var op;
  if (id) {
    op = updateInitialStockDB(Number(id), payload);
  } else {
    // ถ้าซ้ำ (product_id, warehouse_id) → update ของเดิมแทน
    var existing = stocks.find(function (x) { return x.product_id === productId && x.warehouse_id === warehouseId; });
    if (existing) op = updateInitialStockDB(existing.id, payload);
    else op = createInitialStockDB(payload);
  }

  op.then(function () { return reloadStocks(); })
    .then(function () {
      closeModalById("initialModal");
      expanded[productId] = true;
      applyFilters();
    })
    .catch(function (err) { console.error(err); });
}

// ============ Delete ============
function deleteStock(id) {
  var s = stocks.find(function (x) { return x.id === id; });
  if (!s) return;
  var pName = s.products ? s.products.name : "";
  var wName = s.warehouses ? s.warehouses.name : "";
  showConfirm({
    title: "Confirm Delete",
    message: "ต้องการลบ stock <strong>" + pName + "</strong> ในคลัง <strong>" + wName + "</strong> ใช่ไหม?",
    okText: "Delete",
    okColor: "#ef4444",
    onConfirm: function () {
      deleteInitialStockDB(id)
        .then(function () { return reloadStocks(); })
        .then(function () { applyFilters(); })
        .catch(function (err) { console.error(err); });
    },
  });
}

// ============ Filter & Sort ============
var currentWarehouse = "all";
var currentSort = "default";

function getFilteredData() {
  var keyword = document.querySelector(".filter-search-input").value.toLowerCase();
  var data = allProducts.slice();
  var grouped = groupStocks();

  if (currentWarehouse !== "all") {
    var wid = Number(currentWarehouse);
    data = data.filter(function (p) {
      return (grouped[p.id] || []).some(function (r) { return r.warehouse_id === wid; });
    });
  }

  if (keyword) {
    data = data.filter(function (p) {
      return (p.name || "").toLowerCase().includes(keyword);
    });
  }

  function totalQty(p) { return (grouped[p.id] || []).reduce(function (s, r) { return s + Number(r.qty || 0); }, 0); }

  switch (currentSort) {
    case "product-asc":  data = data.slice().sort(function (a, b) { return (a.name || "").localeCompare(b.name || ""); }); break;
    case "product-desc": data = data.slice().sort(function (a, b) { return (b.name || "").localeCompare(a.name || ""); }); break;
    case "qty-desc":     data = data.slice().sort(function (a, b) { return totalQty(b) - totalQty(a); }); break;
    case "qty-asc":      data = data.slice().sort(function (a, b) { return totalQty(a) - totalQty(b); }); break;
  }
  return data;
}

function applyFilters() { renderTable(getFilteredData()); }

// ============ Load ============
function reloadAll() {
  return Promise.all([
    typeof fetchProducts === "function" ? fetchProducts() : Promise.resolve([]),
    typeof fetchWarehousesDB === "function" ? fetchWarehousesDB() : Promise.resolve([]),
    typeof fetchInitialStocks === "function" ? fetchInitialStocks() : Promise.resolve([]),
  ]).then(function (res) {
    allProducts = (res[0] || []).map(function (p) {
      return { id: p.id, name: p.name || "", sku: p.sku || "" };
    });
    allWarehouses = (res[1] || []).map(function (w) {
      return { id: w.id, name: w.name || "" };
    });
    stocks = (res[2] || []).map(function (s) {
      return {
        id: s.id,
        product_id: s.product_id,
        warehouse_id: s.warehouse_id,
        qty: Number(s.qty) || 0,
        cost: Number(s.cost) || 0,
        date: s.date || "",
        products: s.products || null,
        warehouses: s.warehouses || null,
      };
    });
  });
}

function reloadStocks() {
  return (typeof fetchInitialStocks === "function" ? fetchInitialStocks() : Promise.resolve([]))
    .then(function (rows) {
      stocks = (rows || []).map(function (s) {
        return {
          id: s.id,
          product_id: s.product_id,
          warehouse_id: s.warehouse_id,
          qty: Number(s.qty) || 0,
          cost: Number(s.cost) || 0,
          date: s.date || "",
          products: s.products || null,
          warehouses: s.warehouses || null,
        };
      });
    });
}

// ============ Random fill (dev) ============
if (typeof registerRandomFill === "function") {
  registerRandomFill({
    target: "#initialModal",
    fill: function () {
      pickRandomSelectOption("inputProduct", { includeEmpty: false });
      pickRandomSelectOption("inputWarehouse", { includeEmpty: false });
      setFieldValue("inputQty", rdInt(10, 200));
      setFieldValue("inputCost", randomMoney(50, 500));
    },
  });
}

// ============ Init ============
document.addEventListener("DOMContentLoaded", function () {
  document.querySelector(".filter-search-input").addEventListener("input", applyFilters);

  document.getElementById("filterWarehouse").addEventListener("change", function () {
    currentWarehouse = this.value;
    applyFilters();
  });

  document.getElementById("sortSelect").addEventListener("change", function () {
    currentSort = this.value;
    applyFilters();
  });

  document.getElementById("addInitialBtn").addEventListener("click", function () {
    openAddStock(null);
  });

  reloadAll()
    .then(function () {
      populateWarehouseFilter();
      applyFilters();
    })
    .catch(function (err) {
      console.error(err);
      applyFilters();
    });
});
