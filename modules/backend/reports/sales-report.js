// ============================================================
// sales-report.js — Sales Report (อ่านจาก sales_orders)
// ============================================================

var salesData = [];
var returnsData = []; // { date, refund } per approved return — keep raw เพื่อ filter ตาม date

function fmtMoney(n) { return "฿" + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function calcReturnsTotal() {
  var dateFrom = document.getElementById("dateFrom").value;
  var dateTo = document.getElementById("dateTo").value;
  return returnsData.reduce(function (sum, r) {
    if (dateFrom && (r.date || "") < dateFrom) return sum;
    if (dateTo && (r.date || "") > dateTo) return sum;
    return sum + (Number(r.refund) || 0);
  }, 0);
}

function updateStatCards(filteredData) {
  var totalSales = 0, orderCount = 0;
  filteredData.forEach(function (row) {
    if (row.status === "cancelled") return;
    totalSales += Number(row.amount) || 0;
    orderCount += 1;
  });
  var returnsTotal = calcReturnsTotal();
  var netSales = totalSales - returnsTotal;
  var avg = orderCount ? totalSales / orderCount : 0;
  var cards = document.querySelectorAll(".stat-card .stat-card-value");
  if (cards[0]) cards[0].textContent = fmtMoney(netSales);
  if (cards[1]) cards[1].textContent = String(orderCount);
  if (cards[2]) cards[2].textContent = fmtMoney(avg);
  if (cards[3]) cards[3].textContent = fmtMoney(returnsTotal);
}

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

function applyFilters() {
  var filtered = getFilteredData();
  renderTable(filtered);
  updateStatCards(filtered);
}

function reloadData() {
  return Promise.all([
    typeof fetchSalesOrdersDB === "function" ? fetchSalesOrdersDB() : Promise.resolve([]),
    typeof fetchSalesReturnsDB === "function" ? fetchSalesReturnsDB() : Promise.resolve([]),
  ]).then(function (res) {
    var rows = res[0] || [];
    var returnsRows = res[1] || [];
    salesData = rows.map(function (so) {
      return {
        date: so.date || "",
        orderNo: so.so_number || "",
        customer: so.customers ? so.customers.name : "",
        items: so.sales_order_items ? so.sales_order_items.length : 0,
        amount: Number(so.total) || 0,
        status: so.status || "processing",
      };
    });
    returnsData = returnsRows
      .filter(function (r) { return r.status === "approved"; })
      .map(function (r) {
        var refund = (r.sales_return_items || []).reduce(function (s, it) {
          return s + (Number(it.qty) || 0) * (Number(it.price) || 0);
        }, 0);
        return { date: r.date || "", refund: refund };
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
