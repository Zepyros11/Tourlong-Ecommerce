// ============================================================
// customers.js — logic เฉพาะหน้า Customers
// ------------------------------------------------------------
// ใช้ร่วมกับ: modal.js, confirm.js
// ============================================================

// ============ Mock Database ============
let customers = [];

// ============ Update Stat Cards ============
function updateStats() {
  document.getElementById("statAll").textContent = customers.length;
  document.getElementById("statActive").textContent = customers.filter((c) => c.status === "active").length;
  document.getElementById("statInactive").textContent = customers.filter((c) => c.status === "inactive").length;
}

// ============ Type Badge ============
function getTypeBadge(type) {
  if (type === "individual") {
    return '<span style="display:inline-block;padding:2px 10px;border-radius:9999px;font-size:12px;font-weight:600;background-color:#ecfdf5;color:#10b981;">บุคคล</span>';
  }
  return '<span style="display:inline-block;padding:2px 10px;border-radius:9999px;font-size:12px;font-weight:600;background-color:#eff6ff;color:#3b82f6;">นิติบุคคล</span>';
}

// ============ Render Table ============
function renderTable(data) {
  updateStats();
  const tbody = document.getElementById("customerTableBody");
  tbody.innerHTML = data
    .map(
      (c, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${c.name}</td>
      <td>${c.contact}</td>
      <td>${c.phone}</td>
      <td>${c.email}</td>
      <td>${getTypeBadge(c.type)}</td>
      <td><span class="badge badge-${c.status === "active" ? "active" : "inactive"}">${c.status === "active" ? "Active" : "Inactive"}</span></td>
      <td>
        <div class="table-actions">
          <button class="btn-icon-sm" onclick="editCustomer(${c.id})"><i data-lucide="pencil"></i></button>
          <button class="btn-icon-sm btn-danger" onclick="deleteCustomer(${c.id})"><i data-lucide="trash-2"></i></button>
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
function openCustomerModal(title, c) {
  document.getElementById("modalTitle").textContent = title;
  document.getElementById("editId").value = c ? c.id : "";
  document.getElementById("inputName").value = c ? c.name : "";
  document.getElementById("inputContact").value = c ? c.contact : "";
  document.getElementById("inputPhone").value = c ? c.phone : "";
  document.getElementById("inputEmail").value = c ? c.email : "";
  document.getElementById("inputType").value = c ? c.type : "individual";
  document.getElementById("inputAddress").value = c ? c.address : "";
  document.getElementById("inputStatus").checked = c ? c.status === "active" : true;
  var _lbl = document.getElementById("inputStatusLabel"); if(_lbl) { _lbl.textContent = (c ? c.status === "active" : true) ? "Active" : "Inactive"; _lbl.classList.toggle("active-label", c ? c.status === "active" : true); }
  openModalById("customerModal", function () {
    document.getElementById("inputName").focus();
  });
}

function saveCustomer() {
  const id = document.getElementById("editId").value;
  const name = document.getElementById("inputName").value.trim();
  const contact = document.getElementById("inputContact").value.trim();
  const phone = document.getElementById("inputPhone").value.trim();
  const email = document.getElementById("inputEmail").value.trim();
  const type = document.getElementById("inputType").value;
  const address = document.getElementById("inputAddress").value.trim();
  const status = document.getElementById("inputStatus").checked ? "active" : "inactive";
  if (!name) return document.getElementById("inputName").focus();

  if (id) {
    const c = customers.find((item) => item.id === Number(id));
    if (c) {
      c.name = name;
      c.contact = contact;
      c.phone = phone;
      c.email = email;
      c.type = type;
      c.address = address;
      c.status = status;
    }
  } else {
    const newId = customers.length ? Math.max(...customers.map((item) => item.id)) + 1 : 1;
    customers.push({ id: newId, name, contact, phone, email, type, address, status });
  }
  closeModalById("customerModal");
  applyFilters();
}

function editCustomer(id) {
  const c = customers.find((item) => item.id === id);
  if (c) openCustomerModal("Edit Customer", c);
}

// ============ Delete (ใช้ confirm.js) ============
function deleteCustomer(id) {
  const c = customers.find((item) => item.id === id);
  if (!c) return;
  showConfirm({
    title: "Confirm Delete",
    message: "ต้องการลบลูกค้า <strong>" + c.name + "</strong> ใช่ไหม?",
    okText: "Delete",
    okColor: "#ef4444",
    onConfirm: function () {
      customers = customers.filter((item) => item.id !== id);
      applyFilters();
    },
  });
}

// ============ Filter & Sort ============
let currentFilter = "all";
let currentSort = "default";

function getFilteredData() {
  const keyword = document.querySelector(".filter-search-input").value.toLowerCase();
  let data = customers;

  if (currentFilter !== "all") {
    data = data.filter((c) => c.status === currentFilter);
  }

  if (keyword) {
    data = data.filter(
      (c) =>
        c.name.toLowerCase().includes(keyword) ||
        c.contact.toLowerCase().includes(keyword) ||
        c.phone.toLowerCase().includes(keyword) ||
        c.email.toLowerCase().includes(keyword)
    );
  }

  switch (currentSort) {
    case "name-asc":
      data = [...data].sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "name-desc":
      data = [...data].sort((a, b) => b.name.localeCompare(a.name));
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

  document.querySelectorAll(".filter-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
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

  // Status toggle listener
  var statusToggle = document.getElementById("inputStatus");
  if (statusToggle) {
    statusToggle.addEventListener("change", function() {
      var lbl = document.getElementById("inputStatusLabel");
      if (lbl) { lbl.textContent = this.checked ? "Active" : "Inactive"; lbl.classList.toggle("active-label", this.checked); }
    });
  }

  renderTable(customers);
});
