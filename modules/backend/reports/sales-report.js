// ============================================================
// sales-report.js — logic เฉพาะหน้า Sales Report
// ------------------------------------------------------------
// READ-ONLY report — ไม่มี add/edit/delete
// ============================================================

// ============ Mock Database ============
const salesData = [
  { id: 1,  date: "2026-03-25", orderNo: "SO-2026-135", customer: "บ.เอบีซี จำกัด",       items: 5,  amount: 45000,  status: "completed" },
  { id: 2,  date: "2026-03-27", orderNo: "SO-2026-136", customer: "คุณสมศรี จันทร์ดี",     items: 2,  amount: 5180,   status: "completed" },
  { id: 3,  date: "2026-03-28", orderNo: "SO-2026-137", customer: "บ.XYZ เทรดดิ้ง",       items: 8,  amount: 92000,  status: "completed" },
  { id: 4,  date: "2026-03-30", orderNo: "SO-2026-138", customer: "คุณธนา ใจงาม",         items: 3,  amount: 18750,  status: "completed" },
  { id: 5,  date: "2026-04-01", orderNo: "SO-2026-139", customer: "คุณนภา รักดี",          items: 1,  amount: 3200,   status: "cancelled" },
  { id: 6,  date: "2026-04-02", orderNo: "SO-2026-140", customer: "บ.สตาร์มาร์ท จำกัด",   items: 4,  amount: 28500,  status: "completed" },
  { id: 7,  date: "2026-04-03", orderNo: "SO-2026-141", customer: "คุณวิชัย สุขสม",        items: 6,  amount: 67200,  status: "completed" },
  { id: 8,  date: "2026-04-04", orderNo: "SO-2026-142", customer: "บ.แฮปปี้โฮม จำกัด",    items: 2,  amount: 12400,  status: "completed" },
  { id: 9,  date: "2026-04-05", orderNo: "SO-2026-143", customer: "คุณสมศรี จันทร์ดี",     items: 3,  amount: 7540,   status: "cancelled" },
  { id: 10, date: "2026-04-06", orderNo: "SO-2026-144", customer: "บ.เอบีซี จำกัด",       items: 10, amount: 156000, status: "completed" },
  { id: 11, date: "2026-04-07", orderNo: "SO-2026-145", customer: "คุณธนา ใจงาม",         items: 7,  amount: 89300,  status: "completed" },
  { id: 12, date: "2026-04-08", orderNo: "SO-2026-146", customer: "บ.XYZ เทรดดิ้ง",       items: 5,  amount: 34800,  status: "completed" },
];

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
