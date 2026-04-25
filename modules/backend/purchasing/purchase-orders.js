// ============================================================
// purchase-orders.js — Purchase Orders List (ตาราง PO)
// form อยู่ที่ purchase-order-form.html / purchase-order-form.js
// ============================================================

var purchaseOrders = [];
var allGRsForPO = []; // GRs loaded once to compute outstanding per PO
var allBankAccounts = []; // สำหรับ dropdown ในฟอร์มชำระเงิน
var allPaymentsForPO = []; // Payments เพื่อตรวจ paid amount ตอน cancel + Phase 3 update
var pendingSlip = null;    // data URL ของสลิปที่เลือก (รอ upload)
var pendingReceipt = null; // data URL หรือ File ของใบเสร็จ
var pendingReceiptFileName = null;
var _appModeIsProduction = false; // cache ไว้ใน renderTable

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
  // Cancelled = static badge ไม่ให้แก้สถานะได้อีก (ใช้ style เดียวกับ GR)
  if (status === "cancelled") {
    return '<span class="badge badge-inactive" title="PO ถูกยกเลิกแล้ว">ยกเลิก</span>';
  }
  var cur = PO_STATUS_OPTIONS.find(function (o) { return o.value === status; }) || PO_STATUS_OPTIONS[0];
  var opts = PO_STATUS_OPTIONS.map(function (o) {
    // ซ่อน option "ยกเลิก" จาก dropdown (ต้องผ่าน cancel flow)
    if (o.value === "cancelled") return '';
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
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:30px;color:#94a3b8;font-size:11px;">ยังไม่มีใบสั่งซื้อ</td></tr>';
    lucide.createIcons();
    return;
  }
  tbody.innerHTML = data.map(function (po, i) {
    var supplier = po.suppliers ? po.suppliers.name : "—";
    var itemCount = po.purchase_order_items ? po.purchase_order_items.length : 0;

    var payBtn = "";
    var receiptBtn = "";
    if (po.status === "approved") {
      if (po.payment_status !== "paid") {
        payBtn = '<button class="btn-icon-sm" style="color:#10b981;" onclick="openPaymentModal(' + po.id + ')" title="บันทึกการชำระเงิน"><i data-lucide="credit-card"></i></button>';
      } else if (!po.receipt_url && !po.receipt_number) {
        receiptBtn = '<button class="btn-icon-sm" style="color:#3b82f6;" onclick="openReceiptModal(' + po.id + ')" title="แนบใบเสร็จ"><i data-lucide="file-text"></i></button>';
      }
    }

    // mode-aware: test = delete, production = cancel
    var deleteOrCancelBtn = po.status === "cancelled"
      ? ''
      : (_appModeIsProduction
          ? '<button class="btn-icon-sm" style="color:#f59e0b;" onclick="openCancelPOModal(' + po.id + ')" title="ยกเลิก PO"><i data-lucide="ban"></i></button>'
          : '<button class="btn-icon-sm btn-danger" onclick="deletePO(' + po.id + ')" title="ลบ (test mode)"><i data-lucide="trash-2"></i></button>');

    var isCancelled = po.status === "cancelled";
    var editBtn = isCancelled
      ? ''
      : '<button class="btn-icon-sm" onclick="editPO(' + po.id + ')" title="แก้ไข"><i data-lucide="pencil"></i></button>';

    return '<tr class="' + (isCancelled ? "row-cancelled" : "") + '">' +
      '<td>' + (i + 1) + '</td>' +
      '<td>' + supplier + '</td>' +
      '<td>' + (po.date || "—") + '</td>' +
      '<td>' + itemCount + '</td>' +
      '<td>' + fmtMoney(po.total) + '</td>' +
      '<td>' + getStatusBadge(po.status, po.id) + '</td>' +
      '<td>' + getPaymentBadge(po) + '</td>' +
      '<td><div class="table-actions">' +
        payBtn +
        receiptBtn +
        (po.status !== "cancelled" && !isPOFullyReceived(po)
          ? '<button class="btn-icon-sm btn-receive" onclick="receiveGoodsForPO(' + po.id + ')" title="รับของเข้าคลัง"><i data-lucide="package-check"></i></button>'
          : '') +
        editBtn +
        deleteOrCancelBtn +
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

// ============ Delete (test mode) / Cancel (production mode) ============
function deletePO(id) {
  var po = purchaseOrders.find(function (x) { return x.id === id; });
  if (!po) return;
  // Force-check mode (ป้องกัน stale cache)
  assertTestMode("การลบ PO").then(function () {
    showConfirm({
      title: "Confirm Delete",
      message: "ต้องการลบใบสั่งซื้อ <strong>" + po.po_number + "</strong> ใช่ไหม? (TEST MODE — ลบจาก DB จริง + cascade ไปยัง GR/Return)",
      okText: "Delete",
      okColor: "#ef4444",
      onConfirm: function () {
        deletePurchaseOrderDB(id)
          .then(function () { return reloadPOs(); })
          .then(function () { applyFilters(); })
          .catch(function (err) { console.error(err); });
      },
    });
  }).catch(function () { /* blocked by assertTestMode */ });
}

// ============ Cancel PO (production mode) ============
function openCancelPOModal(id) {
  var po = purchaseOrders.find(function (x) { return x.id === id; });
  if (!po) return;
  if (po.status === "cancelled") { if (typeof showToast === "function") showToast("ยกเลิกแล้ว", "PO นี้ถูกยกเลิกก่อนหน้านี้"); return; }

  document.getElementById("cancelPoId").value = po.id;
  document.getElementById("cancelPOLabel").textContent = po.po_number || "";

  // สร้าง impact summary
  var relatedGRs = allGRsForPO.filter(function (g) {
    return Number(g.po_id) === Number(po.id) && g.status !== "cancelled";
  });
  var totalGRItems = relatedGRs.reduce(function (s, g) { return s + (g.goods_receipt_items || []).length; }, 0);

  // หา Payment outgoing completed ที่ผูก PO นี้ (จ่าย supplier ไปแล้ว)
  var paidPayments = (allPaymentsForPO || []).filter(function (p) {
    return Number(p.po_id) === Number(po.id) && p.direction === "outgoing" && p.status === "completed";
  });
  var paidAmount = paidPayments.reduce(function (s, p) { return s + Number(p.amount || 0); }, 0);
  // Fallback: ถ้ายังไม่ migrate Payment table ใช้ flag เก่า + ยอด PO
  var hasPaid = paidAmount > 0 || po.payment_status === "paid";
  if (hasPaid && paidAmount === 0) paidAmount = Number(po.total) || 0;

  var impactHtml = '<strong style="font-size:12px;color:#991b1b;">ผลกระทบจากการยกเลิก:</strong><br/>';
  impactHtml += '• PO <strong>' + (po.po_number || "") + '</strong> → สถานะเปลี่ยนเป็น <strong>ยกเลิก</strong><br/>';
  if (relatedGRs.length) {
    impactHtml += '• ยกเลิก GR ' + relatedGRs.length + ' ใบ (' + relatedGRs.map(function (g) { return g.gr_number; }).join(", ") + ')<br/>';
    impactHtml += '• Reverse stock ' + totalGRItems + ' รายการ (สินค้ากลับจาก warehouse)<br/>';
  }
  impactHtml += '• Pending payment auto-cancel (ผ่าน DB trigger)<br/>';
  if (hasPaid) {
    impactHtml += '• <span style="color:#991b1b;">จ่าย supplier แล้ว <strong>' + fmtMoney(paidAmount) + '</strong></span> — เลือกวิธีรับเงินคืนด้านล่าง<br/>';
  }

  document.getElementById("cancelPOImpact").innerHTML = impactHtml;
  document.getElementById("cancelRefundGroup").style.display = hasPaid ? "block" : "none";
  document.getElementById("cancelPORefundAmountGroup").style.display = "none";
  document.getElementById("cancelPORefundAmount").value = "";
  document.getElementById("cancelPenaltyAmount").value = "";
  document.getElementById("cancelPenaltyNote").value = "";
  document.getElementById("cancelReason").value = "";
  // reset radio: full เป็น default
  var fullRadio = document.querySelector('input[name="refundOption"][value="full"]');
  if (fullRadio) fullRadio.checked = true;

  // toggle partial amount group
  document.querySelectorAll('input[name="refundOption"]').forEach(function (r) {
    r.onchange = function () {
      document.getElementById("cancelPORefundAmountGroup").style.display = this.value === "partial" ? "grid" : "none";
      if (this.value === "partial" && !document.getElementById("cancelPORefundAmount").value) {
        document.getElementById("cancelPORefundAmount").value = paidAmount;
      }
    };
  });

  openModalById("cancelPOModal", function () { document.getElementById("cancelReason").focus(); });
  if (typeof lucide !== "undefined") lucide.createIcons();
}

function submitCancelPO() {
  var poId = Number(document.getElementById("cancelPoId").value);
  var po = purchaseOrders.find(function (x) { return x.id === poId; });
  if (!po) return;

  var reason = document.getElementById("cancelReason").value.trim();
  if (!reason) { alert("กรุณาระบุเหตุผลการยกเลิก"); document.getElementById("cancelReason").focus(); return; }

  // หา paid amount จาก Payment table (fallback PO.total ถ้าไม่มี record)
  var paidPayments = (allPaymentsForPO || []).filter(function (p) {
    return Number(p.po_id) === Number(po.id) && p.direction === "outgoing" && p.status === "completed";
  });
  var paidAmount = paidPayments.reduce(function (s, p) { return s + Number(p.amount || 0); }, 0);
  var hasPaid = paidAmount > 0 || po.payment_status === "paid";
  if (hasPaid && paidAmount === 0) paidAmount = Number(po.total) || 0;

  var refundOpt = null;
  var refundAmount = 0;
  if (hasPaid) {
    var selected = document.querySelector('input[name="refundOption"]:checked');
    refundOpt = selected ? selected.value : "full";
    if (refundOpt === "full") {
      refundAmount = paidAmount;
    } else if (refundOpt === "partial") {
      refundAmount = parseFloat(document.getElementById("cancelPORefundAmount").value) || 0;
      if (refundAmount <= 0) { alert("กรุณาระบุยอดคืนมากกว่า 0"); return; }
      if (refundAmount > paidAmount) { alert("ยอดคืนเกินยอดที่จ่ายไป (" + fmtMoney(paidAmount) + ")"); return; }
    } else if (refundOpt === "lost") {
      refundAmount = 0; // expense เต็มยอด
    }
    // credit / pending → ไม่สร้าง record
  }
  var penaltyAmount = parseFloat(document.getElementById("cancelPenaltyAmount").value) || 0;
  var penaltyNote = document.getElementById("cancelPenaltyNote").value.trim();

  var actionDesc = "ยกเลิก PO " + po.po_number + " | refund: " + (refundOpt || "n/a") + " (" + refundAmount + "/" + paidAmount + ") | penalty: " + penaltyAmount;

  requireManagerPassword(actionDesc)
    .then(function () { return doCancelPOCascade(po, reason, refundOpt, refundAmount, paidAmount, penaltyAmount, penaltyNote); })
    .then(function () {
      closeModalById("cancelPOModal");
      if (typeof showToast === "function") showToast("ยกเลิกสำเร็จ", po.po_number);
      return reloadPOs();
    })
    .then(function () { applyFilters(); })
    .catch(function (err) {
      if (err && err.message === "cancelled") return; // user closed password modal
      console.error(err);
      if (typeof showToast === "function") showToast("ยกเลิกไม่สำเร็จ", err.message || "error");
    });
}

function doCancelPOCascade(po, reason, refundOption, refundAmount, paidAmount, penaltyAmount, penaltyNote) {
  var relatedGRs = allGRsForPO.filter(function (g) {
    return Number(g.po_id) === Number(po.id) && g.status !== "cancelled";
  });
  var grIds = relatedGRs.map(function (g) { return g.id; });

  // 0. Fetch + Cancel related Returns ที่อ้างอิง GR เหล่านี้
  var returnsPromise = grIds.length
    ? fetch(SUPABASE_URL + "/rest/v1/purchase_returns?gr_id=in.(" + grIds.join(",") + ")&status=neq.cancelled&select=*,purchase_return_items(id,product_id,qty,cost)", {
        headers: supabaseHeaders,
      }).then(function (r) { return r.json(); })
    : Promise.resolve([]);

  var returnChain = returnsPromise.then(function (relatedReturns) {
    relatedReturns = relatedReturns || [];
    return relatedReturns.reduce(function (p, pr) {
      return p
        .then(function () {
          // Reverse stock ถ้า return เคย approved (เคยตัด stock)
          if (pr.status === "approved") return reverseReturnMovements(pr);
        })
        .then(function () { return updateDocStatus("purchase_returns", pr.id, "cancelled"); })
        .then(function () { return logCancelActivity("cancel_return", "Auto-cancelled Return " + (pr.return_number || pr.id) + " from PO " + po.po_number); });
    }, Promise.resolve());
  });

  // 1. Reverse + cancel related GRs (after returns cancelled)
  var grChain = returnChain.then(function () {
    return relatedGRs.reduce(function (p, gr) {
      return p
        .then(function () { return reverseGRMovements(gr); })
        .then(function () { return updateDocStatus("goods_receipts", gr.id, "cancelled"); })
        .then(function () { return logCancelActivity("cancel_gr", "Auto-cancelled GR " + gr.gr_number + " from PO " + po.po_number); });
    }, Promise.resolve());
  });

  return grChain
    // 2a. Handle refund — Payment incoming (ถ้า full/partial)
    .then(function () {
      if (!refundOption || refundAmount <= 0) return null;
      if (refundOption !== "full" && refundOption !== "partial") return null;
      return createPaymentDB({
        date: new Date().toISOString().slice(0, 10),
        direction: "incoming",
        po_id: po.id,
        supplier_id: po.supplier_id,
        amount: refundAmount,
        status: "pending",
        method: "โอนธนาคาร",
        source: "manual",
        note: "Refund PO " + po.po_number + " (" + (refundOption === "full" ? "เต็มจำนวน" : "บางส่วน") + ") — " + reason,
      });
    })
    // 2b. Handle refund — Expense ส่วนที่สูญ (lost = ทั้งหมด, partial = ส่วนต่าง)
    .then(function () {
      if (!refundOption || !paidAmount) return null;
      var lostAmount = 0;
      if (refundOption === "lost") lostAmount = paidAmount;
      else if (refundOption === "partial") lostAmount = paidAmount - refundAmount;
      if (lostAmount <= 0) return null;
      return createExpenseDB({
        date: new Date().toISOString().slice(0, 10),
        description: "สูญเงินจากยกเลิก PO " + po.po_number + (refundOption === "partial" ? " (ส่วนที่ supplier ไม่คืน)" : ""),
        category: "ยกเลิก PO",
        amount: lostAmount,
        status: "paid",
        note: reason,
      });
    })
    // 3. Penalty fee (expense)
    .then(function () {
      if (penaltyAmount > 0) {
        return createExpenseDB({
          date: new Date().toISOString().slice(0, 10),
          description: "ค่าปรับยกเลิก PO " + po.po_number + (penaltyNote ? " — " + penaltyNote : ""),
          category: "ค่าปรับ",
          amount: penaltyAmount,
          status: "paid",
          note: reason,
        });
      }
    })
    // 4. Mark PO cancelled + store cancellation metadata in note
    .then(function () {
      var cancelNote = "[CANCELLED " + new Date().toISOString().slice(0, 10) + "] " + reason;
      if (refundOption) cancelNote += " | refund: " + refundOption;
      if (penaltyAmount > 0) cancelNote += " | penalty: " + penaltyAmount;
      var existingNote = po.note ? (po.note + "\n") : "";
      return updateDocStatus("purchase_orders", po.id, "cancelled", { note: existingNote + cancelNote });
    })
    // 5. Log
    .then(function () {
      return logCancelActivity("cancel_po", "ยกเลิก PO " + po.po_number + " | reason: " + reason + " | refund: " + (refundOption || "n/a") + " | penalty: " + penaltyAmount);
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
    typeof fetchBankAccountsDB === "function" ? fetchBankAccountsDB() : Promise.resolve([]),
    typeof fetchPaymentsDB === "function" ? fetchPaymentsDB() : Promise.resolve([]),
  ]).then(function (res) {
    purchaseOrders = (res[0] || []).map(normalizePO);
    allGRsForPO = res[1] || [];
    allBankAccounts = res[2] || [];
    allPaymentsForPO = res[3] || [];
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
    // Payment fields
    payment_status: po.payment_status || "unpaid",
    paid_date: po.paid_date || "",
    payment_method: po.payment_method || "",
    bank_account_id: po.bank_account_id || null,
    payment_slip_url: po.payment_slip_url || "",
    receipt_number: po.receipt_number || "",
    receipt_url: po.receipt_url || "",
    bank_accounts: po.bank_accounts || null,
  };
}

// ============ Payment status badge ============
function getPaymentBadge(po) {
  if (po.status === "cancelled") {
    return '<span style="font-size:10px;color:#cbd5e1;">—</span>';
  }
  if (po.payment_status === "paid") {
    var receiptMark = (po.receipt_url || po.receipt_number)
      ? '<span title="มีใบเสร็จ ' + (po.receipt_number || "") + '" style="color:#3b82f6;margin-left:4px;font-size:11px;">🧾</span>'
      : '<span title="ยังไม่มีใบเสร็จ" style="color:#cbd5e1;margin-left:4px;font-size:10px;">—</span>';
    return '<span class="badge badge-active">จ่ายแล้ว</span>' + receiptMark;
  }
  return '<span class="badge" style="background-color:#fef3c7;color:#f59e0b;">ยังไม่จ่าย</span>';
}

// ============ Payment Modal ============
function populateBankAccountDropdown(selectedId) {
  var sel = document.getElementById("paymentBankAccount");
  var html = '<option value="">— เลือกบัญชี —</option>';
  allBankAccounts.forEach(function (b) {
    if (b.status === "inactive") return;
    html += '<option value="' + b.id + '">' + (b.bank || "") + ' — ' + (b.account_name || "") + '</option>';
  });
  sel.innerHTML = html;
  if (selectedId) sel.value = String(selectedId);
}

function openPaymentModal(poId) {
  var po = purchaseOrders.find(function (x) { return x.id === poId; });
  if (!po) return;
  document.getElementById("paymentPoId").value = po.id;
  document.getElementById("paymentPOLabel").textContent = po.po_number || "";
  document.getElementById("paymentAmount").value = fmtMoney(po.total);
  document.getElementById("paymentDate").value = po.paid_date || new Date().toISOString().slice(0, 10);
  document.getElementById("paymentMethod").value = po.payment_method || "bank_transfer";
  populateBankAccountDropdown(po.bank_account_id);
  pendingSlip = null;
  renderSlipPreview(po.payment_slip_url || null);
  openModalById("paymentModal");
  if (typeof lucide !== "undefined") lucide.createIcons();
}

function renderSlipPreview(url) {
  var box = document.getElementById("slipPreviewBox");
  var img = document.getElementById("slipPreviewImg");
  var upload = document.getElementById("slipUploadBox");
  if (url) {
    box.style.display = "block";
    img.src = url;
    upload.style.display = "none";
  } else {
    box.style.display = "none";
    upload.style.display = "flex";
  }
}

function handleSlipSelect(input) {
  var f = input.files[0];
  if (!f) return;
  var reader = new FileReader();
  reader.onload = function (e) {
    pendingSlip = e.target.result;
    renderSlipPreview(pendingSlip);
  };
  reader.readAsDataURL(f);
  input.value = "";
}

function removeSlip() {
  pendingSlip = "";
  renderSlipPreview(null);
}

function savePayment() {
  var poId = Number(document.getElementById("paymentPoId").value);
  var po = purchaseOrders.find(function (x) { return x.id === poId; });
  if (!po) return;
  var oldSlip = po.payment_slip_url || "";

  var bankAccountId = document.getElementById("paymentBankAccount").value
    ? Number(document.getElementById("paymentBankAccount").value)
    : null;
  var paidDate = document.getElementById("paymentDate").value || null;
  var paidMethod = document.getElementById("paymentMethod").value;

  var slipOp;
  if (pendingSlip === null) {
    slipOp = Promise.resolve(undefined);
  } else if (pendingSlip === "") {
    slipOp = Promise.resolve(null);
  } else if (typeof pendingSlip === "string" && pendingSlip.indexOf("data:") === 0) {
    slipOp = uploadDataUrlToStorage("product-images", pendingSlip);
  } else {
    slipOp = Promise.resolve(undefined);
  }

  slipOp.then(function (newUrl) {
    // 1. update PO row (payment_status + slip + denormalized fields เพื่อแสดง badge)
    var poPayload = {
      payment_status: "paid",
      paid_date: paidDate,
      payment_method: paidMethod,
      bank_account_id: bankAccountId,
    };
    if (newUrl !== undefined) poPayload.payment_slip_url = newUrl;
    return fetch(SUPABASE_URL + "/rest/v1/purchase_orders?id=eq." + poId, {
      method: "PATCH",
      headers: supabaseHeaders,
      body: JSON.stringify(poPayload),
    }).then(function (res) {
      if (!res.ok) throw new Error("Payment save failed");
      return res;
    });
  }).then(function () {
    // 2. update Payment row ที่ trigger สร้างไว้ (status pending → completed)
    var autoPayment = (allPaymentsForPO || []).find(function (p) {
      return Number(p.po_id) === Number(poId) && p.source === "po" && p.status === "pending";
    });
    var paymentPayload = {
      status: "completed",
      bank_account_id: bankAccountId,
      method: paidMethod,
      date: paidDate,
    };
    if (autoPayment) {
      return updatePaymentDB(autoPayment.id, paymentPayload);
    }
    // Fallback: ถ้าไม่มี auto Payment (PO เก่าก่อน migration หรือ trigger ไม่ทำงาน) → สร้างใหม่
    return createPaymentDB(Object.assign({
      direction: "outgoing",
      po_id: poId,
      supplier_id: po.supplier_id,
      amount: Number(po.total) || 0,
      source: "po",
      note: "Payment for PO " + (po.po_number || ""),
    }, paymentPayload));
  }).then(function () {
    // ลบ slip เก่าถ้าเปลี่ยน
    if (pendingSlip !== null && oldSlip && typeof deleteProductImagesFromStorage === "function") {
      deleteProductImagesFromStorage([oldSlip]).catch(function (e) { console.warn(e); });
    }
    return reloadPOs();
  }).then(function () {
    closeModalById("paymentModal");
    applyFilters();
    if (typeof showToast === "function") showToast("บันทึกการชำระเงินแล้ว", "success");
  }).catch(function (err) {
    console.error(err);
    if (typeof showToast === "function") showToast("บันทึกไม่สำเร็จ", "error");
  });
}

// ============ Receipt Modal ============
function openReceiptModal(poId) {
  var po = purchaseOrders.find(function (x) { return x.id === poId; });
  if (!po) return;
  document.getElementById("receiptPoId").value = po.id;
  document.getElementById("receiptPOLabel").textContent = po.po_number || "";
  var defaultReceiptNo = po.receipt_number || (po.po_number ? po.po_number.replace(/^PO-/, "RE-") : "");
  document.getElementById("receiptNumber").value = defaultReceiptNo;
  pendingReceipt = null;
  pendingReceiptFileName = null;
  renderReceiptPreview(po.receipt_url || null, null);
  openModalById("receiptModal");
  if (typeof lucide !== "undefined") lucide.createIcons();
}

function renderReceiptPreview(url, fileName) {
  var box = document.getElementById("receiptPreviewBox");
  var img = document.getElementById("receiptPreviewImg");
  var nameEl = document.getElementById("receiptFilename");
  var upload = document.getElementById("receiptUploadBox");
  if (url) {
    box.style.display = "block";
    var isPdf = /\.pdf(\?|$)/i.test(url) || /^data:application\/pdf/.test(url);
    if (isPdf) {
      img.style.display = "none";
      nameEl.style.display = "block";
      nameEl.textContent = fileName || "ไฟล์ PDF";
    } else {
      img.style.display = "block";
      img.src = url;
      nameEl.style.display = "none";
    }
    upload.style.display = "none";
  } else {
    box.style.display = "none";
    upload.style.display = "flex";
  }
}

function handleReceiptSelect(input) {
  var f = input.files[0];
  if (!f) return;
  var reader = new FileReader();
  reader.onload = function (e) {
    pendingReceipt = e.target.result;
    pendingReceiptFileName = f.name;
    renderReceiptPreview(pendingReceipt, f.name);
  };
  reader.readAsDataURL(f);
  input.value = "";
}

function removeReceipt() {
  pendingReceipt = "";
  pendingReceiptFileName = null;
  renderReceiptPreview(null, null);
}

function saveReceipt() {
  var poId = Number(document.getElementById("receiptPoId").value);
  var po = purchaseOrders.find(function (x) { return x.id === poId; });
  if (!po) return;
  var receiptNumber = document.getElementById("receiptNumber").value.trim();
  var oldReceipt = po.receipt_url || "";

  var receiptOp;
  if (pendingReceipt === null) {
    receiptOp = Promise.resolve(undefined);
  } else if (pendingReceipt === "") {
    receiptOp = Promise.resolve(null);
  } else if (typeof pendingReceipt === "string" && pendingReceipt.indexOf("data:") === 0) {
    receiptOp = uploadDataUrlToStorage("product-images", pendingReceipt);
  } else {
    receiptOp = Promise.resolve(undefined);
  }

  receiptOp.then(function (newUrl) {
    var payload = { receipt_number: receiptNumber || null };
    if (newUrl !== undefined) payload.receipt_url = newUrl;
    return fetch(SUPABASE_URL + "/rest/v1/purchase_orders?id=eq." + poId, {
      method: "PATCH",
      headers: supabaseHeaders,
      body: JSON.stringify(payload),
    });
  }).then(function (res) {
    if (!res.ok) throw new Error("Receipt save failed");
    if (pendingReceipt !== null && oldReceipt && typeof deleteProductImagesFromStorage === "function") {
      deleteProductImagesFromStorage([oldReceipt]).catch(function (e) { console.warn(e); });
    }
    return reloadPOs();
  }).then(function () {
    closeModalById("receiptModal");
    applyFilters();
    if (typeof showToast === "function") showToast("บันทึกใบเสร็จแล้ว", "success");
  }).catch(function (err) {
    console.error(err);
    if (typeof showToast === "function") showToast("บันทึกไม่สำเร็จ", "error");
  });
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

  // Load app mode ก่อน render ครั้งแรก
  var modePromise = (typeof isProductionMode === "function") ? isProductionMode() : Promise.resolve(false);
  modePromise.then(function (isProd) {
    _appModeIsProduction = isProd;
  }).then(function () { return reloadPOs(); })
    .then(function () { applyFilters(); })
    .catch(function (err) { console.error(err); applyFilters(); });
});
