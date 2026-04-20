// ============================================================
// purchase-report.js — Purchase Report (อ่านจาก purchase_orders)
// ============================================================

var purchaseData = [];

function fmtMoney(n) { return "฿" + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function getStatusBadge(status) {
  switch (status) {
    case "approved":  return '<span class="badge badge-active">Approved</span>';
    case "pending":   return '<span class="badge" style="background-color:#fef3c7;color:#f59e0b;">Pending</span>';
    case "received":  return '<span class="badge" style="background-color:#dbeafe;color:#3b82f6;">Received</span>';
    case "cancelled": return '<span class="badge badge-inactive">Cancelled</span>';
    default: return '<span class="badge">' + status + "</span>";
  }
}

function updateStats(data) {
  var totalAmount = data.reduce(function (s, r) { return s + Number(r.amount || 0); }, 0);
  var poCount = data.length;
  var suppliers = new Set(data.map(function (r) { return r.supplier; })).size;
  var returns = data.filter(function (r) { return r.status === "cancelled"; }).length;

  var setStat = function (id, val) {
    var el = document.querySelector("#" + id);
    if (el) {
      var card = el.closest(".stat-card");
      if (card) card.querySelector(".stat-card-value").textContent = val;
    }
  };
  setStat("statTotal", fmtMoney(totalAmount));
  setStat("statPOs", poCount);
  setStat("statSuppliers", suppliers);
  setStat("statReturns", returns);
}

function renderTable(data) {
  updateStats(data);
  var tbody = document.getElementById("reportTableBody");
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;color:#94a3b8;font-size:11px;">ยังไม่มีข้อมูลการซื้อ</td></tr>';
    lucide.createIcons();
    return;
  }
  tbody.innerHTML = data.map(function (row, i) {
    return '<tr>' +
      '<td>' + (i + 1) + '</td>' +
      '<td>' + (row.date || "—") + '</td>' +
      '<td><strong>' + row.poNumber + '</strong></td>' +
      '<td>' + (row.supplier || "—") + '</td>' +
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
  var data = purchaseData.slice();

  if (keyword) {
    data = data.filter(function (row) {
      return (row.poNumber || "").toLowerCase().includes(keyword) || (row.supplier || "").toLowerCase().includes(keyword);
    });
  }
  if (dateFrom) data = data.filter(function (r) { return (r.date || "") >= dateFrom; });
  if (dateTo) data = data.filter(function (r) { return (r.date || "") <= dateTo; });

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
  return (typeof fetchPurchaseOrdersDB === "function" ? fetchPurchaseOrdersDB() : Promise.resolve([]))
    .then(function (rows) {
      purchaseData = (rows || []).map(function (po) {
        return {
          date: po.date || "",
          poNumber: po.po_number || "",
          supplier: po.suppliers ? po.suppliers.name : "",
          items: po.purchase_order_items ? po.purchase_order_items.length : 0,
          amount: Number(po.total) || 0,
          status: po.status || "pending",
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
