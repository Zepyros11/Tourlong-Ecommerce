// ============================================================
// users.js — logic เฉพาะหน้า Users
// ------------------------------------------------------------
// ใช้ร่วมกับ: modal.js, confirm.js
// ============================================================

// ============ Database (Supabase) ============
let users = [];
let availableRoles = [];
var currentAppMode = "test";

function reloadUsers() {
  return fetchUsersDB().then(function(rows) {
    users = (rows || []).map(normalizeUser);
    return users;
  });
}

function loadRolesIntoSelect() {
  if (typeof fetchRolesDB !== "function") return Promise.resolve([]);
  return fetchRolesDB().then(function (rows) {
    availableRoles = (rows || []).filter(function (r) { return (r.status || "active") === "active"; });
    var sel = document.getElementById("inputRole");
    if (!sel) return availableRoles;
    var prev = sel.value;
    var html = '<option value="">— เลือก Role —</option>';
    availableRoles.forEach(function (r) {
      html += '<option value="' + r.name + '">' + r.name + '</option>';
    });
    sel.innerHTML = html;
    if (prev) sel.value = prev;
    return availableRoles;
  }).catch(function (err) { console.error("loadRolesIntoSelect:", err); return []; });
}

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
  const showDelete = currentAppMode === "test";
  tbody.innerHTML = data
    .map((u, i) => {
      const isActive = u.status === "active";
      const statusToggle =
        `<label class="toggle" title="${isActive ? "Active" : "Inactive"}">` +
          `<input type="checkbox" ${isActive ? "checked" : ""} onchange="toggleUserStatus(${u.id}, this.checked)" />` +
          `<span class="toggle-slider"></span>` +
        `</label>`;
      const deleteBtn = showDelete
        ? `<button class="btn-icon-sm btn-danger" onclick="deleteUser(${u.id})" title="Delete"><i data-lucide="trash-2"></i></button>`
        : "";
      return `
    <tr>
      <td>${i + 1}</td>
      <td>${u.name}${u.mustChangePassword ? ' <span class="badge-must-change" title="ต้องเปลี่ยนรหัสผ่านครั้งถัดไป"><i data-lucide="key-round"></i>ต้องเปลี่ยนรหัส</span>' : ""}</td>
      <td>${u.email}</td>
      <td>${roleBadge(u.role)}</td>
      <td>${statusToggle}</td>
      <td>${u.lastLogin}</td>
      <td>
        <div class="table-actions">
          <button class="btn-icon-sm" onclick="editUser(${u.id})" title="Edit"><i data-lucide="pencil"></i></button>
          <button class="btn-icon-sm" onclick="resetUserPassword(${u.id})" title="Reset Password"><i data-lucide="key-round"></i></button>
          ${deleteBtn}
        </div>
      </td>
    </tr>
  `;
    })
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
  document.getElementById("inputUsername").value = u ? (u.username || "") : "";
  document.getElementById("inputPhone").value = u ? (u.phone || "") : "";
  document.getElementById("inputPassword").value = "";
  document.getElementById("inputPasswordConfirm").value = "";
  updatePasswordStrength("");
  document.getElementById("inputStatus").checked = u ? u.status === "active" : true;
  var _lbl = document.getElementById("inputStatusLabel"); if(_lbl) { _lbl.textContent = (u ? u.status === "active" : true) ? "Active" : "Inactive"; _lbl.classList.toggle("active-label", u ? u.status === "active" : true); }

  loadRolesIntoSelect().then(function () {
    var sel = document.getElementById("inputRole");
    var target = u ? u.role : "";
    if (target) {
      var exists = Array.prototype.some.call(sel.options, function (o) { return o.value === target; });
      if (!exists) {
        var opt = document.createElement("option");
        opt.value = target;
        opt.textContent = target + " (ไม่มีในระบบแล้ว)";
        sel.appendChild(opt);
      }
      sel.value = target;
    } else {
      sel.value = "";
    }
  });

  openModalById("userModal", function () {
    document.getElementById("inputName").focus();
  });
}

