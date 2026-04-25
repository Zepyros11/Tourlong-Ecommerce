// ============================================================
// unit-of-measure.js — logic เฉพาะหน้า Unit of Measure
// ------------------------------------------------------------
// ใช้ร่วมกับ: modal.js, confirm.js, toast.js, supabase-client.js
// ============================================================

// ============ Database (Supabase) ============
let units = [];
var currentAppMode = "test";

function normalizeUnit(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    abbr: row.abbr || "",
    description: row.description || "",
    baseUnitId: row.base_unit_id || null,
    toBaseFactor: Number(row.to_base_factor) || 1,
    status: row.status || "active",
  };
}

function denormalizeUnit(unit) {
  var row = {};
  if (unit.name !== undefined) row.name = unit.name;
  if (unit.abbr !== undefined) row.abbr = unit.abbr;
  if (unit.description !== undefined) row.description = unit.description;
  if (unit.baseUnitId !== undefined) row.base_unit_id = unit.baseUnitId;
  if (unit.toBaseFactor !== undefined) row.to_base_factor = unit.toBaseFactor;
  if (unit.status !== undefined) row.status = unit.status;
  return row;
}

function reloadUnits() {
  return fetchUnitsDB().then(function (rows) {
    units = (rows || []).map(normalizeUnit);
    return units;
  });
}

// ============ Helper: หา unit จาก id ============
function getUnitById(id) {
  if (!id) return null;
  return units.find(function (u) { return u.id === id; }) || null;
}

// ============ Helper: format conversion text ============
function formatConversion(u) {
  if (!u.baseUnitId) return '<span style="color:#10b981;font-weight:600;">Base Unit</span>';
  var base = getUnitById(u.baseUnitId);
  if (!base) return '<span style="color:#94a3b8;">—</span>';
  return '1 ' + u.name + ' = ' + u.toBaseFactor + ' ' + base.name;
}

// ============ Update Stat Cards ============
function updateStats() {
  document.getElementById("statAll").textContent = units.length;
  document.getElementById("statActive").textContent = units.filter(function (u) { return u.status === "active"; }).length;
}

// ============ Build Tree Structure ============
var collapsedGroups = {}; // เก็บ state ยุบ/ขยาย ตาม base unit id

function buildUnitTree(data) {
  // ใช้ data (filtered) เป็นตัวกรอง แต่หา children จาก units ทั้งหมด
  var dataIds = {};
  data.forEach(function (u) { dataIds[u.id] = true; });

  var bases = data.filter(function (u) { return !u.baseUnitId; });
  var result = [];
  var placed = {};

  bases.forEach(function (base) {
    // นับ children ทั้งหมดของ base (เฉพาะที่อยู่ใน filtered data)
    var children = data.filter(function (u) { return u.baseUnitId === base.id; });
    result.push({ unit: base, level: 0, childCount: children.length });
    placed[base.id] = true;

    if (!collapsedGroups[base.id]) {
      children.forEach(function (child) {
        result.push({ unit: child, level: 1, parentId: base.id });
        placed[child.id] = true;
      });
    } else {
      // collapsed → mark children เป็น placed เพื่อไม่ให้ตกไป fallback
      children.forEach(function (child) { placed[child.id] = true; });
    }
  });

  // units ที่ base ไม่อยู่ใน filtered data (กรณี search เจอแค่ child)
  data.forEach(function (u) {
    if (!placed[u.id]) {
      result.push({ unit: u, level: 1, parentId: u.baseUnitId });
    }
  });
  return result;
}

function toggleUnitGroup(baseId) {
  collapsedGroups[baseId] = !collapsedGroups[baseId];
  applyFilters();
}

