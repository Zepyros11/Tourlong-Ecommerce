// ============================================================
// sales-orders.js — Sales Orders List (ตาราง SO)
// form อยู่ที่ sales-order-form.html / sales-order-form.js
// ============================================================

var salesOrders = [];
var allPaymentsForSO = [];
var _appModeIsProduction = false;

function fmtMoney(n) { return "฿" + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function getStatusBadge(status) {
  switch (status) {
    case "completed":  return '<span class="badge badge-active">Completed</span>';
    case "processing": return '<span class="badge" style="background-color:#fef3c7;color:#f59e0b;">Processing</span>';
    case "cancelled":  return '<span class="badge badge-inactive">Cancelled</span>';
    default: return '<span class="badge">' + status + '</span>';
  }
}

function updateStats() {
  document.getElementById("statAll").textContent = salesOrders.length;
  document.getElementById("statCompleted").textContent = salesOrders.filter(function (so) { return so.status === "completed"; }).length;
  document.getElementById("statProcessing").textContent = salesOrders.filter(function (so) { return so.status === "processing"; }).length;
  document.getElementById("statCancelled").textContent = salesOrders.filter(function (so) { return so.status === "cancelled"; }).length;
}

function renderTable(data) {
  updateStats();
  var tbody = document.getElementById("soTableBody");
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:30px;color:#94a3b8;font-size:11px;">ยังไม่มีคำสั่งขาย</td></tr>';
    lucide.createIcons();
    return;
  }
  tbody.innerHTML = data.map(function (so, i) {
    var customer = so.customers ? so.customers.name : "—";
    var itemCount = so.sales_order_items ? so.sales_order_items.length : 0;
    var isCancelled = so.status === "cancelled";

    var deleteOrCancelBtn = isCancelled
      ? ''
      : (_appModeIsProduction
          ? '<button class="btn-icon-sm" style="color:#f59e0b;" onclick="openCancelSOModal(' + so.id + ')" title="ยกเลิก SO"><i data-lucide="ban"></i></button>'
          : '<button class="btn-icon-sm btn-danger" onclick="deleteSO(' + so.id + ')" title="ลบ (test mode)"><i data-lucide="trash-2"></i></button>');

    var editBtn = isCancelled
      ? ''
      : '<button class="btn-icon-sm" onclick="editSO(' + so.id + ')" title="แก้ไข"><i data-lucide="pencil"></i></button>';

    return '<tr class="' + (isCancelled ? "row-cancelled" : "") + '">' +
      '<td>' + (i + 1) + '</td>' +
      '<td><strong>' + so.so_number + '</strong></td>' +
      '<td>' + customer + '</td>' +
      '<td>' + (so.date || "—") + '</td>' +
      '<td>' + itemCount + '</td>' +
      '<td>' + fmtMoney(so.total) + '</td>' +
      '<td>' + getStatusBadge(so.status) + '</td>' +
      '<td><div class="table-actions">' +
        editBtn +
        deleteOrCancelBtn +
      '</div></td>' +
    '</tr>';
  }).join("");
  lucide.createIcons();
  if (typeof refreshSortableHeaders === "function") refreshSortableHeaders();
}

function alertMsg(title, message) {
  if (typeof showConfirm === "function") {
    showConfirm({ title: title, message: message, okText: "OK", okColor: "#47b8b4", onConfirm: function () {} });
  }
}

// ============ Edit → ไปหน้า form ============
function editSO(id) {
  window.location.href = "sales-order-form.html?id=" + id;
}

// ============ Delete (test mode) ============
function deleteSO(id) {
  var so = salesOrders.find(function (x) { return x.id === id; });
  if (!so) return;
  if (typeof assertTestMode === "function") {
    assertTestMode("การลบ SO").then(function () {
      var msg = "ต้องการลบคำสั่งขาย <strong>" + so.so_number + "</strong> ใช่ไหม? (TEST MODE — ลบจาก DB จริง)";
      if (so.status === "completed") msg += "<br><br><span style='color:#ef4444;font-size:10px;'>⚠️ SO นี้เคยตัด stock แล้ว — ระบบจะสร้าง movement reverse อัตโนมัติ</span>";
      showConfirm({
        title: "Confirm Delete",
        message: msg,
        okText: "Delete",
        okColor: "#ef4444",
        onConfirm: function () {
          deleteSalesOrderDB(id)
            .then(function () { return reloadSOs(); })
            .then(function () { applyFilters(); })
            .catch(function (err) { console.error(err); });
        },
      });
    }).catch(function () { /* blocked by assertTestMode */ });
  }
}

