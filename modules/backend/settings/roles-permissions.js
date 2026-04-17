// ============================================================
// roles-permissions.js — logic เฉพาะหน้า Roles & Permissions
// ------------------------------------------------------------
// ใช้ร่วมกับ: modal.js, confirm.js
// ============================================================

// ============ Mock Database ============
let roles = [];

// ============ Update Stat Cards ============
function updateStats() {
  document.getElementById("statAll").textContent = roles.length;
  document.getElementById("statActive").textContent = roles.filter((r) => r.status === "active").length;
}

// ============ Render Table ============
function renderTable(data) {
  updateStats();
  const tbody = document.getElementById("roleTableBody");
  tbody.innerHTML = data
    .map(
      (r, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${r.name}</td>
      <td>${r.desc}</td>
      <td>${r.users}</td>
      <td><span class="badge" style="background-color:#eff6ff;color:#3b82f6;">${r.permissions.length} permissions</span></td>
      <td>
        <div class="table-actions">
          <button class="btn-icon-sm" onclick="editRole(${r.id})"><i data-lucide="pencil"></i></button>
          <button class="btn-icon-sm btn-danger" onclick="deleteRole(${r.id})"><i data-lucide="trash-2"></i></button>
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
function openRoleModal(title, r) {
  document.getElementById("modalTitle").textContent = title;
  document.getElementById("editId").value = r ? r.id : "";
  document.getElementById("inputName").value = r ? r.name : "";
  document.getElementById("inputDesc").value = r ? r.desc : "";

  // Reset all checkboxes then set based on permissions
  document.querySelectorAll(".permission-check").forEach(function (cb) {
    cb.checked = r ? r.permissions.includes(cb.value) : false;
  });

  openModalById("roleModal", function () {
    document.getElementById("inputName").focus();
  });
}

function saveRole() {
  const id = document.getElementById("editId").value;
  const name = document.getElementById("inputName").value.trim();
  const desc = document.getElementById("inputDesc").value.trim();
  if (!name) return document.getElementById("inputName").focus();

  // Collect checked permissions
  const permissions = [];
  document.querySelectorAll(".permission-check").forEach(function (cb) {
    if (cb.checked) permissions.push(cb.value);
  });

  if (id) {
    const r = roles.find((item) => item.id === Number(id));
    if (r) {
      r.name = name;
      r.desc = desc;
      r.permissions = permissions;
    }
  } else {
    const newId = roles.length ? Math.max(...roles.map((item) => item.id)) + 1 : 1;
    roles.push({ id: newId, name, desc, users: 0, permissions, status: "active" });
  }
  closeModalById("roleModal");
  applyFilters();
}

function editRole(id) {
  const r = roles.find((item) => item.id === id);
  if (r) openRoleModal("Edit Role", r);
}

// ============ Delete (ใช้ confirm.js) ============
function deleteRole(id) {
  const r = roles.find((item) => item.id === id);
  if (!r) return;
  showConfirm({
    title: "Confirm Delete",
    message: "ต้องการลบ Role <strong>" + r.name + "</strong> ใช่ไหม?",
    okText: "Delete",
    okColor: "#ef4444",
    onConfirm: function () {
      roles = roles.filter((item) => item.id !== id);
      applyFilters();
    },
  });
}

// ============ Filter & Sort ============
let currentSort = "default";

function getFilteredData() {
  const keyword = document.querySelector(".filter-search-input").value.toLowerCase();
  let data = roles;

  if (keyword) {
    data = data.filter(
      (r) =>
        r.name.toLowerCase().includes(keyword) ||
        r.desc.toLowerCase().includes(keyword)
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

  document.getElementById("sortSelect").addEventListener("change", function () {
    currentSort = this.value;
    applyFilters();
  });

  document.getElementById("addRoleBtn").addEventListener("click", function () {
    openRoleModal("Add Role", null);
  });

  renderTable(roles);
});
