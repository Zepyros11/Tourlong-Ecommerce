// ============================================================
// inventory-report.js — logic เฉพาะหน้า Inventory Report
// ------------------------------------------------------------
// READ-ONLY report page (ไม่มี Add/Edit/Delete)
// ============================================================

// ============ Mock Database ============
const inventoryData = [
  { id: 1,  name: "Wireless Headphones",   category: "Electronics",     unit: "ชิ้น", stock: 45,  unitCost: 1800, totalValue: 81000 },
  { id: 2,  name: "Running Shoes",         category: "Sports",          unit: "ชิ้น", stock: 12,  unitCost: 2200, totalValue: 26400 },
  { id: 3,  name: "Cotton T-Shirt",        category: "Clothing",        unit: "ชิ้น", stock: 120, unitCost: 250,  totalValue: 30000 },
  { id: 4,  name: "Yoga Mat",              category: "Sports",          unit: "ชิ้น", stock: 0,   unitCost: 600,  totalValue: 0 },
  { id: 5,  name: "Protein Powder",        category: "Food & Beverage", unit: "กล่อง", stock: 38,  unitCost: 850,  totalValue: 32300 },
  { id: 6,  name: "Smart Watch",           category: "Electronics",     unit: "ชิ้น", stock: 8,   unitCost: 3200, totalValue: 25600 },
  { id: 7,  name: "Leather Wallet",        category: "Accessories",     unit: "ชิ้น", stock: 0,   unitCost: 500,  totalValue: 0 },
  { id: 8,  name: "Face Serum Set",        category: "Beauty",          unit: "แพ็ค", stock: 55,  unitCost: 1200, totalValue: 66000 },
  { id: 9,  name: "Desk Lamp",             category: "Home & Living",   unit: "ชิ้น", stock: 22,  unitCost: 750,  totalValue: 16500 },
  { id: 10, name: "Vitamin C Bottles",     category: "Food & Beverage", unit: "กล่อง", stock: 85,  unitCost: 1200, totalValue: 107200 },
];

// ============ Update Stat Cards ============
function updateStats() {
  const total = inventoryData.length;
  const inStock = inventoryData.filter((p) => p.stock > 0).length;
  const outOfStock = inventoryData.filter((p) => p.stock === 0).length;
  const totalValue = inventoryData.reduce((sum, p) => sum + p.totalValue, 0);

  document.getElementById("statProductsVal").textContent = total;
  document.getElementById("statInStockVal").textContent = inStock;
  document.getElementById("statOutVal").textContent = outOfStock;
  document.getElementById("statValueVal").textContent = "฿" + totalValue.toLocaleString();
}

// ============ Status Badge ============
function getStatusBadge(stock) {
  if (stock > 10) {
    return '<span class="badge badge-active">In Stock</span>';
  } else if (stock > 0) {
    return '<span class="badge" style="background-color:#fef3c7;color:#f59e0b;">Low Stock</span>';
  }
  return '<span class="badge badge-inactive">Out of Stock</span>';
}

// ============ Render Table ============
function renderTable(data) {
  updateStats();
  const tbody = document.getElementById("reportTableBody");
  tbody.innerHTML = data
    .map(
      (p, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${p.name}</td>
      <td>${p.category}</td>
      <td>${p.unit}</td>
      <td>${p.stock.toLocaleString()}</td>
      <td>฿${p.unitCost.toLocaleString()}</td>
      <td>฿${p.totalValue.toLocaleString()}</td>
      <td>${getStatusBadge(p.stock)}</td>
    </tr>
  `
    )
    .join("");
  lucide.createIcons();
  if (typeof refreshSortableHeaders === "function") refreshSortableHeaders();
}

// ============ Filter & Sort ============
let currentFilter = "all";
let currentSort = "default";

function getFilteredData() {
  const keyword = document.querySelector(".filter-search-input").value.toLowerCase();
  let data = [...inventoryData];

  // Filter by status
  if (currentFilter === "instock") {
    data = data.filter((p) => p.stock > 0);
  } else if (currentFilter === "outofstock") {
    data = data.filter((p) => p.stock === 0);
  }

  // Filter by search
  if (keyword) {
    data = data.filter(
      (p) => p.name.toLowerCase().includes(keyword) || p.category.toLowerCase().includes(keyword)
    );
  }

  // Sort
  switch (currentSort) {
    case "name-asc":
      data.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "name-desc":
      data.sort((a, b) => b.name.localeCompare(a.name));
      break;
    case "stock-desc":
      data.sort((a, b) => b.stock - a.stock);
      break;
    case "stock-asc":
      data.sort((a, b) => a.stock - b.stock);
      break;
    case "value-desc":
      data.sort((a, b) => b.totalValue - a.totalValue);
      break;
    case "value-asc":
      data.sort((a, b) => a.totalValue - b.totalValue);
      break;
  }

  return data;
}

function applyFilters() {
  renderTable(getFilteredData());
}

// ============ Init ============
document.addEventListener("DOMContentLoaded", function () {
  // Search
  document.querySelector(".filter-search-input").addEventListener("input", applyFilters);

  // Filter buttons
  document.querySelectorAll(".filter-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
      this.classList.add("active");
      currentFilter = this.dataset.status;
      applyFilters();
    });
  });

  // Sort select
  document.getElementById("sortSelect").addEventListener("change", function () {
    currentSort = this.value;
    applyFilters();
  });

  // Initial render
  renderTable(inventoryData);
});