// ============ Cancel SO (production mode) ============
function openCancelSOModal(id) {
  var so = salesOrders.find(function (x) { return x.id === id; });
  if (!so) return;
  if (so.status === "cancelled") { if (typeof showToast === "function") showToast("ยกเลิกแล้ว", "SO นี้ถูกยกเลิกก่อนหน้านี้"); return; }

  document.getElementById("cancelSoId").value = so.id;
  document.getElementById("cancelSOLabel").textContent = so.so_number || "";

  var paidPayments = (allPaymentsForSO || []).filter(function (p) {
    return Number(p.so_id) === Number(so.id) && p.direction === "incoming" && p.status === "completed";
  });
  var paidAmount = paidPayments.reduce(function (s, p) { return s + Number(p.amount || 0); }, 0);
  var hasPaid = paidAmount > 0;

  var impactHtml = '<strong style="font-size:12px;color:#991b1b;">ผลกระทบจากการยกเลิก:</strong><br/>';
  impactHtml += '• SO <strong>' + (so.so_number || "") + '</strong> → สถานะเปลี่ยนเป็น <strong>ยกเลิก</strong><br/>';
  if (so.status === "completed") {
    impactHtml += '• Reverse stock ' + (so.sales_order_items || []).length + ' รายการ (สินค้ากลับเข้าคลัง)<br/>';
  }
  impactHtml += '• Pending payment auto-cancel (ทำผ่าน DB trigger)<br/>';
  if (hasPaid) {
    impactHtml += '• <span style="color:#991b1b;">ลูกค้าจ่ายแล้ว <strong>' + fmtMoney(paidAmount) + '</strong></span> — เลือกวิธีคืนเงินด้านล่าง<br/>';
  }

  document.getElementById("cancelSOImpact").innerHTML = impactHtml;
  document.getElementById("cancelSORefundGroup").style.display = hasPaid ? "block" : "none";
  document.getElementById("cancelSOPartialGroup").style.display = "none";
  document.getElementById("cancelSORefundAmount").value = "";
  document.getElementById("cancelSOPenaltyAmount").value = "";
  document.getElementById("cancelSOPenaltyNote").value = "";
  document.getElementById("cancelSOReason").value = "";

  document.querySelectorAll('input[name="soRefundOption"]').forEach(function (r) {
    r.onchange = function () {
      document.getElementById("cancelSOPartialGroup").style.display = this.value === "partial" ? "grid" : "none";
      if (this.value === "partial" && !document.getElementById("cancelSORefundAmount").value) {
        document.getElementById("cancelSORefundAmount").value = paidAmount;
      }
    };
  });

  openModalById("cancelSOModal", function () { document.getElementById("cancelSOReason").focus(); });
  if (typeof lucide !== "undefined") lucide.createIcons();
}

function submitCancelSO() {
  var soId = Number(document.getElementById("cancelSoId").value);
  var so = salesOrders.find(function (x) { return x.id === soId; });
  if (!so) return;

  var reason = document.getElementById("cancelSOReason").value.trim();
  if (!reason) { alertMsg("ไม่ครบถ้วน", "กรุณาระบุเหตุผลการยกเลิก"); document.getElementById("cancelSOReason").focus(); return; }

  var paidPayments = (allPaymentsForSO || []).filter(function (p) {
    return Number(p.so_id) === Number(so.id) && p.direction === "incoming" && p.status === "completed";
  });
  var paidAmount = paidPayments.reduce(function (s, p) { return s + Number(p.amount || 0); }, 0);

  var refundOpt = null;
  var refundAmount = 0;
  var penaltyAmount = 0;
  if (paidAmount > 0) {
    var sel = document.querySelector('input[name="soRefundOption"]:checked');
    refundOpt = sel ? sel.value : "full";
    if (refundOpt === "full") {
      refundAmount = paidAmount;
    } else if (refundOpt === "partial") {
      refundAmount = parseFloat(document.getElementById("cancelSORefundAmount").value) || 0;
      penaltyAmount = parseFloat(document.getElementById("cancelSOPenaltyAmount").value) || 0;
      if (refundAmount <= 0) { alertMsg("ไม่ถูกต้อง", "กรุณาระบุยอดคืนมากกว่า 0"); return; }
      if (refundAmount > paidAmount) { alertMsg("ไม่ถูกต้อง", "ยอดคืนเกินยอดที่รับมา (" + fmtMoney(paidAmount) + ")"); return; }
    }
  }
  var penaltyNote = document.getElementById("cancelSOPenaltyNote").value.trim();

  var actionDesc = "ยกเลิก SO " + so.so_number + " | refund: " + (refundOpt || "n/a") + " | refundAmt: " + refundAmount + " | penalty: " + penaltyAmount;

  var passwordOp = (typeof requireManagerPassword === "function")
    ? requireManagerPassword(actionDesc)
    : Promise.resolve();

  passwordOp
    .then(function () { return doCancelSOCascade(so, reason, refundOpt, refundAmount, penaltyAmount, penaltyNote); })
    .then(function () {
      closeModalById("cancelSOModal");
      if (typeof showToast === "function") showToast("ยกเลิกสำเร็จ", so.so_number);
      return reloadSOs();
    })
    .then(function () { applyFilters(); })
    .catch(function (err) {
      if (err && err.message === "cancelled") return;
      console.error(err);
      if (typeof showToast === "function") showToast("ยกเลิกไม่สำเร็จ", err.message || "error");
    });
}