function toggleUnitStatus(id, isActive) {
  var newStatus = isActive ? "active" : "inactive";

  // ถ้าปิด base unit → ปิด sub-units ทั้งหมดด้วย
  var children = [];
  if (!isActive) {
    children = units.filter(function (u) { return u.baseUnitId === id; });
  }

  var promises = [updateUnitDB(id, { status: newStatus })];
  children.forEach(function (child) {
    promises.push(updateUnitDB(child.id, { status: "inactive" }));
  });

  Promise.all(promises)
    .then(reloadUnits)
    .then(function () {
      applyFilters();
      var msg = isActive ? "เปิดใช้งานหน่วยนับแล้ว" : "ปิดใช้งานหน่วยนับแล้ว";
      if (children.length > 0) {
        msg += " (รวม " + children.length + " หน่วยย่อย)";
      }
      showToast(msg, "success");
    })
    .catch(function (err) {
      console.error(err);
      showToast("เปลี่ยนสถานะไม่สำเร็จ", "error");
      applyFilters();
    });
}

// ============ Render Table ============
function renderTable(data) {
  updateStats();
  var tbody = document.getElementById("unitTableBody");
  var tree = buildUnitTree(data);
  var counter = 0;

  tbody.innerHTML = tree
    .map(function (node) {
      var u = node.unit;
      var isBase = node.level === 0;
      counter++;

      var nameHtml = '';
      if (isBase) {
        var hasChildren = node.childCount > 0;
        var isCollapsed = collapsedGroups[u.id];
        var toggleBtn = '';
        if (hasChildren) {
          toggleBtn = '<button onclick="toggleUnitGroup(' + u.id + ')" style="' +
            'background:none;border:none;cursor:pointer;padding:0;margin-right:4px;display:inline-flex;align-items:center;' +
            'transition:transform 0.2s;transform:rotate(' + (isCollapsed ? '0deg' : '90deg') + ');">' +
            '<i data-lucide="chevron-right" style="width:14px;height:14px;color:#47b8b4;"></i>' +
            '</button>';
        }
        nameHtml = '<span style="font-weight:700;color:#1e293b;display:inline-flex;align-items:center;">' +
          toggleBtn +
          '<i data-lucide="layers" style="width:13px;height:13px;margin-right:5px;color:#47b8b4;"></i>' +
          u.name +
          (hasChildren ? '<span style="margin-left:6px;font-size:9px;font-weight:600;color:#94a3b8;background:#f1f5f9;padding:1px 6px;border-radius:8px;">' + node.childCount + '</span>' : '') +
          '</span>';
      } else {
        nameHtml = '<span style="padding-left:32px;display:inline-flex;align-items:center;gap:5px;color:#475569;">' +
          '<span style="color:#cbd5e1;font-size:14px;">└</span>' +
          '<i data-lucide="arrow-right" style="width:10px;height:10px;color:#94a3b8;"></i>' +
          u.name + '</span>';
      }

      var trStyle = isBase
        ? 'background:linear-gradient(90deg,#f0fdfa,#fff);border-left:3px solid #47b8b4;'
        : 'border-left:3px solid #e2e8f0;background:#fafbfc;';

      return '<tr style="' + trStyle + '">' +
        '<td>' + counter + '</td>' +
        '<td>' + nameHtml + '</td>' +
        '<td>' + u.abbr + '</td>' +
        '<td>' + formatConversion(u) + '</td>' +
        '<td>' + u.description + '</td>' +
        '<td>' +
          '<label class="toggle" style="vertical-align:middle;">' +
            '<input type="checkbox" onchange="toggleUnitStatus(' + u.id + ',this.checked)"' + (u.status === "active" ? ' checked' : '') + ' />' +
            '<span class="toggle-slider"></span>' +
          '</label>' +
        '</td>' +
        '<td>' +
          '<div class="table-actions">' +
            '<button class="btn-icon-sm" onclick="editUnit(' + u.id + ')"><i data-lucide="pencil"></i></button>' +
            (currentAppMode === "test" ? '<button class="btn-icon-sm btn-danger" onclick="deleteUnit(' + u.id + ')"><i data-lucide="trash-2"></i></button>' : '') +
          '</div>' +
        '</td>' +
      '</tr>';
    })
    .join("");
  lucide.createIcons();
  if (typeof refreshSortableHeaders === "function") refreshSortableHeaders();
}

