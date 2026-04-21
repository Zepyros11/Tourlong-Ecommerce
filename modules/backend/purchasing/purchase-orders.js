// ============================================================
// purchase-orders.js — Purchase Orders List (ตาราง PO)
// form อยู่ที่ purchase-order-form.html / purchase-order-form.js
// ============================================================

var purchaseOrders = [];
var allGRsForPO = []; // GRs loaded once to compute outstanding per PO

function isPOFullyReceived(po) {
  var items = po.purchase_order_items || [];
  if (!items.length) return false;
  return items.every(function (pi) {
    var ordered = Number(pi.qty) || 0;
    if (ordered <= 0) return true;
    var received = 0;
    allGRsForPO.forEach(function (g) {
      if (Number(g.po_id) !== Number(po.id)) return;
      if (g.status === "cancelled") return;
      (g.goods_receipt_items || []).forEach(function (gi) {
        if (Number(gi.po_item_id) === Number(pi.id)) received += Number(gi.qty) || 0;
      });
    });
    return received >= ordered;
  });
}

// ============ Helpers ============
function fmtMoney(n) { return "฿" + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

var PO_STATUS_OPTIONS = [
  { value: "pending",   label: "รอดำเนินการ", bg: "#fef3c7", color: "#f59e0b" },
  { value: "approved",  label: "อนุมัติแล้ว",   bg: "#d1fae5", color: "#10b981" },
  { value: "cancelled", label: "ยกเลิก",        bg: "#fee2e2", color: "#ef4444" },
];

function getStatusBadge(status, poId) {
  var cur = PO_STATUS_OPTIONS.find(function (o) { return o.value === status; }) || PO_STATUS_OPTIONS[0];
  var opts = PO_STATUS_OPTIONS.map(function (o) {
    return '<option value="' + o.value + '" style="background-color:' + o.bg + ';color:' + o.color + ';font-weight:700;"' +
      (o.value === status ? ' selected' : '') + '>' + o.label + '</option>';
  }).join("");
  return '<select class="status-select" onchange="updatePOStatusInline(' + poId + ',this.value)" ' +
         'style="background-color:' + cur.bg + ';color:' + cur.color + ';">' + opts + '</select>';
}

function updatePOStatusInline(id, newStatus) {
  var po = purchaseOrders.find(function (x) { return x.id === id; });
  if (!po) return;
  fetch(SUPABASE_URL + "/rest/v1/purchase_orders?id=eq." + id, {
    method: "PATCH",
    headers: supabaseHeaders,
    body: JSON.stringify({ status: newStatus }),
  }).then(function (res) {
    if (!res.ok) throw new Error("Update failed");
    return reloadPOs();
  }).then(function () {
    applyFilters();
    if (typeof showToast === "function") showToast("อัปเดตสถานะ " + po.po_number + " แล้ว", "success");
  }).catch(function (err) {
    console.error(err);
    if (typeof showToast === "function") showToast("อัปเดตไม่สำเร็จ", "error");
  });
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
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;color:#94a3b8;font-size:11px;">ยังไม่มีใบสั่งซื้อ</td></tr>';
    lucide.createIcons();
    return;
  }
  tbody.innerHTML = data.map(function (po, i) {
    var supplier = po.suppliers ? po.suppliers.name : "—";
    var itemCount = po.purchase_order_items ? po.purchase_order_items.length : 0;
    return '<tr>' +
      '<td>' + (i + 1) + '</td>' +
      '<td>' + supplier + '</td>' +
      '<td>' + (po.date || "—") + '</td>' +
      '<td>' + itemCount + '</td>' +
      '<td>' + fmtMoney(po.total) + '</td>' +
      '<td>' + getStatusBadge(po.status, po.id) + '</td>' +
      '<td><div class="table-actions">' +
        (po.status !== "cancelled" && !isPOFullyReceived(po)
          ? '<button class="btn-icon-sm btn-receive" onclick="receiveGoodsForPO(' + po.id + ')" title="รับของเข้าคลัง"><i data-lucide="package-check"></i></button>'
          : '') +
        '<button class="btn-icon-sm" onclick="editPO(' + po.id + ')" title="แก้ไข"><i data-lucide="pencil"></i></button>' +
        '<button class="btn-icon-sm btn-danger" onclick="deletePO(' + po.id + ')" title="ลบ"><i data-lucide="trash-2"></i></button>' +
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

// ============ รับของ → ไปหน้า GR form พร้อม pre-fill PO ============
function receiveGoodsForPO(id) {
  window.location.href = "goods-receive-form.html?po_id=" + id;
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
  return Promise.all([
    typeof fetchPurchaseOrdersDB === "function" ? fetchPurchaseOrdersDB() : Promise.resolve([]),
    typeof fetchGoodsReceiptsDB === "function" ? fetchGoodsReceiptsDB() : Promise.resolve([]),
  ]).then(function (res) {
    purchaseOrders = (res[0] || []).map(normalizePO);
    allGRsForPO = res[1] || [];
  });
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
