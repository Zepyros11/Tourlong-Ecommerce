// ============================================================
// inventory-report.js — Inventory Report
// คำนวณ stock จริง: initial_stock + stock_movements
// ============================================================

var inventoryData = [];

function fmtMoney(n) { return "฿" + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function updateStats() {
  var total = inventoryData.length;
  var inStock = inventoryData.filter(function (p) { return p.stock > 0; }).length;
  var outOfStock = inventoryData.filter(function (p) { return p.stock === 0; }).length;
  var totalValue = inventoryData.reduce(function (s, p) { return s + Number(p.totalValue || 0); }, 0);

  document.getElementById("statProductsVal").textContent = total;
  document.getElementById("statInStockVal").textContent = inStock;
  document.getElementById("statOutVal").textContent = outOfStock;
  document.getElementById("statValueVal").textContent = fmtMoney(totalValue);
}

function getStatusBadge(stock) {
  if (stock > 10) return '<span class="badge badge-active">In Stock</span>';
  if (stock > 0)  return '<span class="badge" style="background-color:#fef3c7;color:#f59e0b;">Low Stock</span>';
  return '<span class="badge badge-inactive">Out of Stock</span>';
}

function renderTable(data) {
  updateStats();
  var tbody = document.getElementById("reportTableBody");
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:30px;color:#94a3b8;font-size:11px;">ยังไม่มีข้อมูลสต็อก</td></tr>';
    lucide.createIcons();
    return;
  }
  tbody.innerHTML = data.map(function (p, i) {
    return '<tr>' +
      '<td>' + (i + 1) + '</td>' +
      '<td>' + (p.name || "") + '</td>' +
      '<td>' + (p.category || "—") + '</td>' +
      '<td>' + (p.unit || "—") + '</td>' +
      '<td>' + Number(p.stock).toLocaleString() + '</td>' +
      '<td>' + fmtMoney(p.unitCost) + '</td>' +
      '<td>' + fmtMoney(p.totalValue) + '</td>' +
      '<td>' + getStatusBadge(p.stock) + '</td>' +
    '</tr>';
  }).join("");
  lucide.createIcons();
  if (typeof refreshSortableHeaders === "function") refreshSortableHeaders();
}

var currentFilter = "all";
var currentSort = "default";

function getFilteredData() {
  var keyword = document.querySelector(".filter-search-input").value.toLowerCase();
  var data = inventoryData.slice();

  if (currentFilter === "instock") data = data.filter(function (p) { return p.stock > 0; });
  else if (currentFilter === "outofstock") data = data.filter(function (p) { return p.stock === 0; });

  if (keyword) {
    data = data.filter(function (p) {
      return (p.name || "").toLowerCase().includes(keyword) || (p.category || "").toLowerCase().includes(keyword);
    });
  }

  switch (currentSort) {
    case "name-asc":   data.sort(function (a, b) { return (a.name || "").localeCompare(b.name || ""); }); break;
    case "name-desc":  data.sort(function (a, b) { return (b.name || "").localeCompare(a.name || ""); }); break;
    case "stock-desc": data.sort(function (a, b) { return b.stock - a.stock; }); break;
    case "stock-asc":  data.sort(function (a, b) { return a.stock - b.stock; }); break;
    case "value-desc": data.sort(function (a, b) { return b.totalValue - a.totalValue; }); break;
    case "value-asc":  data.sort(function (a, b) { return a.totalValue - b.totalValue; }); break;
  }
  return data;
}

function applyFilters() { renderTable(getFilteredData()); }

function reloadData() {
  return Promise.all([
    typeof fetchProducts === "function" ? fetchProducts() : Promise.resolve([]),
    typeof fetchInitialStocks === "function" ? fetchInitialStocks() : Promise.resolve([]),
    typeof fetchMovementsDB === "function" ? fetchMovementsDB() : Promise.resolve([]),
    typeof fetchUnitsDB === "function" ? fetchUnitsDB() : Promise.resolve([]),
  ]).then(function (res) {
    var products = res[0] || [];
    var initialStocks = res[1] || [];
    var movements = res[2] || [];
    var units = res[3] || [];

    // รวม qty จาก initial + movements per product
    var stockMap = {};
    initialStocks.forEach(function (s) {
      stockMap[s.product_id] = (stockMap[s.product_id] || 0) + Number(s.qty || 0);
    });
    movements.forEach(function (m) {
      var delta = Number(m.qty || 0);
      if (m.type === "out") delta = -delta;
      stockMap[m.product_id] = (stockMap[m.product_id] || 0) + delta;
    });

    inventoryData = products.map(function (p) {
      var stock = stockMap[p.id] || 0;
      var cost = Number(p.price) || 0;
      var unitName = "";
      if (p.unit_id) {
        var u = units.find(function (x) { return x.id === p.unit_id; });
        if (u) unitName = u.name || "";
      }
      return {
        name: p.name || "",
        category: p.categories ? p.categories.name : "",
        unit: unitName,
        stock: stock,
        unitCost: cost,
        totalValue: stock * cost,
      };
    });
  });
}

document.addEventListener("DOMContentLoaded", function () {
  document.querySelector(".filter-search-input").addEventListener("input", applyFilters);

  document.querySelectorAll(".filter-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".filter-btn").forEach(function (b) { b.classList.remove("active"); });
      this.classList.add("active");
      currentFilter = this.dataset.status;
      applyFilters();
    });
  });

  document.getElementById("sortSelect").addEventListener("change", function () {
    currentSort = this.value;
    applyFilters();
  });

  reloadData()
    .then(function () { applyFilters(); })
    .catch(function (err) { console.error(err); applyFilters(); });
});
