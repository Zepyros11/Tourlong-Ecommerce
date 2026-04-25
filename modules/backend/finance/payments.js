// ============================================================
// payments.js — Payments (Supabase, 2-way direction)
// Auto-sync invoices.paid_amount + status via DB trigger
// ============================================================

var payments = [];
var allInvoices = [];
var allPOs = [];
var allSOs = [];
var allCustomers = [];
var allSuppliers = [];
var allBankAccounts = [];

function fmtMoney(n) { return "฿" + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function getStatusBadge(status) {
  switch (status) {
    case "completed": return '<span class="badge badge-active">Completed</span>';
    case "pending":   return '<span class="badge" style="background-color:#fef3c7;color:#f59e0b;">Pending</span>';
    case "cancelled": return '<span class="badge badge-inactive">Cancelled</span>';
    default: return '<span class="badge">' + status + '</span>';
  }
}

function getDirectionBadge(dir) {
  if (dir === "incoming") return '<span style="display:inline-block;padding:2px 8px;border-radius:9999px;font-size:9px;font-weight:700;background:#ecfdf5;color:#10b981;">⬇ Incoming</span>';
  return '<span style="display:inline-block;padding:2px 8px;border-radius:9999px;font-size:9px;font-weight:700;background:#fef2f2;color:#ef4444;">⬆ Outgoing</span>';
}

function getSourceBadge(source) {
  if (source === "so") return '<span title="Auto-created จาก SO" style="display:inline-block;padding:1px 6px;border-radius:9999px;font-size:9px;font-weight:600;background:#eff6ff;color:#2563eb;margin-left:4px;">AUTO·SO</span>';
  if (source === "po") return '<span title="Auto-created จาก PO" style="display:inline-block;padding:1px 6px;border-radius:9999px;font-size:9px;font-weight:600;background:#fef3c7;color:#b45309;margin-left:4px;">AUTO·PO</span>';
  return "";
}

function updateStats() {
  document.getElementById("statAll").textContent = payments.length;
  document.getElementById("statCompleted").textContent = payments.filter(function (p) { return p.status === "completed"; }).length;
  document.getElementById("statPending").textContent = payments.filter(function (p) { return p.status === "pending"; }).length;
}

function renderTable(data) {
  updateStats();
  var tbody = document.getElementById("paymentTableBody");
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:30px;color:#94a3b8;font-size:11px;">ยังไม่มีรายการชำระเงิน</td></tr>';
    lucide.createIcons();
    return;
  }
  tbody.innerHTML = data.map(function (p, i) {
    var ref = "—";
    var party = "—";
    if (p.direction === "incoming") {
      if (p.invoices) ref = p.invoices.invoice_number;
      else if (p.sales_orders) ref = p.sales_orders.so_number;
      party = p.customers ? p.customers.name : "—";
    } else {
      ref = p.purchase_orders ? p.purchase_orders.po_number : "—";
      party = p.suppliers ? p.suppliers.name : "—";
    }
    return '<tr>' +
      '<td>' + (i + 1) + '</td>' +
      '<td>' + (p.date || "—") + '</td>' +
      '<td>' + getDirectionBadge(p.direction) + getSourceBadge(p.source) + '</td>' +
      '<td>' + ref + '</td>' +
      '<td>' + party + '</td>' +
      '<td>' + (p.method || "—") + '</td>' +
      '<td>' + fmtMoney(p.amount) + '</td>' +
      '<td>' + getStatusBadge(p.status) + '</td>' +
      '<td><div class="table-actions">' +
        '<button class="btn-icon-sm" onclick="editPayment(' + p.id + ')"><i data-lucide="pencil"></i></button>' +
        '<button class="btn-icon-sm btn-danger" onclick="deletePayment(' + p.id + ')"><i data-lucide="trash-2"></i></button>' +
      '</div></td>' +
    '</tr>';
  }).join("");
  lucide.createIcons();
  if (typeof refreshSortableHeaders === "function") refreshSortableHeaders();
}

