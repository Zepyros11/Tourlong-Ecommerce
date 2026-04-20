// ============================================================
// roles-permissions.js — Roles (Supabase, permissions JSONB)
// ============================================================

var roles = [];

function updateStats() {
  document.getElementById("statAll").textContent = roles.length;
  document.getElementById("statActive").textContent = roles.filter(function (r) { return r.status === "active"; }).length;
}

function renderTable(data) {
  updateStats();
  var tbody = document.getElementById("roleTableBody");
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;color:#94a3b8;font-size:11px;">ยังไม่มี Role</td></tr>';
    lucide.createIcons();
    return;
  }
  tbody.innerHTML = data.map(function (r, i) {
    var permCount = (r.permissions || []).length;
    return '<tr>' +
      '<td>' + (i + 1) + '</td>' +
      '<td>' + (r.name || "") + '</td>' +
      '<td>' + (r.description || "—") + '</td>' +
      '<td>—</td>' +
      '<td><span class="badge" style="background-color:#eff6ff;color:#3b82f6;">' + permCount + ' permissions</span></td>' +
      '<td><div class="table-actions">' +
        '<button class="btn-icon-sm" onclick="editRole(' + r.id + ')"><i data-lucide="pencil"></i></button>' +
        '<button class="btn-icon-sm btn-danger" onclick="deleteRole(' + r.id + ')"><i data-lucide="trash-2"></i></button>' +
      '</div></td>' +
    '</tr>';
  }).join("");
  lucide.createIcons();
  if (typeof refreshSortableHeaders === "function") refreshSortableHeaders();
}

function openRoleModal(title, r) {
  document.getElementById("modalTitle").textContent = title;
  document.getElementById("editId").value = r ? r.id : "";
  document.getElementById("inputName").value = r ? (r.name || "") : "";
  document.getElementById("inputDesc").value = r ? (r.description || "") : "";

  var perms = r ? (r.permissions || []) : [];
  document.querySelectorAll(".permission-check").forEach(function (cb) {
    cb.checked = perms.indexOf(cb.value) !== -1;
  });

  openModalById("roleModal", function () { document.getElementById("inputName").focus(); });
}

function saveRole() {
  var id = document.getElementById("editId").value;
  var name = document.getElementById("inputName").value.trim();
  if (!name) return document.getElementById("inputName").focus();

  var permissions = [];
  document.querySelectorAll(".permission-check").forEach(function (cb) {
    if (cb.checked) permissions.push(cb.value);
  });

  var payload = {
    name: name,
    description: document.getElementById("inputDesc").value.trim() || null,
    permissions: permissions,
    status: "active",
  };

  var op = id ? updateRoleDB(Number(id), payload) : createRoleDB(payload);
  op.then(function () { return reloadRoles(); })
    .then(function () {
      closeModalById("roleModal");
      applyFilters();
    })
    .catch(function (err) { console.error(err); });
}

function editRole(id) {
  var r = roles.find(function (x) { return x.id === id; });
  if (r) openRoleModal("Edit Role", r);
}

function deleteRole(id) {
  var r = roles.find(function (x) { return x.id === id; });
  if (!r) return;
  showConfirm({
    title: "Confirm Delete",
    message: "ต้องการลบ Role <strong>" + r.name + "</strong> ใช่ไหม?",
    okText: "Delete", okColor: "#ef4444",
    onConfirm: function () {
      deleteRoleDB(id)
        .then(function () { return reloadRoles(); })
        .then(function () { applyFilters(); })
        .catch(function (err) { console.error(err); });
    },
  });
}

var currentSort = "default";

function getFilteredData() {
  var keyword = document.querySelector(".filter-search-input").value.toLowerCase();
  var data = roles.slice();
  if (keyword) {
    data = data.filter(function (r) {
      return (r.name || "").toLowerCase().includes(keyword) || (r.description || "").toLowerCase().includes(keyword);
    });
  }
  switch (currentSort) {
    case "name-asc":  data = data.slice().sort(function (a, b) { return (a.name || "").localeCompare(b.name || ""); }); break;
    case "name-desc": data = data.slice().sort(function (a, b) { return (b.name || "").localeCompare(a.name || ""); }); break;
  }
  return data;
}

function applyFilters() { renderTable(getFilteredData()); }

function reloadRoles() {
  return (typeof fetchRolesDB === "function" ? fetchRolesDB() : Promise.resolve([]))
    .then(function (rows) {
      roles = (rows || []).map(function (r) {
        return {
          id: r.id,
          name: r.name || "",
          description: r.description || "",
          permissions: Array.isArray(r.permissions) ? r.permissions : [],
          status: r.status || "active",
        };
      });
    });
}

// ============ Random Fill (dev tool) ============
if (typeof registerRandomFill === "function") {
  registerRandomFill({
    target: "#roleModal",
    fill: function () {
      setFieldValue("inputName", rdPick(["Admin", "Manager", "Staff", "Supervisor", "Editor", "Viewer"]));
      setFieldValue("inputDesc", randomNote());
      var checks = document.querySelectorAll(".permission-check");
      checks.forEach(function (cb) {
        cb.checked = rdBool(0.5);
      });
    },
  });
}

document.addEventListener("DOMContentLoaded", function () {
  document.querySelector(".filter-search-input").addEventListener("input", applyFilters);
  document.getElementById("sortSelect").addEventListener("change", function () {
    currentSort = this.value;
    applyFilters();
  });
  document.getElementById("addRoleBtn").addEventListener("click", function () {
    openRoleModal("Add Role", null);
  });

  reloadRoles()
    .then(function () { applyFilters(); })
    .catch(function (err) { console.error(err); applyFilters(); });
});