function saveUser() {
  const id = document.getElementById("editId").value;
  const name = document.getElementById("inputName").value.trim();
  const email = document.getElementById("inputEmail").value.trim();
  const username = document.getElementById("inputUsername").value.trim();
  const phone = document.getElementById("inputPhone").value.trim();
  const password = document.getElementById("inputPassword").value;
  const passwordConfirm = document.getElementById("inputPasswordConfirm").value;
  const role = document.getElementById("inputRole").value;
  const status = document.getElementById("inputStatus").checked ? "active" : "inactive";
  if (!name) {
    showToast("กรุณากรอกชื่อ", "warning");
    return document.getElementById("inputName").focus();
  }
  if (!email) {
    showToast("กรุณากรอก email", "warning");
    return document.getElementById("inputEmail").focus();
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showToast("รูปแบบ email ไม่ถูกต้อง", "warning");
    return document.getElementById("inputEmail").focus();
  }
  if (!username) {
    showToast("กรุณากรอก username", "warning");
    return document.getElementById("inputUsername").focus();
  }
  if (!role) {
    showToast("กรุณาเลือก Role", "warning");
    return document.getElementById("inputRole").focus();
  }
  if (!id && !password) {
    showToast("กรุณากรอกรหัสผ่าน", "warning");
    return document.getElementById("inputPassword").focus();
  }
  if (password) {
    const policyErr = validatePassword(password);
    if (policyErr) {
      showToast(policyErr, "warning");
      return document.getElementById("inputPassword").focus();
    }
  }
  if (password !== passwordConfirm) {
    showToast("รหัสผ่านไม่ตรงกัน", "warning");
    return document.getElementById("inputPasswordConfirm").focus();
  }

  const today = new Date().toISOString().split("T")[0];

  let promise;
  if (id) {
    const payload = denormalizeUser({ name, email, username, phone, role, status });
    if (password) payload.password = password;
    promise = updateUserDB(Number(id), payload).then(function() {
      logActivity("update", "Users", "แก้ไขผู้ใช้: " + name);
    });
  } else {
    const payload = denormalizeUser({
      name, email, username, phone, password, role, status,
      lastLogin: today, mustChangePassword: false
    });
    promise = createUserDB(payload).then(function() {
      logActivity("create", "Users", "เพิ่มผู้ใช้ใหม่: " + name);
    });
  }

  promise
    .then(reloadUsers)
    .then(function() {
      closeModalById("userModal");
      applyFilters();
      showToast(id ? "แก้ไขผู้ใช้สำเร็จ" : "เพิ่มผู้ใช้ใหม่สำเร็จ", "success");
    })
    .catch(function(err) {
      console.error(err);
      showToast("บันทึกไม่สำเร็จ: " + (err && err.message ? err.message : "เชื่อมต่อ server ไม่ได้"), "error");
    });
}

function editUser(id) {
  const u = users.find((item) => item.id === id);
  if (u) openUserModal("Edit User", u);
}

function toggleUserStatus(id, isActive) {
  const newStatus = isActive ? "active" : "inactive";
  updateUserDB(id, { status: newStatus })
    .then(function () { return reloadUsers(); })
    .then(function () { applyFilters(); })
    .catch(function (err) {
      console.error(err);
      if (typeof showToast === "function") showToast("ผิดพลาด", "เปลี่ยนสถานะไม่สำเร็จ", "error");
    });
}

// ============ Reset Password (Admin) — ใช้ generateTempPassword จาก auth-guard.js ============
function resetUserPassword(id) {
  const u = users.find((item) => item.id === id);
  if (!u) return;
  showConfirm({
    title: "รีเซ็ตรหัสผ่าน",
    message: "ต้องการรีเซ็ตรหัสผ่านของ <strong>" + u.name + "</strong> ใช่ไหม? ระบบจะสร้างรหัสชั่วคราวและบังคับให้ผู้ใช้เปลี่ยนรหัสเมื่อ login ครั้งถัดไป",
    okText: "Reset",
    okColor: "#47b8b4",
    onConfirm: function () {
      const temp = generateTempPassword(10);
      updateUserDB(u.id, { password: temp, must_change_password: true })
        .then(function() {
          clearLoginFailures(u.username || "");
          clearLoginFailures(u.email || "");
          logActivity("update", "Users", "Admin รีเซ็ตรหัสผ่านให้: " + u.name);
          document.getElementById("tempPwdUserName").textContent = u.name;
          const codeEl = document.getElementById("tempPwdValue");
          codeEl.textContent = temp;
          const box = codeEl.parentElement;
          box.classList.remove("copied");
          openModalById("tempPasswordModal");
          return reloadUsers();
        })
        .then(applyFilters)
        .catch(function(err) {
          console.error(err);
          showToast("รีเซ็ตรหัสผ่านไม่สำเร็จ", "error");
        });
    },
  });
}

