// ============================================================
// bank-accounts.js — Bank Accounts (Supabase)
// ============================================================

var accounts = [];
var banks = [];
var currentAppMode = "test";

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
  var showDelete = currentAppMode === "test";
  tbody.innerHTML = data.map(function (a, i) {
    var isActive = a.status === "active";
    var statusToggle =
      '<label class="toggle" title="' + (isActive ? "Active" : "Inactive") + '">' +
        '<input type="checkbox" ' + (isActive ? "checked" : "") + ' onchange="toggleAccountStatus(' + a.id + ', this.checked)" />' +
        '<span class="toggle-slider"></span>' +
      '</label>';
    var deleteBtn = showDelete
      ? '<button class="btn-icon-sm btn-danger" onclick="deleteAccount(' + a.id + ')"><i data-lucide="trash-2"></i></button>'
      : '';
    return '<tr>' +
      '<td>' + (i + 1) + '</td>' +
      '<td>' + (a.bank || "") + '</td>' +
      '<td>' + (a.account_name || "") + '</td>' +
      '<td>' + (a.account_number || "—") + '</td>' +
      '<td>' + fmtMoney(a.balance) + '</td>' +
      '<td>' + statusToggle + '</td>' +
      '<td><div class="table-actions">' +
        '<button class="btn-icon-sm" onclick="editAccount(' + a.id + ')"><i data-lucide="pencil"></i></button>' +
        deleteBtn +
      '</div></td>' +
    '</tr>';
  }).join("");
  lucide.createIcons();
  if (typeof refreshSortableHeaders === "function") refreshSortableHeaders();
}

function populateBankSelect(selectedName) {
  var sel = document.getElementById("inputBank");
  if (!sel) return;
  var opts = banks.map(function (b) {
    return '<option value="' + escapeHtml(b.name) + '">' + escapeHtml(b.name) + '</option>';
  }).join("");
  if (selectedName && !banks.some(function (b) { return b.name === selectedName; })) {
    opts = '<option value="' + escapeHtml(selectedName) + '">' + escapeHtml(selectedName) + ' (ลบแล้ว)</option>' + opts;
  }
  sel.innerHTML = opts || '<option value="">— ไม่มีรายชื่อธนาคาร —</option>';
  if (selectedName) sel.value = selectedName;
}

function escapeHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