function doCancelSOCascade(so, reason, refundOption, refundAmount, penaltyAmount, penaltyNote) {
  var stockChain = Promise.resolve();
  if (so.status === "completed" && so.sales_order_items && so.sales_order_items.length) {
    var note = "ยกเลิก SO " + (so.so_number || "");
    stockChain = Promise.all(so.sales_order_items.map(function (it) {
      return createReverseMovement(it, "in", so.warehouse_id, note);
    }));
  }

  return stockChain
    .then(function () {
      if (!refundOption || refundOption === "none" || refundAmount <= 0) return null;
      var payload = {
        date: new Date().toISOString().slice(0, 10),
        direction: "outgoing",
        so_id: so.id,
        customer_id: so.customer_id,
        amount: refundAmount,
        status: "pending",
        method: "โอนธนาคาร",
        source: "manual",
        note: "Refund SO " + so.so_number + " (" + (refundOption === "full" ? "เต็มจำนวน" : "บางส่วน") + ") — " + reason,
      };
      return createPaymentDB(payload);
    })
    .then(function () {
      var cancelNote = "[CANCELLED " + new Date().toISOString().slice(0, 10) + "] " + reason;
      if (refundOption) cancelNote += " | refund: " + refundOption + " (" + refundAmount + ")";
      if (penaltyAmount > 0) cancelNote += " | penalty: " + penaltyAmount;
      if (penaltyNote) cancelNote += " | " + penaltyNote;
      var existingNote = so.note ? (so.note + "\n") : "";
      return updateDocStatus("sales_orders", so.id, "cancelled", { note: existingNote + cancelNote });
    })
    .then(function () {
      return logCancelActivity("cancel_so", "ยกเลิก SO " + so.so_number + " | reason: " + reason + " | refund: " + (refundOption || "n/a") + " (" + refundAmount + ") | penalty: " + penaltyAmount);
    });
}

var currentFilter = "all";
var currentSort = "default";

function getFilteredData() {
  var keyword = document.querySelector(".filter-search-input").value.toLowerCase();
  var data = salesOrders.slice();
  if (currentFilter !== "all") data = data.filter(function (so) { return so.status === currentFilter; });
  if (keyword) {
    data = data.filter(function (so) {
      var cName = so.customers ? so.customers.name.toLowerCase() : "";
      return (so.so_number || "").toLowerCase().includes(keyword) || cName.includes(keyword);
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

function reloadSOs() {
  return Promise.all([
    typeof fetchSalesOrdersDB === "function" ? fetchSalesOrdersDB() : Promise.resolve([]),
    typeof fetchPaymentsDB === "function" ? fetchPaymentsDB() : Promise.resolve([]),
  ]).then(function (res) {
    salesOrders = (res[0] || []).map(normalizeSO);
    allPaymentsForSO = res[1] || [];
  });
}

function normalizeSO(so) {
  return {
    id: so.id,
    so_number: so.so_number || "",
    customer_id: so.customer_id,
    warehouse_id: so.warehouse_id,
    date: so.date || "",
    subtotal: Number(so.subtotal) || 0,
    tax: Number(so.tax) || 0,
    discount: Number(so.discount) || 0,
    total: Number(so.total) || 0,
    status: so.status || "processing",
    note: so.note || "",
    customers: so.customers || null,
    warehouses: so.warehouses || null,
    sales_order_items: so.sales_order_items || [],
  };
}

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

  // Load app mode ก่อน render ครั้งแรก (เพื่อเลือก delete vs cancel button)
  var modePromise = (typeof isProductionMode === "function") ? isProductionMode() : Promise.resolve(false);
  modePromise.then(function (isProd) {
    _appModeIsProduction = isProd;
  }).then(function () { return reloadSOs(); })
    .then(function () { applyFilters(); })
    .catch(function (err) { console.error(err); applyFilters(); });
});
