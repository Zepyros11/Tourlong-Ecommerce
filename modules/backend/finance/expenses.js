// ============================================================
// expenses.js — Expenses (Supabase)
// ============================================================

var expenses = [];
var allBankAccounts = [];

function fmtMoney(n) { return "฿" + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function getStatusBadge(status) {
  switch (status) {
    case "paid":   return '<span class="badge badge-active">Paid</span>';
    case "unpaid": return '<span class="badge" style="background-color:#fef3c7;color:#f59e0b;">Unpaid</span>';
    default: return '<span class="badge">' + status + '</span>';
  }
}

function updateStats() {
  document.getElementById("statAll").textContent = expenses.length;
  document.getElementById("statPaid").textContent = expenses.filter(function (exp) { return exp.status === "paid"; }).length;
  document.getElementById("statUnpaid").textContent = expenses.filter(function (exp) { return exp.status === "unpaid"; }).length;
}

function renderTable(data) {
  updateStats();
  var tbody = document.getElementById("expenseTableBody");
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;color:#94a3b8;font-size:11px;">ยังไม่มีรายจ่าย</td></tr>';
    lucide.createIcons();
    return;
  }
  tbody.innerHTML = data.map(function (exp, i) {
    return '<tr>' +
      '<td>' + (i + 1) + '</td>' +
      '<td>' + (exp.date || "—") + '</td>' +
      '<td>' + (exp.description || "") + '</td>' +
      '<td>' + (exp.category || "—") + '</td>' +
      '<td>' + fmtMoney(exp.amount) + '</td>' +
      '<td>' + getStatusBadge(exp.status) + '</td>' +
      '<td><div class="table-actions">' +
        '<button class="btn-icon-sm" onclick="editExpense(' + exp.id + ')"><i data-lucide="pencil"></i></button>' +
        '<button class="btn-icon-sm btn-danger" onclick="deleteExpense(' + exp.id + ')"><i data-lucide="trash-2"></i></button>' +
      '</div></td>' +
    '</tr>';
  }).join("");
  lucide.createIcons();
  if (typeof refreshSortableHeaders === "function") refreshSortableHeaders();
}

function populateBankAccountDropdown(selectedId) {
  var sel = document.getElementById("inputBankAccount");
  var html = '<option value="">— ไม่ระบุบัญชี —</option>';
  allBankAccounts.forEach(function (b) {
    if (b.status === "inactive") return;
    html += '<option value="' + b.id + '">' + b.bank + ' — ' + b.account_name + '</option>';
  });
  sel.innerHTML = html;
  if (selectedId) sel.value = String(selectedId);
}

function openExpenseModal(title, exp) {
  document.getElementById("modalTitle").textContent = title;
  document.getElementById("editId").value = exp ? exp.id : "";
  document.getElementById("inputDate").value = exp ? exp.date : new Date().toISOString().slice(0, 10);
  document.getElementById("inputDesc").value = exp ? (exp.description || "") : "";
  document.getElementById("inputCategory").value = exp ? exp.category : "จัดซื้อ";
  document.getElementById("inputAmount").value = exp ? exp.amount : "";
  document.getElementById("inputStatus").value = exp ? exp.status : "unpaid";
  document.getElementById("inputNote").value = exp ? (exp.note || "") : "";
  populateBankAccountDropdown(exp ? exp.bank_account_id : null);
  openModalById("expenseModal", function () { document.getElementById("inputDesc").focus(); });
}

function saveExpense() {
  var id = document.getElementById("editId").value;
  var date = document.getElementById("inputDate").value;
  var description = document.getElementById("inputDesc").value.trim();
  var amount = parseFloat(document.getElementById("inputAmount").value) || 0;

  if (!date) return document.getElementById("inputDate").focus();
  if (!description) return document.getElementById("inputDesc").focus();
  if (!amount) return document.getElementById("inputAmount").focus();

  var payload = {
    date: date,
    description: description,
    category: document.getElementById("inputCategory").value || null,
    amount: amount,
    bank_account_id: Number(document.getElementById("inputBankAccount").value) || null,
    status: document.getElementById("inputStatus").value,
    note: document.getElementById("inputNote").value.trim() || null,
  };

  var op = id ? updateExpenseDB(Number(id), payload) : createExpenseDB(payload);
  op.then(function () { return reloadExpenses(); })
    .then(function () {
      closeModalById("expenseModal");
      applyFilters();
    })
    .catch(function (err) { console.error(err); });
}

function editExpense(id) {
  var exp = expenses.find(function (x) { return x.id === id; });
  if (exp) openExpenseModal("Edit Expense", exp);
}

function deleteExpense(id) {
  var exp = expenses.find(function (x) { return x.id === id; });
  if (!exp) return;
  showConfirm({
    title: "Confirm Delete",
    message: "ต้องการลบรายจ่าย <strong>" + exp.description + "</strong> ใช่ไหม?",
    okText: "Delete",
    okColor: "#ef4444",
    onConfirm: function () {
      deleteExpenseDB(id)
        .then(function () { return reloadExpenses(); })
        .then(function () { applyFilters(); })
        .catch(function (err) { console.error(err); });
    },
  });
}

var currentFilter = "all";
var currentSort = "default";

function getFilteredData() {
  var keyword = document.querySelector(".filter-search-input").value.toLowerCase();
  var data = expenses.slice();
  if (currentFilter !== "all") data = data.filter(function (exp) { return exp.status === currentFilter; });
  if (keyword) {
    data = data.filter(function (exp) {
      return (exp.description || "").toLowerCase().includes(keyword) ||
             (exp.category || "").toLowerCase().includes(keyword);
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

function reloadExpenses() {
  return Promise.all([
    typeof fetchBankAccountsDB === "function" ? fetchBankAccountsDB() : Promise.resolve([]),
    typeof fetchExpensesDB === "function" ? fetchExpensesDB() : Promise.resolve([]),
  ]).then(function (res) {
    allBankAccounts = (res[0] || []).map(function (b) { return { id: b.id, bank: b.bank || "", account_name: b.account_name || "", status: b.status || "active" }; });
    expenses = (res[1] || []).map(function (r) {
      return {
        id: r.id,
        date: r.date || "",
        description: r.description || "",
        category: r.category || "",
        amount: Number(r.amount) || 0,
        bank_account_id: r.bank_account_id,
        status: r.status || "unpaid",
        note: r.note || "",
        bank_accounts: r.bank_accounts || null,
      };
    });
  });
}

if (typeof registerRandomFill === "function") {
  registerRandomFill({
    target: "#expenseModal",
    fill: function () {
      setFieldValue("inputDate", randomPastDate(30));
      setFieldValue("inputDesc", randomNote());
      setFieldValue("inputCategory", rdPick(["จัดซื้อ", "ขนส่ง", "สำนักงาน", "สาธารณูปโภค", "เงินเดือน", "การตลาด", "อื่นๆ"]));
      setFieldValue("inputAmount", randomMoney(100, 5000));
      pickRandomSelectOption("inputBankAccount", { includeEmpty: true });
      setFieldValue("inputStatus", rdPick(["paid", "unpaid"]));
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

  document.getElementById("addExpenseBtn").addEventListener("click", function () {
    openExpenseModal("Add Expense", null);
  });

  reloadExpenses()
    .then(function () { applyFilters(); })
    .catch(function (err) { console.error(err); applyFilters(); });
});