function copyTempPassword() {
  const code = document.getElementById("tempPwdValue").textContent;
  const box = document.getElementById("tempPwdValue").parentElement;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(code).then(function() {
      box.classList.add("copied");
      setTimeout(function() { box.classList.remove("copied"); }, 1500);
    });
  } else {
    const ta = document.createElement("textarea");
    ta.value = code;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    box.classList.add("copied");
    setTimeout(function() { box.classList.remove("copied"); }, 1500);
  }
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
      deleteUserDB(id)
        .then(function() {
          logActivity("delete", "Users", "ลบผู้ใช้: " + u.name);
          return reloadUsers();
        })
        .then(function() {
          applyFilters();
          showToast("ลบผู้ใช้สำเร็จ", "success");
        })
        .catch(function(err) {
          console.error(err);
          showToast("ลบไม่สำเร็จ", "error");
        });
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

// ============ Password Strength ============
function calcPasswordStrength(pwd) {
  if (!pwd) return 0;
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
  if (/\d/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  return Math.min(4, score);
}

function updatePasswordStrength(pwd) {
  const wrap = document.getElementById("passwordStrength");
  if (!wrap) return;
  const level = calcPasswordStrength(pwd);
  const labels = ["—", "อ่อนมาก", "อ่อน", "ปานกลาง", "แข็งแรง"];
  wrap.setAttribute("data-level", level);
  wrap.querySelector(".password-strength-label").textContent = labels[level];
}

// ============ Random Fill (dev tool) ============
if (typeof registerRandomFill === "function") {
  registerRandomFill({
    target: "#userModal",
    fill: function () {
      setFieldValue("inputName", randomPersonName());
      setFieldValue("inputEmail", randomEmail());
      setFieldValue("inputUsername", randomUsername());
      setFieldValue("inputPhone", randomPhone());
      setFieldValue("inputPassword", "Pass1234!");
      setFieldValue("inputPasswordConfirm", "Pass1234!");
      if (typeof updatePasswordStrength === "function") updatePasswordStrength("Pass1234!");
      pickRandomSelectOption("inputRole", { includeEmpty: false });
      var sw = document.getElementById("inputStatus");
      if (sw) {
        sw.checked = rdBool(0.85);
        sw.dispatchEvent(new Event("change", { bubbles: true }));
      }
    },
  });
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

  // Password strength
  var pwdInput = document.getElementById("inputPassword");
  if (pwdInput) {
    pwdInput.addEventListener("input", function() { updatePasswordStrength(this.value); });
  }

  // Copy temp password button
  var copyBtn = document.getElementById("copyTempPwdBtn");
  if (copyBtn) copyBtn.addEventListener("click", copyTempPassword);

  // Show/hide password toggle
  document.querySelectorAll(".password-toggle").forEach(function(btn) {
    btn.addEventListener("click", function() {
      var target = document.getElementById(this.dataset.target);
      if (!target) return;
      var showing = target.type === "text";
      target.type = showing ? "password" : "text";
      var icon = this.querySelector("i");
      if (icon) {
        icon.setAttribute("data-lucide", showing ? "eye" : "eye-off");
        if (window.lucide) lucide.createIcons();
      }
    });
  });

  loadRolesIntoSelect();

  var modeP = (typeof getAppMode === "function") ? getAppMode() : Promise.resolve("test");
  Promise.all([modeP, reloadUsers()])
    .then(function (results) {
      currentAppMode = results[0] || "test";
      applyFilters();
    })
    .catch(function (err) {
      console.error(err);
      showToast("โหลดข้อมูลผู้ใช้ไม่สำเร็จ — ตรวจสอบการเชื่อมต่อ Supabase", "error", 5000);
    });
});