// ============ Populate Base Unit Dropdown ============
function populateBaseUnitDropdown(currentEditingId) {
  var select = document.getElementById("inputBaseUnit");
  if (!select) return;
  var html = '<option value="">— ไม่มี (ตัวเองเป็น base unit) —</option>';
  units.forEach(function (u) {
    // ห้ามเลือกตัวเองเป็น base
    if (currentEditingId && u.id === currentEditingId) return;
    html += '<option value="' + u.id + '">' + u.name + (u.abbr ? ' (' + u.abbr + ')' : '') + '</option>';
  });
  select.innerHTML = html;
}

// ============ Toggle Factor Group based on Base Unit ============
function toggleFactorGroup() {
  var baseId = document.getElementById("inputBaseUnit").value;
  var group = document.getElementById("factorGroup");
  var label = document.getElementById("factorBaseLabel");
  if (baseId) {
    group.style.display = "";
    var base = getUnitById(Number(baseId));
    label.textContent = base ? base.name : "base unit";
  } else {
    group.style.display = "none";
  }
}

// ============ Add / Edit Modal ============
function openUnitModal(title, u) {
  document.getElementById("modalTitle").textContent = title;
  document.getElementById("editId").value = u ? u.id : "";
  document.getElementById("inputName").value = u ? u.name : "";
  document.getElementById("inputAbbr").value = u ? u.abbr : "";
  document.getElementById("inputDesc").value = u ? u.description : "";
  populateBaseUnitDropdown(u ? u.id : null);
  document.getElementById("inputBaseUnit").value = u && u.baseUnitId ? String(u.baseUnitId) : "";
  document.getElementById("inputFactor").value = u && u.baseUnitId ? u.toBaseFactor : "";
  toggleFactorGroup();
  document.getElementById("inputStatus").checked = u ? u.status === "active" : true;
  var lbl = document.getElementById("inputStatusLabel");
  if (lbl) {
    var isActive = u ? u.status === "active" : true;
    lbl.textContent = isActive ? "Active" : "Inactive";
    lbl.classList.toggle("active-label", isActive);
  }
  openModalById("unitModal", function () {
    document.getElementById("inputName").focus();
  });
}

function saveUnit() {
  var id = document.getElementById("editId").value;
  var name = document.getElementById("inputName").value.trim();
  var abbr = document.getElementById("inputAbbr").value.trim();
  var description = document.getElementById("inputDesc").value.trim();
  var baseUnitId = document.getElementById("inputBaseUnit").value;
  var factorRaw = document.getElementById("inputFactor").value;
  var status = document.getElementById("inputStatus").checked ? "active" : "inactive";

  if (!name) {
    showToast("กรุณากรอกชื่อหน่วย", "warning");
    return document.getElementById("inputName").focus();
  }

  var baseUnitIdValue = baseUnitId ? Number(baseUnitId) : null;
  var factorValue = 1;
  if (baseUnitIdValue) {
    factorValue = parseFloat(factorRaw);
    if (!factorValue || factorValue <= 0) {
      showToast("กรุณากรอก factor (ต้องมากกว่า 0)", "warning");
      return document.getElementById("inputFactor").focus();
    }
  }

  var payload = denormalizeUnit({
    name: name,
    abbr: abbr,
    description: description,
    baseUnitId: baseUnitIdValue,
    toBaseFactor: factorValue,
    status: status,
  });

  var promise = id
    ? updateUnitDB(Number(id), payload)
    : createUnitDB(payload);

  promise
    .then(reloadUnits)
    .then(function () {
      closeModalById("unitModal");
      applyFilters();
      showToast(id ? "แก้ไขหน่วยสำเร็จ" : "เพิ่มหน่วยใหม่สำเร็จ", "success");
    })
    .catch(function (err) {
      console.error(err);
      showToast("บันทึกไม่สำเร็จ: " + (err && err.message ? err.message : "เชื่อมต่อ server ไม่ได้"), "error");
    });
}

function editUnit(id) {
  var u = getUnitById(id);
  if (u) openUnitModal("Edit Unit", u);
}