function generatePaymentNumber() {
  var year = new Date().getFullYear();
  var prefix = "PAY-" + year + "-";
  var maxNum = 0;
  payments.forEach(function (p) {
    if (p.payment_number && p.payment_number.indexOf(prefix) === 0) {
      var n = parseInt(p.payment_number.slice(prefix.length), 10);
      if (n > maxNum) maxNum = n;
    }
  });
  return prefix + String(maxNum + 1).padStart(3, "0");
}

// ============ Dropdowns ============
function populateInvoiceDropdown(selectedId) {
  var sel = document.getElementById("inputInvoice");
  var html = '<option value="">— ไม่อิง Invoice —</option>';
  allInvoices.forEach(function (inv) {
    if (inv.status === "cancelled") return;
    var due = inv.amount - inv.paid_amount;
    html += '<option value="' + inv.id + '" data-amount="' + due + '" data-customer="' + (inv.customer_id || "") + '">' + inv.invoice_number + ' — ' + (inv.customers ? inv.customers.name : "") + ' (ค้าง ' + due.toLocaleString() + ')</option>';
  });
  sel.innerHTML = html;
  if (selectedId) sel.value = String(selectedId);
}

function populatePODropdown(selectedId) {
  var sel = document.getElementById("inputPO");
  var html = '<option value="">— ไม่อิง PO —</option>';
  allPOs.forEach(function (po) {
    if (po.status === "cancelled") return;
    html += '<option value="' + po.id + '" data-amount="' + po.total + '" data-supplier="' + (po.supplier_id || "") + '">' + po.po_number + ' — ' + (po.suppliers ? po.suppliers.name : "") + ' (' + Number(po.total).toLocaleString() + ')</option>';
  });
  sel.innerHTML = html;
  if (selectedId) sel.value = String(selectedId);
}

function populateSODropdown(selectedId) {
  var sel = document.getElementById("inputSO");
  if (!sel) return;
  var html = '<option value="">— ไม่อิง SO —</option>';
  allSOs.forEach(function (so) {
    if (so.status === "cancelled") return;
    html += '<option value="' + so.id + '" data-amount="' + so.total + '" data-customer="' + (so.customer_id || "") + '">' + so.so_number + ' — ' + (so.customers ? so.customers.name : "") + ' (' + Number(so.total).toLocaleString() + ')</option>';
  });
  sel.innerHTML = html;
  if (selectedId) sel.value = String(selectedId);
}

function populateCustomerDropdown(selectedId) {
  var sel = document.getElementById("inputCustomer");
  var html = '<option value="">— เลือกลูกค้า —</option>';
  allCustomers.forEach(function (c) {
    if (c.status === "inactive") return;
    html += '<option value="' + c.id + '">' + c.name + '</option>';
  });
  sel.innerHTML = html;
  if (selectedId) sel.value = String(selectedId);
}

function populateSupplierDropdown(selectedId) {
  var sel = document.getElementById("inputSupplier");
  var html = '<option value="">— เลือกผู้ขาย —</option>';
  allSuppliers.forEach(function (s) {
    if (s.status === "inactive") return;
    html += '<option value="' + s.id + '">' + s.name + '</option>';
  });
  sel.innerHTML = html;
  if (selectedId) sel.value = String(selectedId);
}

function populateBankAccountDropdown(selectedId) {
  var sel = document.getElementById("inputBankAccount");
  var html = '<option value="">— เลือกบัญชี —</option>';
  allBankAccounts.forEach(function (b) {
    if (b.status === "inactive") return;
    html += '<option value="' + b.id + '">' + b.bank + ' — ' + b.account_name + '</option>';
  });
  sel.innerHTML = html;
  if (selectedId) sel.value = String(selectedId);
}

