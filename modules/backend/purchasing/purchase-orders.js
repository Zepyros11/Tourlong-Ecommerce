// ============================================================
// purchase-orders.js — Purchase Orders List (ตาราง PO)
// form อยู่ที่ purchase-order-form.html / purchase-order-form.js
// ============================================================

var purchaseOrders = [];

// ============ Helpers ============
function fmtMoney(n) { return "฿" + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function getStatusBadge(status) {
  switch (status) {
    case "approved":  return '<span class="badge badge-active">Approved</span>';
    case "pending":   return '<span class="badge" style="background-color:#fef3c7;color:#f59e0b;">Pending</span>';
    case "received":  return '<span class="badge" style="background-color:#dbeafe;color:#3b82f6;">Received</span>';
    case "cancelled": return '<span class="badge badge-inactive">Cancelled</span>';
    default: return '<span class="badge">' + status + '</span>';
  }
}

// ============ Stats ============
function updateStats() {
  document.getElementById("statAll").textContent = purchaseOrders.length;
  document.getElementById("statApproved").textContent = purchaseOrders.filter(function (po) { return po.status === "approved"; }).length;
  document.getElementById("statPending").textContent = purchaseOrders.filter(function (po) { return po.status === "pending"; }).length;
  document.getElementById("statCancelled").textContent = purchaseOrders.filter(function (po) { return po.status === "cancelled"; }).length;
}

// ============ Render ============
function renderTable(data) {
  updateStats();
  var tbody = document.getElementById("poTableBody");
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:30px;color:#94a3b8;font-size:11px;">ยังไม่มีใบสั่งซื้อ</td></tr>';
    lucide.createIcons();
    return;
  }
  tbody.innerHTML = data.map(function (po, i) {
    var supplier = po.suppliers ? po.suppliers.name : "—";
    var itemCount = po.purchase_order_items ? po.purchase_order_items.length : 0;
    return '<tr>' +
      '<td>' + (i + 1) + '</td>' +
      '<td><strong>' + po.po_number + '</strong></td>' +
      '<td>' + supplier + '</td>' +
      '<td>' + (po.date || "—") + '</td>' +
      '<td>' + itemCount + '</td>' +
      '<td>' + fmtMoney(po.total) + '</td>' +
      '<td>' + getStatusBadge(po.status) + '</td>' +
      '<td><div class="table-actions">' +
        '<button class="btn-icon-sm" onclick="editPO(' + po.id + ')"><i data-lucide="pencil"></i></button>' +
        '<button class="btn-icon-sm btn-danger" onclick="deletePO(' + po.id + ')"><i data-lucide="trash-2"></i></button>' +
      '</div></td>' +
    '</tr>';
  }).join("");
  lucide.createIcons();
  if (typeof refreshSortableHeaders === "function") refreshSortableHeaders();
}

// ============ Edit → ไปหน้า form ============
function editPO(id) {
  window.location.href = "purchase-order-form.html?id=" + id;
}

// ============ Delete ============
function deletePO(id) {
  var po = purchaseOrders.find(function (x) { return x.id === id; });
  if (!po) return;
  showConfirm({
    title: "Confirm Delete",
    message: "ต้องการลบใบสั่งซื้อ <strong>" + po.po_number + "</strong> ใช่ไหม?",
    okText: "Delete",
    okColor: "#ef4444",
    onConfirm: function () {
      deletePurchaseOrderDB(id)
        .then(function () { return reloadPOs(); })
        .then(function () { applyFilters(); })
        .catch(function (err) { console.error(err); });
    },
  });
}

// ============ Filter & Sort ============
var currentFilter = "all";
var currentSort = "default";

function getFilteredData() {
  var keyword = document.querySelector(".filter-search-input").value.toLowerCase();
  var data = purchaseOrders.slice();

  if (currentFilter !== "all") data = data.filter(function (po) { return po.status === currentFilter; });

  if (keyword) {
    data = data.filter(function (po) {
      var sName = po.suppliers ? po.suppliers.name.toLowerCase() : "";
      return (po.po_number || "").toLowerCase().includes(keyword) || sName.includes(keyword);
    });
  }

  switch (currentSort) {
    case "date-desc":   data = data.slice().sort(function (a, b) { return (b.date || "").localeCompare(a.date || ""); }); break;
    case "date-asc":    data = data.slice().sort(function (a, b) { return (a.date || "").localeCompare(b.date || ""); }); break;
    case "amount-desc": data = data.slice().sort(function (a, b) { return Number(b.total) - Number(a.total); }); break;
    case "amount-asc":  data = data.slice().sort(function (a, b) { return Number(a.total) - Number(b.total); }); break;
  }
  return data;
}

function applyFilters() { renderTable(getFilteredData()); }

// ============ Load ============
function reloadPOs() {
  return (typeof fetchPurchaseOrdersDB === "function" ? fetchPurchaseOrdersDB() : Promise.resolve([]))
    .then(function (rows) { purchaseOrders = (rows || []).map(normalizePO); });
}

function normalizePO(po) {
  return {
    id: po.id,
    po_number: po.po_number || "",
    supplier_id: po.supplier_id,
    date: po.date || "",
    subtotal: Number(po.subtotal) || 0,
    tax: Number(po.tax) || 0,
    total: Number(po.total) || 0,
    status: po.status || "pending",
    note: po.note || "",
    suppliers: po.suppliers || null,
    purchase_order_items: po.purchase_order_items || [],
  };
}

// ============ Init ============
document.addEventListener("DOMContentLoaded", function () {
  document.querySelector(".filter-search-input").addEventListener("input", applyFilters);

  document.querySelectorAll(".filter-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".filter-btn").forEach(function (b) { b.classList.remove("active"); });
      this.classList.add("active");
      currentFilter = this.dataset.status;
      applyFilters();
    });
  });

  document.getElementById("sortSelect").addEventListener("change", function () {
    currentSort = this.value;
    applyFilters();
  });

  reloadPOs()
    .then(function () { applyFilters(); })
    .catch(function (err) { console.error(err); applyFilters(); });
});