// ============ Delete ============
function deleteUnit(id) {
  var u = getUnitById(id);
  if (!u) return;
  // เช็คว่ามี unit อื่นที่ใช้ตัวนี้เป็น base ไหม
  var dependents = units.filter(function (x) { return x.baseUnitId === id; });
  if (dependents.length > 0) {
    showToast("ลบไม่ได้ — มีหน่วย " + dependents.map(function(x){return x.name;}).join(", ") + " ใช้เป็น base unit อยู่", "error", 5000);
    return;
  }
  showConfirm({
    title: "Confirm Delete",
    message: "ต้องการลบหน่วยนับ <strong>" + u.name + "</strong> ใช่ไหม?",
    okText: "Delete",
    okColor: "#ef4444",
    onConfirm: function () {
      deleteUnitDB(id)
        .then(reloadUnits)
        .then(function () {
          applyFilters();
          showToast("ลบหน่วยสำเร็จ", "success");
        })
        .catch(function (err) {
          console.error(err);
          showToast("ลบไม่สำเร็จ", "error");
        });
    },
  });
}

// ============ Filter & Sort ============
let currentSort = "default";

function getFilteredData() {
  var keyword = document.querySelector(".filter-search-input").value.toLowerCase();
  var data = units;

  if (keyword) {
    data = data.filter(function (u) {
      return u.name.toLowerCase().includes(keyword) ||
        u.abbr.toLowerCase().includes(keyword) ||
        u.description.toLowerCase().includes(keyword);
    });
  }

  switch (currentSort) {
    case "name-asc":
      data = [].concat(data).sort(function (a, b) { return a.name.localeCompare(b.name); });
      break;
    case "name-desc":
      data = [].concat(data).sort(function (a, b) { return b.name.localeCompare(a.name); });
      break;
  }

  return data;
}

function applyFilters() {
  renderTable(getFilteredData());
}

// ============ Random fill (dev) ============
if (typeof registerRandomFill === "function") {
  registerRandomFill({
    target: "#unitModal",
    fill: function () {
      var u = randomUnit();
      setFieldValue("inputName", u.name);
      setFieldValue("inputAbbr", u.abbr);
      setFieldValue("inputDesc", randomNote());
      // Base unit = empty (ให้ตัวเองเป็น base unit) — factor group ซ่อนอยู่
      var baseSel = document.getElementById("inputBaseUnit");
      if (baseSel) { baseSel.value = ""; baseSel.dispatchEvent(new Event("change", { bubbles: true })); }
      var sw = document.getElementById("inputStatus");
      if (sw) { sw.checked = rdBool(0.85); sw.dispatchEvent(new Event("change", { bubbles: true })); }
    },
  });
}

// ============ Init ============
document.addEventListener("DOMContentLoaded", function () {
  document.querySelector(".filter-search-input").addEventListener("input", applyFilters);

  document.getElementById("sortSelect").addEventListener("change", function () {
    currentSort = this.value;
    applyFilters();
  });

  document.getElementById("addUnitBtn").addEventListener("click", function () {
    openUnitModal("Add Unit", null);
  });

  // Status toggle
  var statusToggle = document.getElementById("inputStatus");
  if (statusToggle) {
    statusToggle.addEventListener("change", function () {
      var lbl = document.getElementById("inputStatusLabel");
      if (lbl) {
        lbl.textContent = this.checked ? "Active" : "Inactive";
        lbl.classList.toggle("active-label", this.checked);
      }
    });
  }

  // Base unit change → toggle factor group
  var baseSelect = document.getElementById("inputBaseUnit");
  if (baseSelect) baseSelect.addEventListener("change", toggleFactorGroup);

  // Initial load + app mode
  var modeP = (typeof getAppMode === "function") ? getAppMode() : Promise.resolve("test");
  Promise.all([modeP, reloadUnits()])
    .then(function (results) {
      currentAppMode = results[0] || "test";
      applyFilters();
    })
    .catch(function (err) {
      console.error(err);
      showToast("โหลดข้อมูลหน่วยนับไม่สำเร็จ — ตรวจสอบการเชื่อมต่อ Supabase", "error", 5000);
    });
});