// ============ Form Interactions ============
function onDirectionChange() {
  var dir = document.getElementById("inputDirection").value;
  document.getElementById("incomingFields").style.display = dir === "incoming" ? "block" : "none";
  document.getElementById("outgoingFields").style.display = dir === "outgoing" ? "block" : "none";
}

function onInvoiceChange() {
  var sel = document.getElementById("inputInvoice");
  var opt = sel.options[sel.selectedIndex];
  if (!opt || !opt.value) return;
  var amount = Number(opt.getAttribute("data-amount")) || 0;
  var custId = opt.getAttribute("data-customer");
  if (amount > 0) document.getElementById("inputAmount").value = amount;
  if (custId) document.getElementById("inputCustomer").value = custId;
}

function onPOChange() {
  var sel = document.getElementById("inputPO");
  var opt = sel.options[sel.selectedIndex];
  if (!opt || !opt.value) return;
  var amount = Number(opt.getAttribute("data-amount")) || 0;
  var supId = opt.getAttribute("data-supplier");
  if (amount > 0) document.getElementById("inputAmount").value = amount;
  if (supId) document.getElementById("inputSupplier").value = supId;
}

function onSOChange() {
  var sel = document.getElementById("inputSO");
  if (!sel) return;
  var opt = sel.options[sel.selectedIndex];
  if (!opt || !opt.value) return;
  var amount = Number(opt.getAttribute("data-amount")) || 0;
  var custId = opt.getAttribute("data-customer");
  if (amount > 0) document.getElementById("inputAmount").value = amount;
  if (custId) document.getElementById("inputCustomer").value = custId;
}

function openPaymentModal(title, p) {
  if (!allBankAccounts.length) { alertMsg("ยังไม่มีบัญชีธนาคาร", "กรุณาเพิ่มบัญชีก่อน"); return; }
  document.getElementById("modalTitle").textContent = title;
  document.getElementById("editId").value = p ? p.id : "";
  document.getElementById("inputPaymentNumber").value = p ? p.payment_number : generatePaymentNumber();
  document.getElementById("inputDate").value = p ? p.date : new Date().toISOString().slice(0, 10);
  document.getElementById("inputDirection").value = p ? p.direction : "incoming";
  document.getElementById("inputMethod").value = p ? (p.method || "โอนธนาคาร") : "โอนธนาคาร";
  document.getElementById("inputAmount").value = p ? p.amount : "";
  document.getElementById("inputStatus").value = p ? p.status : "completed";
  document.getElementById("inputNote").value = p ? (p.note || "") : "";

  populateInvoiceDropdown(p ? p.invoice_id : null);
  populateSODropdown(p ? p.so_id : null);
  populatePODropdown(p ? p.po_id : null);
  populateCustomerDropdown(p ? p.customer_id : null);
  populateSupplierDropdown(p ? p.supplier_id : null);
  populateBankAccountDropdown(p ? p.bank_account_id : null);

  onDirectionChange();
  openModalById("paymentModal");
}

function alertMsg(title, message) {
  if (typeof showConfirm === "function") {
    showConfirm({ title: title, message: message, okText: "OK", okColor: "#47b8b4", onConfirm: function () {} });
  }
}

