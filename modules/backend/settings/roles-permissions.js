// ============================================================
// roles-permissions.js — Roles (Supabase, permissions JSONB)
// ============================================================

// Permission groups — auto-derive จาก sidebarMenu (sidebar-menu.js)
// ข้าม disabled groups (จัดส่ง/รายงาน) และ adminOnly (ผู้พัฒนา)
// แต่ละ page default มี actions = ["view", "manage"]
// ถ้าหน้าไหนต้องการ action พิเศษ (เช่น approve) ให้เพิ่มใน PERMISSION_ACTION_OVERRIDES ด้านล่าง
var ACTION_LABELS = { view: "ดู", manage: "จัดการ", approve: "อนุมัติ" };
var DEFAULT_ACTIONS = ["view", "manage"];

// key = "<moduleKey>_<href ตัด .html ออก>" → ใช้ override actions
var PERMISSION_ACTION_OVERRIDES = {
  "purchasing_purchase-orders": ["view", "manage", "approve"],
  "settings_activity-log":      ["view"],
};

function buildPermissionGroups() {
  if (typeof sidebarMenu === "undefined" || !Array.isArray(sidebarMenu)) return [];
  return sidebarMenu
    .filter(function (g) { return !g.disabled && !g.adminOnly; })
    .map(function (g) {
      var match = (g.basePath || "").match(/^\/modules\/backend\/([^/]+)/);
      var moduleKey = match ? match[1] : (g.group || "").toLowerCase();
      return {
        key: moduleKey,
        label: g.group,
        icon: g.icon,
        pages: (g.items || [])
          .filter(function (it) { return it && it.type !== "divider" && it.href; })
          .map(function (it) {
            var slug = it.href.replace(/\.html$/i, "");
            var pageKey = moduleKey + "_" + slug;
            return {
              value: pageKey,
              label: it.name,
              actions: PERMISSION_ACTION_OVERRIDES[pageKey] || DEFAULT_ACTIONS,
            };
          }),
      };
    })
    .filter(function (g) { return g.pages.length > 0; });
}

var PERMISSION_GROUPS = buildPermissionGroups();

function renderPermissionCheckboxes() {
  var box = document.getElementById("permissionsContainer");
  if (!box) return;

  var html = '';
  // global toolbar
  html += '<div class="perm-toolbar">';
  html += '<button type="button" class="perm-btn-mini" onclick="setAllPermissions(true)">เลือกทั้งหมด</button>';
  html += '<button type="button" class="perm-btn-mini danger" onclick="setAllPermissions(false)">ล้างทั้งหมด</button>';
  html += '</div>';

  html += '<div class="perm-table">';
  PERMISSION_GROUPS.forEach(function (g) {
    html += '<div class="perm-group" data-group="' + g.key + '">';
    // group header
    html += '<div class="perm-group-header">';
    html += '<i data-lucide="' + g.icon + '"></i>';
    html += '<span>' + g.label + '</span>';
    html += '<div class="perm-group-actions">';
    html += '<button type="button" class="perm-btn-mini" onclick="setGroupPermissions(\'' + g.key + '\', true)">เลือก</button>';
    html += '<button type="button" class="perm-btn-mini danger" onclick="setGroupPermissions(\'' + g.key + '\', false)">ล้าง</button>';
    html += '</div>';
    html += '</div>';

    // page rows
    g.pages.forEach(function (p) {
      var actions = p.actions || DEFAULT_ACTIONS;
      var checks = actions.map(function (a) {
        return '<label class="form-checkbox">' +
                 '<input type="checkbox" value="' + p.value + '_' + a + '" class="permission-check" data-group="' + g.key + '"> ' +
                 (ACTION_LABELS[a] || a) +
               '</label>';
      }).join("");
      html += '<div class="perm-row">';
      html += '<div class="perm-row-name">' + p.label + '</div>';
      html += '<div class="perm-row-checks">' + checks + '</div>';
      html += '</div>';
    });
    html += '</div>';
  });
  html += '</div>';

  box.innerHTML = html;
  if (typeof lucide !== "undefined") lucide.createIcons();
}

function setAllPermissions(checked) {
  document.querySelectorAll('#permissionsContainer .permission-check').forEach(function (cb) {
    cb.checked = checked;
  });
}

function setGroupPermissions(groupKey, checked) {
  document.querySelectorAll('#permissionsContainer .permission-check[data-group="' + groupKey + '"]').forEach(function (cb) {
    cb.checked = checked;
  });
}

var roles = [];
var currentAppMode = "test";

function updateStats() {
  document.getElementById("statAll").textContent = roles.length;
  document.getElementById("statActive").textContent = roles.filter(function (r) { return r.status === "active"; }).length;
}

function renderTable(data) {
  updateStats();
  var tbody = document.getElementById("roleTableBody");
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;color:#94a3b8;font-size:11px;">ยังไม่มี Role</td></tr>';
    lucide.createIcons();
    return;
  }
  var showDelete = currentAppMode === "test";
  tbody.innerHTML = data.map(function (r, i) {
    var permCount = (r.permissions || []).length;
    var isActive = r.status === "active";
    var statusToggle =
      '<label class="toggle" title="' + (isActive ? "Active" : "Inactive") + '">' +
        '<input type="checkbox" ' + (isActive ? "checked" : "") + ' onchange="toggleRoleStatus(' + r.id + ', this.checked)" />' +
        '<span class="toggle-slider"></span>' +
      '</label>';
    var deleteBtn = showDelete
      ? '<button class="btn-icon-sm btn-danger" onclick="deleteRole(' + r.id + ')"><i data-lucide="trash-2"></i></button>'
      : '';
    return '<tr>' +
      '<td>' + (i + 1) + '</td>' +
      '<td>' + (r.name || "") + '</td>' +
      '<td>' + (r.description || "—") + '</td>' +
      '<td>—</td>' +
      '<td><span class="badge" style="background-color:#eff6ff;color:#3b82f6;">' + permCount + ' permissions</span></td>' +
      '<td>' + statusToggle + '</td>' +
      '<td><div class="table-actions">' +
        '<button class="btn-icon-sm" onclick="editRole(' + r.id + ')"><i data-lucide="pencil"></i></button>' +
        deleteBtn +
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

function toggleRoleStatus(id, isActive) {
  var newStatus = isActive ? "active" : "inactive";
  updateRoleDB(id, { status: newStatus })
    .then(function () { return reloadRoles(); })
    .then(function () { applyFilters(); })
    .catch(function (err) {
      console.error(err);
      if (typeof showToast === "function") showToast("ผิดพลาด", "เปลี่ยนสถานะไม่สำเร็จ", "error");
    });
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
  renderPermissionCheckboxes();
  document.querySelector(".filter-search-input").addEventListener("input", applyFilters);
  document.getElementById("sortSelect").addEventListener("change", function () {
    currentSort = this.value;
    applyFilters();
  });
  document.getElementById("addRoleBtn").addEventListener("click", function () {
    openRoleModal("Add Role", null);
  });

  var modeP = (typeof getAppMode === "function") ? getAppMode() : Promise.resolve("test");
  Promise.all([modeP, reloadRoles()])
    .then(function (results) {
      currentAppMode = results[0] || "test";
      applyFilters();
    })
    .catch(function (err) { console.error(err); applyFilters(); });
});
