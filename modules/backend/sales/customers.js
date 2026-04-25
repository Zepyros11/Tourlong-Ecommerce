// ============================================================
// customers.js — Customers (Supabase)
// ============================================================

var customers = [];
var currentAppMode = "test";

function updateStats() {
  document.getElementById("statAll").textContent = customers.length;
  document.getElementById("statActive").textContent = customers.filter(function (c) { return c.status === "active"; }).length;
  document.getElementById("statInactive").textContent = customers.filter(function (c) { return c.status === "inactive"; }).length;
}

function getTypeBadge(type) {
  if (type === "individual") {
    return '<span style="display:inline-block;padding:2px 10px;border-radius:9999px;font-size:12px;font-weight:600;background-color:#ecfdf5;color:#10b981;">บุคคล</span>';
  }
  return '<span style="display:inline-block;padding:2px 10px;border-radius:9999px;font-size:12px;font-weight:600;background-color:#eff6ff;color:#3b82f6;">นิติบุคคล</span>';
}

function renderTable(data) {
  updateStats();
  var tbody = document.getElementById("customerTableBody");
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:30px;color:#94a3b8;font-size:11px;">ยังไม่มีลูกค้า</td></tr>';
    lucide.createIcons();
    return;
  }
  var showDelete = currentAppMode === "test";
  tbody.innerHTML = data.map(function (c, i) {
    var isActive = c.status === "active";
    var statusToggle =
      '<label class="toggle" title="' + (isActive ? "Active" : "Inactive") + '">' +
        '<input type="checkbox" ' + (isActive ? "checked" : "") + ' onchange="toggleCustomerStatus(' + c.id + ', this.checked)" />' +
        '<span class="toggle-slider"></span>' +
      '</label>';
    var deleteBtn = showDelete
      ? '<button class="btn-icon-sm btn-danger" onclick="deleteCustomer(' + c.id + ')"><i data-lucide="trash-2"></i></button>'
      : '';
    return '<tr>' +
      '<td>' + (i + 1) + '</td>' +
      '<td>' + (c.name || "") + '</td>' +
      '<td>' + (c.contact || "—") + '</td>' +
      '<td>' + (c.phone || "—") + '</td>' +
      '<td>' + (c.email || "—") + '</td>' +
      '<td>' + getTypeBadge(c.type) + '</td>' +
      '<td>' + statusToggle + '</td>' +
      '<td><div class="table-actions">' +
        '<button class="btn-icon-sm" onclick="editCustomer(' + c.id + ')"><i data-lucide="pencil"></i></button>' +
        deleteBtn +
      '</div></td>' +
    '</tr>';
  }).join("");
  lucide.createIcons();
  if (typeof refreshSortableHeaders === "function") refreshSortableHeaders();
}

function generateNextMemberCode() {
  var max = 0;
  customers.forEach(function (c) {
    var m = /^MEM-(\d+)$/.exec(c.member_code || "");
    if (m) {
      var n = parseInt(m[1], 10);
      if (n > max) max = n;
    }
  });
  return "MEM-" + String(max + 1).padStart(4, "0");
}

function openCustomerModal(title, c) {
  document.getElementById("modalTitle").textContent = title;
  document.getElementById("editId").value = c ? c.id : "";
  document.getElementById("inputMemberCode").value = c ? (c.member_code || "") : generateNextMemberCode();
  document.getElementById("inputName").value = c ? (c.name || "") : "";
  document.getElementById("inputContact").value = c ? (c.contact || "") : "";
  document.getElementById("inputPhone").value = c ? (c.phone || "") : "";
  document.getElementById("inputEmail").value = c ? (c.email || "") : "";
  document.getElementById("inputType").value = c ? c.type : "individual";
  document.getElementById("inputAddress").value = c ? (c.address || "") : "";
  var active = c ? c.status === "active" : true;
  document.getElementById("inputStatus").checked = active;
  var lbl = document.getElementById("inputStatusLabel");
  if (lbl) { lbl.textContent = active ? "Active" : "Inactive"; lbl.classList.toggle("active-label", active); }
  openModalById("customerModal", function () { document.getElementById("inputName").focus(); });
}

function saveCustomer() {
  var id = document.getElementById("editId").value;
  var name = document.getElementById("inputName").value.trim();
  if (!name) return document.getElementById("inputName").focus();

  var payload = {
    member_code: document.getElementById("inputMemberCode").value.trim() || null,
    name: name,
    contact: document.getElementById("inputContact").value.trim() || null,
    phone: document.getElementById("inputPhone").value.trim() || null,
    email: document.getElementById("inputEmail").value.trim() || null,
    type: document.getElementById("inputType").value,
    address: document.getElementById("inputAddress").value.trim() || null,
    status: document.getElementById("inputStatus").checked ? "active" : "inactive",
  };

  var op = id ? updateCustomerDB(Number(id), payload) : createCustomerDB(payload);
  op.then(function () { return reloadCustomers(); })
    .then(function () {
      closeModalById("customerModal");
      applyFilters();
    })
    .catch(function (err) { console.error(err); });
}

