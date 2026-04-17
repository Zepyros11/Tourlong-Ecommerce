// ============================================================
// suppliers.js — logic เฉพาะหน้า Suppliers
// ------------------------------------------------------------
// ใช้ร่วมกับ: modal.js, confirm.js
// ============================================================

// ============ Mock Database ============
let suppliers = [];

// ============ Update Stat Cards ============
function updateStats() {
  document.getElementById("statAll").textContent = suppliers.length;
  document.getElementById("statActive").textContent = suppliers.filter((s) => s.status === "active").length;
  document.getElementById("statInactive").textContent = suppliers.filter((s) => s.status === "inactive").length;
}

// ============ Render Table ============
function renderTable(data) {
  updateStats();
  const tbody = document.getElementById("supplierTableBody");
  tbody.innerHTML = data
    .map(
      (s, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${s.name}</td>
      <td>${s.contact}</td>
      <td>${s.phone}</td>
      <td>${s.email}</td>
      <td><span class="badge badge-${s.status === "active" ? "active" : "inactive"}">${s.status === "active" ? "Active" : "Inactive"}</span></td>
      <td>
        <div class="table-actions">
          <button class="btn-icon-sm" onclick="editSupplier(${s.id})"><i data-lucide="pencil"></i></button>
          <button class="btn-icon-sm btn-danger" onclick="deleteSupplier(${s.id})"><i data-lucide="trash-2"></i></button>
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
function openSupplierModal(title, s) {
  document.getElementById("modalTitle").textContent = title;
  document.getElementById("editId").value = s ? s.id : "";
  document.getElementById("inputName").value = s ? s.name : "";
  document.getElementById("inputContact").value = s ? s.contact : "";
  document.getElementById("inputPhone").value = s ? s.phone : "";
  document.getElementById("inputEmail").value = s ? s.email : "";
  document.getElementById("inputAddress").value = s ? s.address : "";
  document.getElementById("inputStatus").checked = s ? s.status === "active" : true;
  var _lbl = document.getElementById("inputStatusLabel"); if(_lbl) { _lbl.textContent = (s ? s.status === "active" : true) ? "Active" : "Inactive"; _lbl.classList.toggle("active-label", s ? s.status === "active" : true); }
  openModalById("supplierModal", function () {
    document.getElementById("inputName").focus();
  });
}

function saveSupplier() {
  const id = document.getElementById("editId").value;
  const name = document.getElementById("inputName").value.trim();
  const contact = document.getElementById("inputContact").value.trim();
  const phone = document.getElementById("inputPhone").value.trim();
  const email = document.getElementById("inputEmail").value.trim();
  const address = document.getElementById("inputAddress").value.trim();
  const status = document.getElementById("inputStatus").checked ? "active" : "inactive";
  if (!name) return document.getElementById("inputName").focus();

  if (id) {
    const s = suppliers.find((item) => item.id === Number(id));
    if (s) {
      s.name = name;
      s.contact = contact;
      s.phone = phone;
      s.email = email;
      s.address = address;
      s.status = status;
    }
  } else {
    const newId = suppliers.length ? Math.max(...suppliers.map((item) => item.id)) + 1 : 1;
    suppliers.push({ id: newId, name, contact, phone, email, address, status });
  }
  closeModalById("supplierModal");
  applyFilters();
}

function editSupplier(id) {
  const s = suppliers.find((item) => item.id === id);
  if (s) openSupplierModal("Edit Supplier", s);
}

// ============ Delete (ใช้ confirm.js) ============
function deleteSupplier(id) {
  const s = suppliers.find((item) => item.id === id);
  if (!s) return;
  showConfirm({
    title: "Confirm Delete",
    message: "ต้องการลบผู้ขาย <strong>" + s.name + "</strong> ใช่ไหม?",
    okText: "Delete",
    okColor: "#ef4444",
    onConfirm: function () {
      suppliers = suppliers.filter((item) => item.id !== id);
      applyFilters();
    },
  });
}

// ============ Filter & Sort ============
let currentFilter = "all";
let currentSort = "default";

function getFilteredData() {
  const keyword = document.querySelector(".filter-search-input").value.toLowerCase();
  let data = suppliers;

  if (currentFilter !== "all") {
    data = data.filter((s) => s.status === currentFilter);
  }

  if (keyword) {
    data = data.filter(
      (s) =>
        s.name.toLowerCase().includes(keyword) ||
        s.contact.toLowerCase().includes(keyword) ||
        s.phone.toLowerCase().includes(keyword) ||
        s.email.toLowerCase().includes(keyword)
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

  document.getElementById("addSupplierBtn").addEventListener("click", function () {
    openSupplierModal("Add Supplier", null);
  });

  // Status toggle listener
  var statusToggle = document.getElementById("inputStatus");
  if (statusToggle) {
    statusToggle.addEventListener("change", function() {
      var lbl = document.getElementById("inputStatusLabel");
      if (lbl) { lbl.textContent = this.checked ? "Active" : "Inactive"; lbl.classList.toggle("active-label", this.checked); }
    });
  }

  renderTable(suppliers);
});
