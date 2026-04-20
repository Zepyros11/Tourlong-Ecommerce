// ============================================================
// sales-report.js — Sales Report (อ่านจาก sales_orders)
// ============================================================

var salesData = [];

function fmtMoney(n) { return "฿" + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function getStatusBadge(status) {
  switch (status) {
    case "completed":  return '<span class="badge badge-active">Completed</span>';
    case "processing": return '<span class="badge" style="background-color:#fef3c7;color:#f59e0b;">Processing</span>';
    case "cancelled":  return '<span class="badge badge-inactive">Cancelled</span>';
    default: return '<span class="badge">' + status + "</span>";
  }
}

function renderTable(data) {
  var tbody = document.getElementById("reportTableBody");
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;color:#94a3b8;font-size:11px;">ยังไม่มีข้อมูลการขาย</td></tr>';
    lucide.createIcons();
    return;
  }
  tbody.innerHTML = data.map(function (row, i) {
    return '<tr>' +
      '<td>' + (i + 1) + '</td>' +
      '<td>' + (row.date || "—") + '</td>' +
      '<td><strong>' + row.orderNo + '</strong></td>' +
      '<td>' + (row.customer || "—") + '</td>' +
      '<td>' + row.items + '</td>' +
      '<td>' + fmtMoney(row.amount) + '</td>' +
      '<td>' + getStatusBadge(row.status) + '</td>' +
    '</tr>';
  }).join("");
  lucide.createIcons();
  if (typeof refreshSortableHeaders === "function") refreshSortableHeaders();
}

var currentSort = "default";

function getFilteredData() {
  var keyword = document.querySelector(".filter-search-input").value.toLowerCase();
  var dateFrom = document.getElementById("dateFrom").value;
  var dateTo = document.getElementById("dateTo").value;
  var data = salesData.slice();

  if (keyword) {
    data = data.filter(function (row) {
      return (row.orderNo || "").toLowerCase().includes(keyword) ||
             (row.customer || "").toLowerCase().includes(keyword);
    });
  }
  if (dateFrom) data = data.filter(function (row) { return (row.date || "") >= dateFrom; });
  if (dateTo) data = data.filter(function (row) { return (row.date || "") <= dateTo; });

  switch (currentSort) {
    case "date-desc":   data.sort(function (a, b) { return (b.date || "").localeCompare(a.date || ""); }); break;
    case "date-asc":    data.sort(function (a, b) { return (a.date || "").localeCompare(b.date || ""); }); break;
    case "amount-desc": data.sort(function (a, b) { return Number(b.amount) - Number(a.amount); }); break;
    case "amount-asc":  data.sort(function (a, b) { return Number(a.amount) - Number(b.amount); }); break;
  }
  return data;
}

function applyFilters() { renderTable(getFilteredData()); }

function reloadData() {
  return (typeof fetchSalesOrdersDB === "function" ? fetchSalesOrdersDB() : Promise.resolve([]))
    .then(function (rows) {
      salesData = (rows || []).map(function (so) {
        return {
          date: so.date || "",
          orderNo: so.so_number || "",
          customer: so.customers ? so.customers.name : "",
          items: so.sales_order_items ? so.sales_order_items.length : 0,
          amount: Number(so.total) || 0,
          status: so.status || "processing",
        };
      });
    });
}

document.addEventListener("DOMContentLoaded", function () {
  document.querySelector(".filter-search-input").addEventListener("input", applyFilters);
  document.getElementById("dateFrom").addEventListener("change", applyFilters);
  document.getElementById("dateTo").addEventListener("change", applyFilters);

  document.getElementById("sortSelect").addEventListener("change", function () {
    currentSort = this.value;
    applyFilters();
  });

  reloadData()
    .then(function () { applyFilters(); })
    .catch(function (err) { console.error(err); applyFilters(); });
});
