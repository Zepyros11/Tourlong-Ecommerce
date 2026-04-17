// ============================================================
// bank-accounts.js — logic เฉพาะหน้า Bank Accounts
// ------------------------------------------------------------
// ใช้ร่วมกับ: modal.js, confirm.js
// ============================================================

// ============ Mock Database ============
let accounts = [];

// ============ Update Stat Cards ============
function updateStats() {
  document.getElementById("statAll").textContent = accounts.length;
  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
  document.getElementById("statBalance").textContent = "฿" + totalBalance.toLocaleString();
}

// ============ Render Table ============
function renderTable(data) {
  updateStats();
  const tbody = document.getElementById("accountTableBody");
  tbody.innerHTML = data
    .map(
      (a, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${a.bank}</td>
      <td>${a.accountName}</td>
      <td>${a.accountNumber}</td>
      <td>฿${a.balance.toLocaleString()}</td>
      <td><span class="badge badge-${a.status === "active" ? "active" : "inactive"}">${a.status === "active" ? "Active" : "Inactive"}</span></td>
      <td>
        <div class="table-actions">
          <button class="btn-icon-sm" onclick="editAccount(${a.id})"><i data-lucide="pencil"></i></button>
          <button class="btn-icon-sm btn-danger" onclick="deleteAccount(${a.id})"><i data-lucide="trash-2"></i></button>
        </div>
      </td>
    </tr>
  `
    )
    .join("");
  lucide.createIcons();
  if (typeof refreshSortableHeaders === "function") refreshSortableHeaders();
}

// ============ Add / Edit Modal ============
function openAccountModal(title, a) {
  document.getElementById("modalTitle").textContent = title;
  document.getElementById("editId").value = a ? a.id : "";
  document.getElementById("inputBank").value = a ? a.bank : "ธนาคารกสิกรไทย";
  document.getElementById("inputAccountName").value = a ? a.accountName : "";
  document.getElementById("inputAccountNumber").value = a ? a.accountNumber : "";
  document.getElementById("inputBalance").value = a ? a.balance : "";
  document.getElementById("inputStatus").checked = a ? a.status === "active" : true;
  var _lbl = document.getElementById("inputStatusLabel"); if(_lbl) { _lbl.textContent = (a ? a.status === "active" : true) ? "Active" : "Inactive"; _lbl.classList.toggle("active-label", a ? a.status === "active" : true); }
  openModalById("accountModal", function () {
    document.getElementById("inputAccountName").focus();
  });
}

function saveAccount() {
  const id = document.getElementById("editId").value;
  const bank = document.getElementById("inputBank").value;
  const accountName = document.getElementById("inputAccountName").value.trim();
  const accountNumber = document.getElementById("inputAccountNumber").value.trim();
  const balance = Number(document.getElementById("inputBalance").value);
  const status = document.getElementById("inputStatus").checked ? "active" : "inactive";
  if (!accountName) return document.getElementById("inputAccountName").focus();

  if (id) {
    const a = accounts.find((item) => item.id === Number(id));
    if (a) {
      a.bank = bank;
      a.accountName = accountName;
      a.accountNumber = accountNumber;
      a.balance = balance;
      a.status = status;
    }
  } else {
    const newId = accounts.length ? Math.max(...accounts.map((item) => item.id)) + 1 : 1;
    accounts.push({ id: newId, bank, accountName, accountNumber, balance, status });
  }
  closeModalById("accountModal");
  applyFilters();
}

function editAccount(id) {
  const a = accounts.find((item) => item.id === id);
  if (a) openAccountModal("Edit Account", a);
}

// ============ Delete (ใช้ confirm.js) ============
function deleteAccount(id) {
  const a = accounts.find((item) => item.id === id);
  if (!a) return;
  showConfirm({
    title: "Confirm Delete",
    message: "ต้องการลบบัญชี <strong>" + a.accountName + " (" + a.bank + ")</strong> ใช่ไหม?",
    okText: "Delete",
    okColor: "#ef4444",
    onConfirm: function () {
      accounts = accounts.filter((item) => item.id !== id);
      applyFilters();
    },
  });
}

// ============ Filter & Sort ============
let currentSort = "default";

function getFilteredData() {
  const keyword = document.querySelector(".filter-search-input").value.toLowerCase();
  let data = accounts;

  if (keyword) {
    data = data.filter(
      (a) =>
        a.bank.toLowerCase().includes(keyword) ||
        a.accountName.toLowerCase().includes(keyword) ||
        a.accountNumber.toLowerCase().includes(keyword)
    );
  }

  switch (currentSort) {
    case "name-asc":
      data = [...data].sort((a, b) => a.accountName.localeCompare(b.accountName));
      break;
    case "balance-desc":
      data = [...data].sort((a, b) => b.balance - a.balance);
      break;
    case "balance-asc":
      data = [...data].sort((a, b) => a.balance - b.balance);
      break;
  }

  return data;
}

function applyFilters() {
  renderTable(getFilteredData());
}

// ============ Init ============
document.addEventListener("DOMContentLoaded", function () {
  document.querySelector(".filter-search-input").addEventListener("input", applyFilters);

  document.getElementById("sortSelect").addEventListener("change", function () {
    currentSort = this.value;
    applyFilters();
  });

  document.getElementById("addAccountBtn").addEventListener("click", function () {
    openAccountModal("Add Account", null);
  });

  // Status toggle listener
  var statusToggle = document.getElementById("inputStatus");
  if (statusToggle) {
    statusToggle.addEventListener("change", function() {
      var lbl = document.getElementById("inputStatusLabel");
      if (lbl) { lbl.textContent = this.checked ? "Active" : "Inactive"; lbl.classList.toggle("active-label", this.checked); }
    });
  }

  renderTable(accounts);
});
