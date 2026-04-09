// ============================================================
// purchase-report.js — logic เฉพาะหน้า Purchase Report
// ------------------------------------------------------------
// READ-ONLY report — ไม่มี add/edit/delete
// ============================================================

// ============ Mock Database ============
const purchaseData = [
  { id: 1, date: "2026-04-01", poNumber: "PO-2026-001", supplier: "บ.สยามซัพพลาย",       items: 8,  amount: 45000,  status: "approved" },
  { id: 2, date: "2026-04-03", poNumber: "PO-2026-002", supplier: "บ.ไทยเทรด",           items: 5,  amount: 78500,  status: "pending" },
  { id: 3, date: "2026-04-05", poNumber: "PO-2026-003", supplier: "บ.แกรนด์โลจิสติกส์",   items: 3,  amount: 32000,  status: "pending" },
  { id: 4, date: "2026-04-05", poNumber: "PO-2026-004", supplier: "บ.เอเชียซัพพลาย",      items: 12, amount: 129000, status: "approved" },
  { id: 5, date: "2026-04-06", poNumber: "PO-2026-005", supplier: "บ.โกลบอลเทค",         items: 6,  amount: 55000,  status: "approved" },
  { id: 6, date: "2026-04-06", poNumber: "PO-2026-006", supplier: "บ.พรีเมียมกู๊ดส์",      items: 4,  amount: 28000,  status: "cancelled" },
  { id: 7, date: "2026-04-07", poNumber: "PO-2026-007", supplier: "บ.สยามซัพพลาย",       items: 10, amount: 92000,  status: "pending" },
  { id: 8, date: "2026-04-07", poNumber: "PO-2026-008", supplier: "บ.ไทยเทรด",           items: 2,  amount: 15000,  status: "approved" },
];

// ============ Status Badge ============
function getStatusBadge(status) {
  switch (status) {
    case "approved":
      return '<span class="badge badge-active">Approved</span>';
    case "pending":
      return '<span class="badge" style="background-color:#fef3c7;color:#f59e0b;">Pending</span>';
    case "cancelled":
      return '<span class="badge badge-inactive">Cancelled</span>';
    default:
      return '<span class="badge">' + status + "</span>";
  }
}

// ============ Update Stats ============
function updateStats(data) {
  const totalAmount = data.reduce((sum, row) => sum + row.amount, 0);
  const poCount = data.length;
  const suppliers = new Set(data.map((row) => row.supplier)).size;
  const returns = data.filter((row) => row.status === "cancelled").length;

  document.querySelector("#statTotal").closest(".stat-card").querySelector(".stat-card-value").textContent =
    "฿" + totalAmount.toLocaleString();
  document.querySelector("#statPOs").closest(".stat-card").querySelector(".stat-card-value").textContent =
    poCount;
  document.querySelector("#statSuppliers").closest(".stat-card").querySelector(".stat-card-value").textContent =
    suppliers;
  document.querySelector("#statReturns").closest(".stat-card").querySelector(".stat-card-value").textContent =
    returns;
}

// ============ Render Table ============
function renderTable(data) {
  updateStats(data);
  const tbody = document.getElementById("reportTableBody");
  tbody.innerHTML = data
    .map(
      (row, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${row.date}</td>
      <td>${row.poNumber}</td>
      <td>${row.supplier}</td>
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

  let data = [...purchaseData];

  // Search filter
  if (keyword) {
    data = data.filter(
      (row) =>
        row.poNumber.toLowerCase().includes(keyword) ||
        row.supplier.toLowerCase().includes(keyword)
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

  renderTable(purchaseData);
});