function savePayment() {
  var id = document.getElementById("editId").value;
  var paymentNumber = document.getElementById("inputPaymentNumber").value.trim();
  var direction = document.getElementById("inputDirection").value;
  var date = document.getElementById("inputDate").value;
  var amount = parseFloat(document.getElementById("inputAmount").value) || 0;
  var status = document.getElementById("inputStatus").value;
  var method = document.getElementById("inputMethod").value;
  var bankAccountId = Number(document.getElementById("inputBankAccount").value) || null;
  var note = document.getElementById("inputNote").value.trim();

  if (!date) return document.getElementById("inputDate").focus();
  if (!amount) return document.getElementById("inputAmount").focus();

  var payload = {
    payment_number: paymentNumber,
    direction: direction,
    date: date,
    amount: amount,
    status: status,
    method: method || null,
    bank_account_id: bankAccountId,
    note: note || null,
    invoice_id: null,
    so_id: null,
    customer_id: null,
    po_id: null,
    supplier_id: null,
  };
  if (direction === "incoming") {
    payload.invoice_id = Number(document.getElementById("inputInvoice").value) || null;
    var soEl = document.getElementById("inputSO");
    payload.so_id = soEl ? (Number(soEl.value) || null) : null;
    payload.customer_id = Number(document.getElementById("inputCustomer").value) || null;
  } else {
    payload.po_id = Number(document.getElementById("inputPO").value) || null;
    payload.supplier_id = Number(document.getElementById("inputSupplier").value) || null;
  }

  var op = id ? updatePaymentDB(Number(id), payload) : createPaymentDB(payload);
  op.then(function () { return reloadAll(); })
    .then(function () {
      closeModalById("paymentModal");
      applyFilters();
    })
    .catch(function (err) { console.error(err); alertMsg("เกิดข้อผิดพลาด", err.message || "บันทึกไม่สำเร็จ"); });
}

function editPayment(id) {
  var p = payments.find(function (x) { return x.id === id; });
  if (p) openPaymentModal("Edit Payment", p);
}

function deletePayment(id) {
  var p = payments.find(function (x) { return x.id === id; });
  if (!p) return;
  showConfirm({
    title: "Confirm Delete",
    message: "ต้องการลบรายการชำระ <strong>" + p.payment_number + "</strong> ใช่ไหม?",
    okText: "Delete",
    okColor: "#ef4444",
    onConfirm: function () {
      deletePaymentDB(id)
        .then(function () { return reloadAll(); })
        .then(function () { applyFilters(); })
        .catch(function (err) { console.error(err); });
    },
  });
}

var currentFilter = "all";
var currentSort = "default";

function getFilteredData() {
  var keyword = document.querySelector(".filter-search-input").value.toLowerCase();
  var data = payments.slice();
  if (currentFilter !== "all") data = data.filter(function (p) { return p.status === currentFilter; });
  if (keyword) {
    data = data.filter(function (p) {
      var ref = "";
      var party = "";
      if (p.direction === "incoming") {
        if (p.invoices) ref = p.invoices.invoice_number.toLowerCase();
        else if (p.sales_orders) ref = p.sales_orders.so_number.toLowerCase();
        party = p.customers ? p.customers.name.toLowerCase() : "";
      } else {
        ref = p.purchase_orders ? p.purchase_orders.po_number.toLowerCase() : "";
        party = p.suppliers ? p.suppliers.name.toLowerCase() : "";
      }
      return (p.payment_number || "").toLowerCase().includes(keyword) || ref.includes(keyword) || party.includes(keyword) || (p.method || "").toLowerCase().includes(keyword);
    });
  }
  switch (currentSort) {
    case "date-desc":   data = data.slice().sort(function (a, b) { return (b.date || "").localeCompare(a.date || ""); }); break;
    case "date-asc":    data = data.slice().sort(function (a, b) { return (a.date || "").localeCompare(b.date || ""); }); break;
    case "amount-desc": data = data.slice().sort(function (a, b) { return Number(b.amount) - Number(a.amount); }); break;
    case "amount-asc":  data = data.slice().sort(function (a, b) { return Number(a.amount) - Number(b.amount); }); break;
  }
  return data;
}

function applyFilters() { renderTable(getFilteredData()); }

