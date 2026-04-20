// ============================================================
// invoices.js — Invoices (Supabase, links SO → Customer)
// ============================================================

var invoices = [];
var allSOs = [];
var allCustomers = [];

function fmtMoney(n) { return "฿" + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function getStatusBadge(status) {
  switch (status) {
    case "paid":      return '<span class="badge badge-active">Paid</span>';
    case "unpaid":    return '<span class="badge" style="background-color:#fef3c7;color:#f59e0b;">Unpaid</span>';
    case "overdue":   return '<span class="badge badge-inactive">Overdue</span>';
    case "cancelled": return '<span class="badge" style="background-color:#e2e8f0;color:#64748b;">Cancelled</span>';
    default: return '<span class="badge">' + status + '</span>';
  }
}

function updateStats() {
  document.getElementById("statAll").textContent = invoices.length;
  document.getElementById("statPaid").textContent = invoices.filter(function (inv) { return inv.status === "paid"; }).length;
  document.getElementById("statUnpaid").textContent = invoices.filter(function (inv) { return inv.status === "unpaid"; }).length;
  document.getElementById("statOverdue").textContent = invoices.filter(function (inv) { return inv.status === "overdue"; }).length;
}

function renderTable(data) {
  updateStats();
  var tbody = document.getElementById("invoiceTableBody");
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:30px;color:#94a3b8;font-size:11px;">ยังไม่มีใบแจ้งหนี้</td></tr>';
    lucide.createIcons();
    return;
  }
  tbody.innerHTML = data.map(function (inv, i) {
    var soRef = inv.sales_orders ? inv.sales_orders.so_number : "—";
    var customer = inv.customers ? inv.customers.name : "—";
    return '<tr>' +
      '<td>' + (i + 1) + '</td>' +
      '<td><strong>' + inv.invoice_number + '</strong></td>' +
      '<td>' + soRef + '</td>' +
      '<td>' + customer + '</td>' +
      '<td>' + (inv.date || "—") + '</td>' +
      '<td>' + (inv.due_date || "—") + '</td>' +
      '<td>' + fmtMoney(inv.amount) + '</td>' +
      '<td>' + getStatusBadge(inv.status) + '</td>' +
      '<td><div class="table-actions">' +
        '<button class="btn-icon-sm" onclick="editInvoice(' + inv.id + ')"><i data-lucide="pencil"></i></button>' +
        '<button class="btn-icon-sm btn-danger" onclick="deleteInvoice(' + inv.id + ')"><i data-lucide="trash-2"></i></button>' +
      '</div></td>' +
    '</tr>';
  }).join("");
  lucide.createIcons();
  if (typeof refreshSortableHeaders === "function") refreshSortableHeaders();
}

function generateInvoiceNumber() {
  var year = new Date().getFullYear();
  var prefix = "INV-" + year + "-";
  var maxNum = 0;
  invoices.forEach(function (inv) {
    if (inv.invoice_number && inv.invoice_number.indexOf(prefix) === 0) {
      var n = parseInt(inv.invoice_number.slice(prefix.length), 10);
      if (n > maxNum) maxNum = n;
    }
  });
  return prefix + String(maxNum + 1).padStart(3, "0");
}