function openAccountModal(title, a) {
  document.getElementById("modalTitle").textContent = title;
  document.getElementById("editId").value = a ? a.id : "";
  populateBankSelect(a ? a.bank : (banks[0] && banks[0].name) || "");
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

function toggleAccountStatus(id, isActive) {
  var newStatus = isActive ? "active" : "inactive";
  updateBankAccountDB(id, { status: newStatus })
    .then(function () { return reloadAccounts(); })
    .then(function () { applyFilters(); })
    .catch(function (err) {
      console.error(err);
      if (typeof showToast === "function") showToast("ผิดพลาด", "เปลี่ยนสถานะไม่สำเร็จ", "error");
    });
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

function reloadBanks() {
  return (typeof fetchBanksDB === "function" ? fetchBanksDB() : Promise.resolve([]))
    .then(function (rows) {
      banks = (rows || []).map(function (r) {
        return { id: r.id, name: r.name || "" };
      });
    });
}

// ===================== Manage Banks =====================

function renderBanksTable() {
  var tbody = document.getElementById("bankTableBody");
  if (!tbody) return;
  if (!banks.length) {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:20px;color:#94a3b8;font-size:11px;">ยังไม่มีรายชื่อธนาคาร</td></tr>';
    lucide.createIcons();
    return;
  }
  tbody.innerHTML = banks.map(function (b, i) {
    return '<tr>' +
      '<td>' + (i + 1) + '</td>' +
      '<td>' + escapeHtml(b.name) + '</td>' +
      '<td><div class="table-actions">' +
        '<button class="btn-icon-sm" onclick="editBank(' + b.id + ')" title="แก้ไข"><i data-lucide="pencil"></i></button>' +
        '<button class="btn-icon-sm btn-danger" onclick="deleteBank(' + b.id + ')" title="ลบ"><i data-lucide="trash-2"></i></button>' +
      '</div></td>' +
    '</tr>';
  }).join("");
  lucide.createIcons();
}

function openManageBanksModal() {
  resetBankForm();
  renderBanksTable();
  openModalById("manageBanksModal", function () {
    document.getElementById("bankNameInput").focus();
  });
}

function resetBankForm() {
  document.getElementById("bankEditId").value = "";
  document.getElementById("bankNameInput").value = "";
  var btn = document.getElementById("bankAddBtn");
  if (btn) btn.innerHTML = '<i data-lucide="plus" class="btn-icon"></i> เพิ่ม';
  lucide.createIcons();
}

function saveBank() {
  var nameInput = document.getElementById("bankNameInput");
  var name = nameInput.value.trim();
  if (!name) return nameInput.focus();

  var editId = document.getElementById("bankEditId").value;
  var dup = banks.some(function (b) {
    return b.name === name && String(b.id) !== String(editId);
  });
  if (dup) {
    if (typeof showToast === "function") showToast("ซ้ำ", "มีธนาคารชื่อนี้อยู่แล้ว", "warning");
    return nameInput.focus();
  }

  var op = editId
    ? updateBankDB(Number(editId), { name: name })
    : createBankDB({ name: name });

  op.then(function () { return reloadBanks(); })
    .then(function () {
      // ถ้า edit name แล้ว update bank_accounts ที่อ้างชื่อเดิมให้ตามด้วย (snapshot text — ต้อง sync เอง)
      resetBankForm();
      renderBanksTable();
      // refresh dropdown ใน account modal ถ้าเปิดอยู่
      var accModal = document.getElementById("accountModal");
      if (accModal && accModal.classList.contains("active")) {
        var current = document.getElementById("inputBank").value;
        populateBankSelect(current);
      }
      if (typeof showToast === "function") showToast("สำเร็จ", editId ? "แก้ไขแล้ว" : "เพิ่มแล้ว", "success");
    })
    .catch(function (err) {
      console.error(err);
      if (typeof showToast === "function") showToast("ผิดพลาด", "บันทึกไม่สำเร็จ", "error");
    });
}

function editBank(id) {
  var b = banks.find(function (x) { return x.id === id; });
  if (!b) return;
  document.getElementById("bankEditId").value = b.id;
  document.getElementById("bankNameInput").value = b.name;
  document.getElementById("bankNameInput").focus();
  var btn = document.getElementById("bankAddBtn");
  if (btn) btn.innerHTML = '<i data-lucide="check" class="btn-icon"></i> บันทึก';
  lucide.createIcons();
}

function deleteBank(id) {
  var b = banks.find(function (x) { return x.id === id; });
  if (!b) return;
  var isProd = currentAppMode === "production";
  var inUse = accounts.some(function (a) { return a.bank === b.name; });

  showConfirm({
    title: isProd ? "ยืนยันการลบ (Soft)" : "ยืนยันการลบ",
    message: "ต้องการลบธนาคาร <strong>" + escapeHtml(b.name) + "</strong> ใช่ไหม?" +
      (inUse ? '<br/><span style="color:#f59e0b;font-size:11px;">⚠️ ธนาคารนี้ถูกใช้ในบัญชีธนาคารอยู่ — ชื่อใน bank_accounts จะยังเหมือนเดิม</span>' : "") +
      (isProd ? '<br/><span style="color:#64748b;font-size:11px;">Production mode: soft delete (set deleted_at)</span>' : '<br/><span style="color:#64748b;font-size:11px;">Test mode: hard delete</span>'),
    okText: "Delete",
    okColor: "#ef4444",
    onConfirm: function () {
      var op = isProd ? softDeleteBankDB(id) : deleteBankDB(id);
      op.then(function () { return reloadBanks(); })
        .then(function () {
          renderBanksTable();
          var accModal = document.getElementById("accountModal");
          if (accModal && accModal.classList.contains("active")) {
            var current = document.getElementById("inputBank").value;
            populateBankSelect(current);
          }
          if (typeof showToast === "function") showToast("ลบสำเร็จ", b.name, "success");
        })
        .catch(function (err) {
          console.error(err);
          if (typeof showToast === "function") showToast("ผิดพลาด", "ลบไม่สำเร็จ", "error");
        });
    },
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

  var manageBtn = document.getElementById("manageBanksBtn");
  if (manageBtn) manageBtn.addEventListener("click", openManageBanksModal);

  var bankAddBtn = document.getElementById("bankAddBtn");
  if (bankAddBtn) bankAddBtn.addEventListener("click", saveBank);

  var statusToggle = document.getElementById("inputStatus");
  if (statusToggle) {
    statusToggle.addEventListener("change", function () {
      var lbl = document.getElementById("inputStatusLabel");
      if (lbl) { lbl.textContent = this.checked ? "Active" : "Inactive"; lbl.classList.toggle("active-label", this.checked); }
    });
  }

  var modeP = (typeof getAppMode === "function") ? getAppMode() : Promise.resolve("test");
  Promise.all([modeP, reloadAccounts(), reloadBanks()])
    .then(function (results) {
      currentAppMode = results[0] || "test";
      applyFilters();
    })
    .catch(function (err) { console.error(err); applyFilters(); });
});
