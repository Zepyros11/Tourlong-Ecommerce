// ============================================================
// users.js — logic เฉพาะหน้า Users
// ------------------------------------------------------------
// ใช้ร่วมกับ: modal.js, confirm.js
// ============================================================

// ============ Mock Database ============
let users = [
  { id: 1, name: "สมชาย วงศ์ดี",     email: "somchai@pathara.com",   role: "Admin",   status: "active",   lastLogin: "2026-04-07" },
  { id: 2, name: "วิภา สุขใจ",       email: "wipa@pathara.com",     role: "Manager", status: "active",   lastLogin: "2026-04-07" },
  { id: 3, name: "ประวิทย์ แก้วมณี",  email: "prawit@pathara.com",   role: "Staff",   status: "active",   lastLogin: "2026-04-06" },
  { id: 4, name: "นภา พิมพ์ทอง",     email: "napa@pathara.com",     role: "Staff",   status: "inactive", lastLogin: "2026-03-20" },
  { id: 5, name: "ธนา รัตนกุล",      email: "thana@pathara.com",    role: "Manager", status: "active",   lastLogin: "2026-04-05" },
  { id: 6, name: "พิมพ์ใจ ศรีสุข",    email: "pimjai@pathara.com",   role: "Viewer",  status: "active",   lastLogin: "2026-04-04" },
];

// ============ Update Stat Cards ============
function updateStats() {
  document.getElementById("statAll").textContent = users.length;
  document.getElementById("statActive").textContent = users.filter((u) => u.status === "active").length;
  document.getElementById("statInactive").textContent = users.filter((u) => u.status === "inactive").length;
}

// ============ Role Badge Color ============
function roleBadge(role) {
  switch (role) {
    case "Admin":   return '<span class="badge" style="background-color: #f0e4ff; color: #8b5cf6;">Admin</span>';
    case "Manager": return '<span class="badge" style="background-color: #eff6ff; color: #3b82f6;">Manager</span>';
    case "Staff":   return '<span class="badge" style="background-color: #ecfdf5; color: #10b981;">Staff</span>';
    case "Viewer":  return '<span class="badge" style="background-color: #fef3c7; color: #f59e0b;">Viewer</span>';
    default:        return '<span class="badge">' + role + "</span>";
  }
}

// ============ Render Table ============
function renderTable(data) {
  updateStats();
  const tbody = document.getElementById("userTableBody");
  tbody.innerHTML = data
    .map(
      (u, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${u.name}</td>
      <td>${u.email}</td>
      <td>${roleBadge(u.role)}</td>
      <td><span class="badge badge-${u.status === "active" ? "active" : "inactive"}">${u.status === "active" ? "Active" : "Inactive"}</span></td>
      <td>${u.lastLogin}</td>
      <td>
        <div class="table-actions">
          <button class="btn-icon-sm" onclick="editUser(${u.id})"><i data-lucide="pencil"></i></button>
          <button class="btn-icon-sm btn-danger" onclick="deleteUser(${u.id})"><i data-lucide="trash-2"></i></button>
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
function openUserModal(title, u) {
  document.getElementById("modalTitle").textContent = title;
  document.getElementById("editId").value = u ? u.id : "";
  document.getElementById("inputName").value = u ? u.name : "";
  document.getElementById("inputEmail").value = u ? u.email : "";
  document.getElementById("inputRole").value = u ? u.role : "Staff";
  document.getElementById("inputStatus").checked = u ? u.status === "active" : true;
  var _lbl = document.getElementById("inputStatusLabel"); if(_lbl) { _lbl.textContent = (u ? u.status === "active" : true) ? "Active" : "Inactive"; _lbl.classList.toggle("active-label", u ? u.status === "active" : true); }
  openModalById("userModal", function () {
    document.getElementById("inputName").focus();
  });
}

function saveUser() {
  const id = document.getElementById("editId").value;
  const name = document.getElementById("inputName").value.trim();
  const email = document.getElementById("inputEmail").value.trim();
  const role = document.getElementById("inputRole").value;
  const status = document.getElementById("inputStatus").checked ? "active" : "inactive";
  if (!name) return document.getElementById("inputName").focus();
  if (!email) return document.getElementById("inputEmail").focus();

  const today = new Date().toISOString().split("T")[0];

  if (id) {
    const u = users.find((item) => item.id === Number(id));
    if (u) {
      u.name = name;
      u.email = email;
      u.role = role;
      u.status = status;
    }
  } else {
    const newId = users.length ? Math.max(...users.map((item) => item.id)) + 1 : 1;
    users.push({ id: newId, name, email, role, status, lastLogin: today });
  }
  closeModalById("userModal");
  applyFilters();
}

function editUser(id) {
  const u = users.find((item) => item.id === id);
  if (u) openUserModal("Edit User", u);
}

// ============ Delete (ใช้ confirm.js) ============
function deleteUser(id) {
  const u = users.find((item) => item.id === id);
  if (!u) return;
  showConfirm({
    title: "Confirm Delete",
    message: "ต้องการลบผู้ใช้ <strong>" + u.name + "</strong> ใช่ไหม?",
    okText: "Delete",
    okColor: "#ef4444",
    onConfirm: function () {
      users = users.filter((item) => item.id !== id);
      applyFilters();
    },
  });
}

// ============ Filter & Sort ============
let currentFilter = "all";
let currentSort = "default";

function getFilteredData() {
  const keyword = document.querySelector(".filter-search-input").value.toLowerCase();
  let data = users;

  if (currentFilter !== "all") {
    data = data.filter((u) => u.status === currentFilter);
  }

  if (keyword) {
    data = data.filter(
      (u) =>
        u.name.toLowerCase().includes(keyword) ||
        u.email.toLowerCase().includes(keyword) ||
        u.role.toLowerCase().includes(keyword)
    );
  }

  switch (currentSort) {
    case "name-asc":
      data = [...data].sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "name-desc":
      data = [...data].sort((a, b) => b.name.localeCompare(a.name));
      break;
    case "role":
      data = [...data].sort((a, b) => a.role.localeCompare(b.role));
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

  document.getElementById("addUserBtn").addEventListener("click", function () {
    openUserModal("Add User", null);
  });

  // Status toggle listener
  var statusToggle = document.getElementById("inputStatus");
  if (statusToggle) {
    statusToggle.addEventListener("change", function() {
      var lbl = document.getElementById("inputStatusLabel");
      if (lbl) { lbl.textContent = this.checked ? "Active" : "Inactive"; lbl.classList.toggle("active-label", this.checked); }
    });
  }

  renderTable(users);
});