function populateSODropdown(selectedId) {
  var sel = document.getElementById("inputSO");
  var html = '<option value="">— ไม่อิง SO —</option>';
  allSOs.forEach(function (so) {
    if (so.status === "cancelled") return;
    html += '<option value="' + so.id + '">' + so.so_number + (so.customers ? ' — ' + so.customers.name : '') + '</option>';
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

function onSOChange() {
  var soId = Number(document.getElementById("inputSO").value);
  if (!soId) return;
  var so = allSOs.find(function (s) { return s.id === soId; });
  if (!so) return;
  if (so.customer_id) document.getElementById("inputCustomer").value = String(so.customer_id);
  if (so.total) document.getElementById("inputAmount").value = so.total;
}

function openInvoiceModal(title, inv) {
  if (!allCustomers.length) { alertMsg("ยังไม่มีลูกค้า", "กรุณาเพิ่มลูกค้าก่อน"); return; }
  document.getElementById("modalTitle").textContent = title;
  document.getElementById("editId").value = inv ? inv.id : "";
  document.getElementById("inputInvoiceNumber").value = inv ? inv.invoice_number : generateInvoiceNumber();
  document.getElementById("inputDate").value = inv ? inv.date : new Date().toISOString().slice(0, 10);
  document.getElementById("inputDueDate").value = inv ? inv.due_date : "";
  document.getElementById("inputAmount").value = inv ? inv.amount : "";
  document.getElementById("inputStatus").value = inv ? inv.status : "unpaid";
  document.getElementById("inputNote").value = inv ? (inv.note || "") : "";
  populateSODropdown(inv ? inv.so_id : null);
  populateCustomerDropdown(inv ? inv.customer_id : null);
  openModalById("invoiceModal");
}

function alertMsg(title, message) {
  if (typeof showConfirm === "function") {
    showConfirm({ title: title, message: message, okText: "OK", okColor: "#47b8b4", onConfirm: function () {} });
  }
}

function saveInvoice() {
  var id = document.getElementById("editId").value;
  var invNumber = document.getElementById("inputInvoiceNumber").value.trim();
  var soId = Number(document.getElementById("inputSO").value) || null;
  var customerId = Number(document.getElementById("inputCustomer").value) || null;
  var date = document.getElementById("inputDate").value;
  var dueDate = document.getElementById("inputDueDate").value || null;
  var amount = parseFloat(document.getElementById("inputAmount").value) || 0;
  var status = document.getElementById("inputStatus").value;
  var note = document.getElementById("inputNote").value.trim();

  if (!customerId) { alertMsg("ไม่ครบถ้วน", "กรุณาเลือกลูกค้า"); return; }
  if (!date) return document.getElementById("inputDate").focus();
  if (!amount) return document.getElementById("inputAmount").focus();

  var payload = {
    invoice_number: invNumber,
    so_id: soId,
    customer_id: customerId,
    date: date,
    due_date: dueDate,
    amount: amount,
    status: status,
    note: note || null,
  };

  var op = id ? updateInvoiceDB(Number(id), payload) : createInvoiceDB(payload);
  op.then(function () { return reloadInvoices(); })
    .then(function () {
      closeModalById("invoiceModal");
      applyFilters();
    })
    .catch(function (err) { console.error(err); alertMsg("เกิดข้อผิดพลาด", err.message || "บันทึกไม่สำเร็จ"); });
}

function editInvoice(id) {
  var inv = invoices.find(function (x) { return x.id === id; });
  if (inv) openInvoiceModal("Edit Invoice", inv);
}

function deleteInvoice(id) {
  var inv = invoices.find(function (x) { return x.id === id; });
  if (!inv) return;
  showConfirm({
    title: "Confirm Delete",
    message: "ต้องการลบใบแจ้งหนี้ <strong>" + inv.invoice_number + "</strong> ใช่ไหม?",
    okText: "Delete",
    okColor: "#ef4444",
    onConfirm: function () {
      deleteInvoiceDB(id)
        .then(function () { return reloadInvoices(); })
        .then(function () { applyFilters(); })
        .catch(function (err) { console.error(err); });
    },
  });
}

var currentFilter = "all";
var currentSort = "default";

function getFilteredData() {
  var keyword = document.querySelector(".filter-search-input").value.toLowerCase();
  var data = invoices.slice();
  if (currentFilter !== "all") data = data.filter(function (inv) { return inv.status === currentFilter; });
  if (keyword) {
    data = data.filter(function (inv) {
      var soRef = inv.sales_orders ? inv.sales_orders.so_number.toLowerCase() : "";
      var cName = inv.customers ? inv.customers.name.toLowerCase() : "";
      return (inv.invoice_number || "").toLowerCase().includes(keyword) || soRef.includes(keyword) || cName.includes(keyword);
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
    typeof fetchSalesOrdersDB === "function" ? fetchSalesOrdersDB() : Promise.resolve([]),
    typeof fetchInvoicesDB === "function" ? fetchInvoicesDB() : Promise.resolve([]),
  ]).then(function (res) {
    allCustomers = (res[0] || []).map(function (c) { return { id: c.id, name: c.name || "", status: c.status || "active" }; });
    allSOs = (res[1] || []).map(function (so) {
      return {
        id: so.id, so_number: so.so_number, customer_id: so.customer_id, total: Number(so.total) || 0, status: so.status,
        customers: so.customers || null,
      };
    });
    invoices = (res[2] || []).map(normalizeInvoice);
  });
}

function reloadInvoices() {
  return (typeof fetchInvoicesDB === "function" ? fetchInvoicesDB() : Promise.resolve([]))
    .then(function (rows) { invoices = (rows || []).map(normalizeInvoice); });
}

function normalizeInvoice(inv) {
  return {
    id: inv.id,
    invoice_number: inv.invoice_number || "",
    so_id: inv.so_id,
    customer_id: inv.customer_id,
    date: inv.date || "",
    due_date: inv.due_date || "",
    amount: Number(inv.amount) || 0,
    paid_amount: Number(inv.paid_amount) || 0,
    status: inv.status || "unpaid",
    note: inv.note || "",
    customers: inv.customers || null,
    sales_orders: inv.sales_orders || null,
  };
}

if (typeof registerRandomFill === "function") {
  registerRandomFill({
    target: "#invoiceModal",
    fill: function () {
      // invoice_number is readonly / auto-generated — skip
      pickRandomSelectOption("inputSO", { includeEmpty: true });
      // trigger onSOChange to auto-fill customer/amount if SO picked
      if (typeof onSOChange === "function") {
        try { onSOChange(); } catch (e) {}
      }
      var custSel = document.getElementById("inputCustomer");
      if (custSel && !custSel.value) pickRandomSelectOption("inputCustomer");
      var date = randomPastDate(30);
      setFieldValue("inputDate", date);
      // due date ~30 days after invoice date
      var d = new Date(date);
      d.setDate(d.getDate() + rdInt(7, 45));
      setFieldValue("inputDueDate", d.toISOString().slice(0, 10));
      var amtEl = document.getElementById("inputAmount");
      if (amtEl && !amtEl.value) setFieldValue("inputAmount", randomMoney(500, 50000));
      pickRandomSelectOption("inputStatus");
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

  document.getElementById("addInvoiceBtn").addEventListener("click", function () {
    openInvoiceModal("Create Invoice", null);
  });

  reloadAll()
    .then(function () { applyFilters(); })
    .catch(function (err) { console.error(err); applyFilters(); });
});
