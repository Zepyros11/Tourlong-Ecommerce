// ============================================================
// bank-accounts.js — Bank Accounts (Supabase)
// ============================================================

var accounts = [];

function fmtMoney(n) { return "฿" + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function updateStats() {
  document.getElementById("statAll").textContent = accounts.length;
  var totalBalance = accounts.reduce(function (sum, a) { return sum + Number(a.balance || 0); }, 0);
  document.getElementById("statBalance").textContent = fmtMoney(totalBalance);
}

function renderTable(data) {
  updateStats();
  var tbody = document.getElementById("accountTableBody");
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;color:#94a3b8;font-size:11px;">ยังไม่มีบัญชีธนาคาร</td></tr>';
    lucide.createIcons();
    return;
  }
  tbody.innerHTML = data.map(function (a, i) {
    return '<tr>' +
      '<td>' + (i + 1) + '</td>' +
      '<td>' + (a.bank || "") + '</td>' +
      '<td>' + (a.account_name || "") + '</td>' +
      '<td>' + (a.account_number || "—") + '</td>' +
      '<td>' + fmtMoney(a.balance) + '</td>' +
      '<td><span class="badge badge-' + (a.status === "active" ? "active" : "inactive") + '">' + (a.status === "active" ? "Active" : "Inactive") + '</span></td>' +
      '<td><div class="table-actions">' +
        '<button class="btn-icon-sm" onclick="editAccount(' + a.id + ')"><i data-lucide="pencil"></i></button>' +
        '<button class="btn-icon-sm btn-danger" onclick="deleteAccount(' + a.id + ')"><i data-lucide="trash-2"></i></button>' +
      '</div></td>' +
    '</tr>';
  }).join("");
  lucide.createIcons();
  if (typeof refreshSortableHeaders === "function") refreshSortableHeaders();
}

function openAccountModal(title, a) {
  document.getElementById("modalTitle").textContent = title;
  document.getElementById("editId").value = a ? a.id : "";
  document.getElementById("inputBank").value = a ? a.bank : "ธนาคารกสิกรไทย";
  document.getElementById("inputAccountName").value = a ? (a.account_name || "") : "";
  document.getElementById("inputAccountNumber").value = a ? (a.account_number || "") : "";
  document.getElementById("inputBalance").value = a ? a.balance : "";
  var active = a ? a.status === "active" : true;
  document.getElementById("inputStatus").checked = active;
  var lbl = document.getElementById("inputStatusLabel");
  if (lbl) { lbl.textContent = active ? "Active" : "Inactive"; lbl.classList.toggle("active-label", active); }
  openModalById("accountModal", function () { document.getElementById("inputAccountName").focus(); });
}

function saveAccount() {
  var id = document.getElementById("editId").value;
  var accountName = document.getElementById("inputAccountName").value.trim();
  if (!accountName) return document.getElementById("inputAccountName").focus();

  var payload = {
    bank: document.getElementById("inputBank").value,
    account_name: accountName,
    account_number: document.getElementById("inputAccountNumber").value.trim() || null,
    balance: Number(document.getElementById("inputBalance").value) || 0,
    status: document.getElementById("inputStatus").checked ? "active" : "inactive",
  };

  var op = id ? updateBankAccountDB(Number(id), payload) : createBankAccountDB(payload);
  op.then(function () { return reloadAccounts(); })
    .then(function () {
      closeModalById("accountModal");
      applyFilters();
    })
    .catch(function (err) { console.error(err); });
}

function editAccount(id) {
  var a = accounts.find(function (x) { return x.id === id; });
  if (a) openAccountModal("Edit Account", a);
}

function deleteAccount(id) {
  var a = accounts.find(function (x) { return x.id === id; });
  if (!a) return;
  showConfirm({
    title: "Confirm Delete",
    message: "ต้องการลบบัญชี <strong>" + a.account_name + " (" + a.bank + ")</strong> ใช่ไหม?",
    okText: "Delete",
    okColor: "#ef4444",
    onConfirm: function () {
      deleteBankAccountDB(id)
        .then(function () { return reloadAccounts(); })
        .then(function () { applyFilters(); })
        .catch(function (err) { console.error(err); });
    },
  });
}

var currentSort = "default";

function getFilteredData() {
  var keyword = document.querySelector(".filter-search-input").value.toLowerCase();
  var data = accounts.slice();

  if (keyword) {
    data = data.filter(function (a) {
      return (a.bank || "").toLowerCase().includes(keyword) ||
             (a.account_name || "").toLowerCase().includes(keyword) ||
             (a.account_number || "").toLowerCase().includes(keyword);
    });
  }

  switch (currentSort) {
    case "name-asc":     data = data.slice().sort(function (a, b) { return (a.account_name || "").localeCompare(b.account_name || ""); }); break;
    case "balance-desc": data = data.slice().sort(function (a, b) { return Number(b.balance) - Number(a.balance); }); break;
    case "balance-asc":  data = data.slice().sort(function (a, b) { return Number(a.balance) - Number(b.balance); }); break;
  }
  return data;
}

function applyFilters() { renderTable(getFilteredData()); }

function reloadAccounts() {
  return (typeof fetchBankAccountsDB === "function" ? fetchBankAccountsDB() : Promise.resolve([]))
    .then(function (rows) {
      accounts = (rows || []).map(function (r) {
        return {
          id: r.id,
          bank: r.bank || "",
          account_name: r.account_name || "",
          account_number: r.account_number || "",
          balance: Number(r.balance) || 0,
          status: r.status || "active",
        };
      });
    });
}

if (typeof registerRandomFill === "function") {
  registerRandomFill({
    target: "#accountModal",
    fill: function () {
      pickRandomSelectOption("inputBank");
      setFieldValue("inputAccountName", randomCompanyName());
      setFieldValue("inputAccountNumber", randomAccountNumber());
      setFieldValue("inputBalance", randomMoney(1000, 500000));
      var sw = document.getElementById("inputStatus");
      if (sw) { sw.checked = rdBool(0.85); sw.dispatchEvent(new Event("change", { bubbles: true })); }
    },
  });
}

document.addEventListener("DOMContentLoaded", function () {
  document.querySelector(".filter-search-input").addEventListener("input", applyFilters);

  document.getElementById("sortSelect").addEventListener("change", function () {
    currentSort = this.value;
    applyFilters();
  });

  document.getElementById("addAccountBtn").addEventListener("click", function () {
    openAccountModal("Add Account", null);
  });

  var statusToggle = document.getElementById("inputStatus");
  if (statusToggle) {
    statusToggle.addEventListener("change", function () {
      var lbl = document.getElementById("inputStatusLabel");
      if (lbl) { lbl.textContent = this.checked ? "Active" : "Inactive"; lbl.classList.toggle("active-label", this.checked); }
    });
  }

  reloadAccounts()
    .then(function () { applyFilters(); })
    .catch(function (err) { console.error(err); applyFilters(); });
});
