// ============================================================
// inventory-report.js — logic เฉพาะหน้า Inventory Report
// ------------------------------------------------------------
// READ-ONLY report page (ไม่มี Add/Edit/Delete)
// ============================================================

// ============ Mock Database ============
const inventoryData = [];

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
