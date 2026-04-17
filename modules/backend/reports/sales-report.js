// ============================================================
// sales-report.js — logic เฉพาะหน้า Sales Report
// ------------------------------------------------------------
// READ-ONLY report — ไม่มี add/edit/delete
// ============================================================

// ============ Mock Database ============
const salesData = [];

// ============ Status Badge ============
function getStatusBadge(status) {
  switch (status) {
    case "completed":
      return '<span class="badge badge-active">Completed</span>';
    case "cancelled":
      return '<span class="badge badge-inactive">Cancelled</span>';
    default:
      return '<span class="badge">' + status + "</span>";
  }
}

// ============ Render Table ============
function renderTable(data) {
  const tbody = document.getElementById("reportTableBody");
  tbody.innerHTML = data
    .map(
      (row, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${row.date}</td>
      <td>${row.orderNo}</td>
      <td>${row.customer}</td>
      <td>${row.items}</td>
      <td>฿${row.amount.toLocaleString()}</td>
      <td>${getStatusBadge(row.status)}</td>
    </tr>
  `
    )
    .join("");
  lucide.createIcons();
  if (typeof refreshSortableHeaders === "function") refreshSortableHeaders();
}

// ============ Filter & Sort ============
let currentSort = "default";

function getFilteredData() {
  const keyword = document.querySelector(".filter-search-input").value.toLowerCase();
  const dateFrom = document.getElementById("dateFrom").value;
  const dateTo = document.getElementById("dateTo").value;

  let data = [...salesData];

  // Search filter
  if (keyword) {
    data = data.filter(
      (row) =>
        row.orderNo.toLowerCase().includes(keyword) ||
        row.customer.toLowerCase().includes(keyword)
    );
  }

  // Date range filter
  if (dateFrom) {
    data = data.filter((row) => row.date >= dateFrom);
  }
  if (dateTo) {
    data = data.filter((row) => row.date <= dateTo);
  }

  // Sort
  switch (currentSort) {
    case "date-desc":
      data.sort((a, b) => b.date.localeCompare(a.date));
      break;
    case "date-asc":
      data.sort((a, b) => a.date.localeCompare(b.date));
      break;
    case "amount-desc":
      data.sort((a, b) => b.amount - a.amount);
      break;
    case "amount-asc":
      data.sort((a, b) => a.amount - b.amount);
      break;
  }

  return data;
}

function applyFilters() {
  renderTable(getFilteredData());
}

// ============ Init ============
document.addEventListener("DOMContentLoaded", function () {
  document.querySelector(".filter-search-input").addEventListener("input", applyFilters);
  document.getElementById("dateFrom").addEventListener("change", applyFilters);
  document.getElementById("dateTo").addEventListener("change", applyFilters);

  document.getElementById("sortSelect").addEventListener("change", function () {
    currentSort = this.value;
    applyFilters();
  });

  renderTable(salesData);
});