function editCustomer(id) {
  var c = customers.find(function (x) { return x.id === id; });
  if (c) openCustomerModal("Edit Customer", c);
}

function toggleCustomerStatus(id, isActive) {
  var newStatus = isActive ? "active" : "inactive";
  updateCustomerDB(id, { status: newStatus })
    .then(function () { return reloadCustomers(); })
    .then(function () { applyFilters(); })
    .catch(function (err) {
      console.error(err);
      if (typeof showToast === "function") showToast("ผิดพลาด", "เปลี่ยนสถานะไม่สำเร็จ", "error");
    });
}

function deleteCustomer(id) {
  var c = customers.find(function (x) { return x.id === id; });
  if (!c) return;
  var modeFn = (typeof getAppModeFresh === "function") ? getAppModeFresh
             : (typeof getAppMode === "function") ? getAppMode
             : function () { return Promise.resolve("test"); };
  modeFn().then(function (mode) {
    var isProd = mode === "production";
    showConfirm({
      title: isProd ? "Confirm Soft Delete" : "Confirm Delete",
      message: isProd
        ? "Production mode: ลูกค้า <strong>" + c.name + "</strong> จะถูกตั้งสถานะเป็น <strong>Inactive</strong> (ไม่ลบจาก DB)"
        : "Test mode: ลบลูกค้า <strong>" + c.name + "</strong> ออกจาก DB จริง ใช่ไหม?",
      okText: isProd ? "Set Inactive" : "Delete",
      okColor: "#ef4444",
      onConfirm: function () {
        var op = isProd
          ? updateCustomerDB(id, { status: "inactive" })
          : deleteCustomerDB(id);
        op.then(function () { return reloadCustomers(); })
          .then(function () { applyFilters(); })
          .catch(function (err) { console.error(err); });
      },
    });
  });
}

var currentFilter = "all";
var currentSort = "default";

function getFilteredData() {
  var keyword = document.querySelector(".filter-search-input").value.toLowerCase();
  var data = customers.slice();

  if (currentFilter !== "all") data = data.filter(function (c) { return c.status === currentFilter; });

  if (keyword) {
    data = data.filter(function (c) {
      return (c.name || "").toLowerCase().includes(keyword) ||
             (c.contact || "").toLowerCase().includes(keyword) ||
             (c.phone || "").toLowerCase().includes(keyword) ||
             (c.email || "").toLowerCase().includes(keyword);
    });
  }

  switch (currentSort) {
    case "name-asc":  data = data.slice().sort(function (a, b) { return (a.name || "").localeCompare(b.name || ""); }); break;
    case "name-desc": data = data.slice().sort(function (a, b) { return (b.name || "").localeCompare(a.name || ""); }); break;
  }
  return data;
}

function applyFilters() { renderTable(getFilteredData()); }

function reloadCustomers() {
  return (typeof fetchCustomersDB === "function" ? fetchCustomersDB() : Promise.resolve([]))
    .then(function (rows) {
      customers = (rows || []).map(function (r) {
        return {
          id: r.id,
          member_code: r.member_code || "",
          name: r.name || "",
          contact: r.contact || "",
          phone: r.phone || "",
          email: r.email || "",
          type: r.type || "individual",
          address: r.address || "",
          status: r.status || "active",
        };
      });
    });
}

if (typeof registerRandomFill === "function") {
  registerRandomFill({
    target: "#customerModal",
    fill: function () {
      var isCompany = rdBool(0.5);
      setFieldValue("inputName", isCompany ? randomCompanyName() : randomPersonName());
      setFieldValue("inputContact", randomPersonName());
      setFieldValue("inputPhone", randomPhone());
      setFieldValue("inputEmail", randomEmail());
      var typeSel = document.getElementById("inputType");
      if (typeSel) typeSel.value = isCompany ? "company" : "individual";
      setFieldValue("inputAddress", randomAddress());
      var sw = document.getElementById("inputStatus");
      if (sw) { sw.checked = rdBool(0.85); sw.dispatchEvent(new Event("change", { bubbles: true })); }
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

  document.getElementById("addCustomerBtn").addEventListener("click", function () {
    openCustomerModal("Add Customer", null);
  });

  var statusToggle = document.getElementById("inputStatus");
  if (statusToggle) {
    statusToggle.addEventListener("change", function () {
      var lbl = document.getElementById("inputStatusLabel");
      if (lbl) { lbl.textContent = this.checked ? "Active" : "Inactive"; lbl.classList.toggle("active-label", this.checked); }
    });
  }

  var modeP = (typeof getAppMode === "function") ? getAppMode() : Promise.resolve("test");
  Promise.all([modeP, reloadCustomers()])
    .then(function (results) {
      currentAppMode = results[0] || "test";
      applyFilters();
    })
    .catch(function (err) { console.error(err); applyFilters(); });
});