function reloadAll() {
  return Promise.all([
    typeof fetchCustomersDB === "function" ? fetchCustomersDB() : Promise.resolve([]),
    typeof fetchSuppliersDB === "function" ? fetchSuppliersDB() : Promise.resolve([]),
    typeof fetchBankAccountsDB === "function" ? fetchBankAccountsDB() : Promise.resolve([]),
    typeof fetchInvoicesDB === "function" ? fetchInvoicesDB() : Promise.resolve([]),
    typeof fetchPurchaseOrdersDB === "function" ? fetchPurchaseOrdersDB() : Promise.resolve([]),
    typeof fetchPaymentsDB === "function" ? fetchPaymentsDB() : Promise.resolve([]),
    typeof fetchSalesOrdersDB === "function" ? fetchSalesOrdersDB() : Promise.resolve([]),
  ]).then(function (res) {
    allCustomers = (res[0] || []).map(function (c) { return { id: c.id, name: c.name || "", status: c.status || "active" }; });
    allSuppliers = (res[1] || []).map(function (s) { return { id: s.id, name: s.name || "", status: s.status || "active" }; });
    allBankAccounts = (res[2] || []).map(function (b) { return { id: b.id, bank: b.bank || "", account_name: b.account_name || "", status: b.status || "active" }; });
    allInvoices = (res[3] || []).map(function (inv) {
      return { id: inv.id, invoice_number: inv.invoice_number, customer_id: inv.customer_id,
               amount: Number(inv.amount) || 0, paid_amount: Number(inv.paid_amount) || 0, status: inv.status,
               customers: inv.customers || null };
    });
    allPOs = (res[4] || []).map(function (po) {
      return { id: po.id, po_number: po.po_number, supplier_id: po.supplier_id,
               total: Number(po.total) || 0, status: po.status, suppliers: po.suppliers || null };
    });
    payments = (res[5] || []).map(normalizePayment);
    allSOs = (res[6] || []).map(function (so) {
      return { id: so.id, so_number: so.so_number, customer_id: so.customer_id,
               total: Number(so.total) || 0, status: so.status, customers: so.customers || null };
    });
  });
}

function normalizePayment(p) {
  return {
    id: p.id,
    payment_number: p.payment_number || "",
    direction: p.direction,
    date: p.date || "",
    invoice_id: p.invoice_id,
    so_id: p.so_id,
    customer_id: p.customer_id,
    po_id: p.po_id,
    supplier_id: p.supplier_id,
    bank_account_id: p.bank_account_id,
    method: p.method || "",
    amount: Number(p.amount) || 0,
    status: p.status || "completed",
    source: p.source || "manual",
    note: p.note || "",
    invoices: p.invoices || null,
    sales_orders: p.sales_orders || null,
    customers: p.customers || null,
    purchase_orders: p.purchase_orders || null,
    suppliers: p.suppliers || null,
    bank_accounts: p.bank_accounts || null,
  };
}

if (typeof registerRandomFill === "function") {
  registerRandomFill({
    target: "#paymentModal",
    fill: function () {
      setFieldValue("inputDate", randomPastDate(30));
      var direction = rdPick(["incoming", "outgoing"]);
      var dirEl = document.getElementById("inputDirection");
      if (dirEl) { dirEl.value = direction; if (typeof onDirectionChange === "function") onDirectionChange(); }
      if (direction === "incoming") {
        pickRandomSelectOption("inputInvoice", { includeEmpty: true });
        pickRandomSelectOption("inputSO", { includeEmpty: true });
        pickRandomSelectOption("inputCustomer");
      } else {
        pickRandomSelectOption("inputPO", { includeEmpty: true });
        pickRandomSelectOption("inputSupplier");
      }
      pickRandomSelectOption("inputBankAccount");
      setFieldValue("inputMethod", rdPick(["โอนธนาคาร", "เงินสด", "บัตรเครดิต", "เช็ค"]));
      setFieldValue("inputAmount", randomMoney(500, 20000));
      setFieldValue("inputStatus", rdPick(["completed", "pending", "cancelled"]));
      setFieldValue("inputNote", randomNote());
    },
  });
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

  document.getElementById("addPaymentBtn").addEventListener("click", function () {
    openPaymentModal("Add Payment", null);
  });

  reloadAll()
    .then(function () { applyFilters(); })
    .catch(function (err) { console.error(err); applyFilters(); });
});
