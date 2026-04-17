// ============================================================
// profit-loss.js — Profit & Loss Report
// ------------------------------------------------------------
// Mock data 6 months, render table, filter by date, sort, stats
// ============================================================

var profitLossData = [];

/**
 * Format number as Thai Baht currency
 */
function formatBaht(amount) {
  return "฿" + amount.toLocaleString("en-US");
}

/**
 * Render table rows from data array
 */
function renderTable(data) {
  var tbody = document.getElementById("reportTableBody");
  if (!tbody) return;

  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#94a3b8;padding:32px;">ไม่พบข้อมูล</td></tr>';
    return;
  }

  var html = "";
  data.forEach(function (row, index) {
    var profitColor = row.netProfit >= 0 ? "color:#10b981;" : "color:#ef4444;";
    html += "<tr>";
    html += "<td>" + (index + 1) + "</td>";
    html += "<td>" + row.month + "</td>";
    html += "<td>" + formatBaht(row.revenue) + "</td>";
    html += "<td>" + formatBaht(row.cogs) + "</td>";
    html += "<td>" + formatBaht(row.grossProfit) + "</td>";
    html += "<td>" + formatBaht(row.expenses) + "</td>";
    html += '<td style="' + profitColor + 'font-weight:600;">' + formatBaht(row.netProfit) + "</td>";
    html += "</tr>";
  });

  tbody.innerHTML = html;
  if (typeof refreshSortableHeaders === "function") refreshSortableHeaders();
}

/**
 * Filter data by date range
 */
function filterByDate(data) {
  var fromVal = document.getElementById("dateFrom").value;
  var toVal = document.getElementById("dateTo").value;

  return data.filter(function (row) {
    if (fromVal && row.date < fromVal) return false;
    if (toVal && row.date > toVal) return false;
    return true;
  });
}

/**
 * Sort data based on select value
 */
function sortData(data, sortValue) {
  var sorted = data.slice();
  if (sortValue === "date-desc") {
    sorted.sort(function (a, b) { return b.date.localeCompare(a.date); });
  } else if (sortValue === "date-asc") {
    sorted.sort(function (a, b) { return a.date.localeCompare(b.date); });
  }
  return sorted;
}

/**
 * Update stat cards with totals from filtered data
 */
function updateStats(data) {
  var totalRevenue = 0;
  var totalExpenses = 0;
  var totalNetProfit = 0;

  data.forEach(function (row) {
    totalRevenue += row.revenue;
    totalExpenses += row.expenses;
    totalNetProfit += row.netProfit;
  });

  var margin = totalRevenue > 0 ? ((totalNetProfit / totalRevenue) * 100).toFixed(1) : "0.0";

  // Update card values
  var cards = document.querySelectorAll(".stat-card");
  if (cards[0]) cards[0].querySelector(".stat-card-value").textContent = formatBaht(totalRevenue);
  if (cards[1]) cards[1].querySelector(".stat-card-value").textContent = formatBaht(totalExpenses);
  if (cards[2]) cards[2].querySelector(".stat-card-value").textContent = formatBaht(totalNetProfit);
  if (cards[3]) cards[3].querySelector(".stat-card-value").textContent = margin + "%";
}

/**
 * Apply filters, sort, render, and update stats
 */
function applyFilters() {
  var filtered = filterByDate(profitLossData);
  var sortValue = document.getElementById("sortSelect").value;
  var sorted = sortData(filtered, sortValue);
  renderTable(sorted);
  updateStats(sorted);
}

// ── Init ──
(function init() {
  // Render initial table
  applyFilters();

  // Attach event listeners
  document.getElementById("dateFrom").addEventListener("change", applyFilters);
  document.getElementById("dateTo").addEventListener("change", applyFilters);
  document.getElementById("sortSelect").addEventListener("change", applyFilters);
})();
