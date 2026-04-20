// ============================================================
// profit-loss.js — Profit & Loss Report (group by month)
// ============================================================

var profitLossData = [];

function fmtMoney(n) { return "฿" + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function renderTable(data) {
  var tbody = document.getElementById("reportTableBody");
  if (!tbody) return;
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#94a3b8;padding:32px;">ไม่พบข้อมูล</td></tr>';
    return;
  }
  var html = "";
  data.forEach(function (row, i) {
    var profitColor = row.netProfit >= 0 ? "color:#10b981;" : "color:#ef4444;";
    html += "<tr>" +
      "<td>" + (i + 1) + "</td>" +
      "<td>" + row.month + "</td>" +
      "<td>" + fmtMoney(row.revenue) + "</td>" +
      "<td>" + fmtMoney(row.cogs) + "</td>" +
      "<td>" + fmtMoney(row.grossProfit) + "</td>" +
      "<td>" + fmtMoney(row.expenses) + "</td>" +
      '<td style="' + profitColor + 'font-weight:600;">' + fmtMoney(row.netProfit) + "</td>" +
      "</tr>";
  });
  tbody.innerHTML = html;
  if (typeof refreshSortableHeaders === "function") refreshSortableHeaders();
}

function filterByDate(data) {
  var fromVal = document.getElementById("dateFrom").value;
  var toVal = document.getElementById("dateTo").value;
  return data.filter(function (row) {
    if (fromVal && row.date < fromVal) return false;
    if (toVal && row.date > toVal) return false;
    return true;
  });
}

function sortData(data, sortValue) {
  var sorted = data.slice();
  if (sortValue === "date-desc") sorted.sort(function (a, b) { return b.date.localeCompare(a.date); });
  else if (sortValue === "date-asc") sorted.sort(function (a, b) { return a.date.localeCompare(b.date); });
  return sorted;
}

function updateStats(data) {
  var totalRevenue = 0, totalExpenses = 0, totalNetProfit = 0;
  data.forEach(function (row) {
    totalRevenue += row.revenue;
    totalExpenses += row.expenses;
    totalNetProfit += row.netProfit;
  });
  var margin = totalRevenue > 0 ? ((totalNetProfit / totalRevenue) * 100).toFixed(1) : "0.0";
  var cards = document.querySelectorAll(".stat-card");
  if (cards[0]) cards[0].querySelector(".stat-card-value").textContent = fmtMoney(totalRevenue);
  if (cards[1]) cards[1].querySelector(".stat-card-value").textContent = fmtMoney(totalExpenses);
  if (cards[2]) cards[2].querySelector(".stat-card-value").textContent = fmtMoney(totalNetProfit);
  if (cards[3]) cards[3].querySelector(".stat-card-value").textContent = margin + "%";
}

function applyFilters() {
  var filtered = filterByDate(profitLossData);
  var sortValue = document.getElementById("sortSelect").value;
  var sorted = sortData(filtered, sortValue);
  renderTable(sorted);
  updateStats(sorted);
}

function reloadData() {
  return Promise.all([
    typeof fetchSalesOrdersDB === "function" ? fetchSalesOrdersDB() : Promise.resolve([]),
    typeof fetchPurchaseOrdersDB === "function" ? fetchPurchaseOrdersDB() : Promise.resolve([]),
    typeof fetchExpensesDB === "function" ? fetchExpensesDB() : Promise.resolve([]),
  ]).then(function (res) {
    var sos = res[0] || [];
    var pos = res[1] || [];
    var expenses = res[2] || [];

    // group by month YYYY-MM
    var monthMap = {};
    function ensure(month) {
      if (!monthMap[month]) monthMap[month] = { month: month, date: month + "-01", revenue: 0, cogs: 0, expenses: 0 };
      return monthMap[month];
    }

    // Revenue from completed SOs
    sos.forEach(function (so) {
      if (so.status !== "completed" || !so.date) return;
      var m = so.date.slice(0, 7);
      ensure(m).revenue += Number(so.total) || 0;
      // COGS estimate: sum of PO avg cost × qty ไม่ได้คำนวณตอนนี้ — ใช้ 0
    });

    // COGS proxy: total รับของเข้า (PO total ที่ received) ในเดือนนั้น
    pos.forEach(function (po) {
      if (po.status !== "received" || !po.date) return;
      var m = po.date.slice(0, 7);
      ensure(m).cogs += Number(po.total) || 0;
    });

    // Expenses (paid)
    expenses.forEach(function (ex) {
      if (ex.status !== "paid" || !ex.date) return;
      var m = ex.date.slice(0, 7);
      ensure(m).expenses += Number(ex.amount) || 0;
    });

    profitLossData = Object.keys(monthMap).sort().map(function (m) {
      var row = monthMap[m];
      row.grossProfit = row.revenue - row.cogs;
      row.netProfit = row.grossProfit - row.expenses;
      return row;
    });
  });
}

document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("dateFrom").addEventListener("change", applyFilters);
  document.getElementById("dateTo").addEventListener("change", applyFilters);
  document.getElementById("sortSelect").addEventListener("change", applyFilters);

  reloadData()
    .then(function () { applyFilters(); })
    .catch(function (err) { console.error(err); applyFilters(); });
});
