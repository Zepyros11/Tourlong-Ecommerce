// ============================================================
// unit-of-measure.js — logic เฉพาะหน้า Unit of Measure
// ------------------------------------------------------------
// ใช้ร่วมกับ: modal.js, confirm.js
// ============================================================

// ============ Mock Database ============
let units = [
  { id: 1, name: "ชิ้น",       abbr: "pcs",  description: "หน่วยนับเป็นชิ้น",           status: "active" },
  { id: 2, name: "กล่อง",      abbr: "box",  description: "หน่วยนับเป็นกล่อง",          status: "active" },
  { id: 3, name: "แพ็ค",       abbr: "pack", description: "หน่วยนับเป็นแพ็ค",           status: "active" },
  { id: 4, name: "กิโลกรัม",    abbr: "kg",   description: "หน่วยนับน้ำหนักเป็นกิโลกรัม", status: "active" },
  { id: 5, name: "ลิตร",       abbr: "L",    description: "หน่วยนับปริมาตรเป็นลิตร",     status: "active" },
  { id: 6, name: "เมตร",       abbr: "m",    description: "หน่วยนับความยาวเป็นเมตร",     status: "inactive" },
  { id: 7, name: "โหล",        abbr: "dz",   description: "หน่วยนับเป็นโหล (12 ชิ้น)",   status: "active" },
  { id: 8, name: "ถุง",        abbr: "bag",  description: "หน่วยนับเป็นถุง",             status: "active" },
];

// ============ Update Stat Cards ============
function updateStats() {
  document.getElementById("statAll").textContent = units.length;
  document.getElementById("statActive").textContent = units.filter((u) => u.status === "active").length;
}

// ============ Render Table ============
function renderTable(data) {
  updateStats();
  const tbody = document.getElementById("unitTableBody");
  tbody.innerHTML = data
    .map(
      (u, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${u.name}</td>
      <td>${u.abbr}</td>
      <td>${u.description}</td>
      <td><span class="badge badge-${u.status === "active" ? "active" : "inactive"}">${u.status === "active" ? "Active" : "Inactive"}</span></td>
      <td>
        <div class="table-actions">
          <button class="btn-icon-sm" onclick="editUnit(${u.id})"><i data-lucide="pencil"></i></button>
          <button class="btn-icon-sm btn-danger" onclick="deleteUnit(${u.id})"><i data-lucide="trash-2"></i></button>
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
function openUnitModal(title, u) {
  document.getElementById("modalTitle").textContent = title;
  document.getElementById("editId").value = u ? u.id : "";
  document.getElementById("inputName").value = u ? u.name : "";
  document.getElementById("inputAbbr").value = u ? u.abbr : "";
  document.getElementById("inputDesc").value = u ? u.description : "";
  document.getElementById("inputStatus").checked = u ? u.status === "active" : true;
  var _lbl = document.getElementById("inputStatusLabel"); if(_lbl) { _lbl.textContent = (u ? u.status === "active" : true) ? "Active" : "Inactive"; _lbl.classList.toggle("active-label", u ? u.status === "active" : true); }
  openModalById("unitModal", function () {
    document.getElementById("inputName").focus();
  });
}

function saveUnit() {
  const id = document.getElementById("editId").value;
  const name = document.getElementById("inputName").value.trim();
  const abbr = document.getElementById("inputAbbr").value.trim();
  const description = document.getElementById("inputDesc").value.trim();
  const status = document.getElementById("inputStatus").checked ? "active" : "inactive";
  if (!name) return document.getElementById("inputName").focus();

  if (id) {
    const u = units.find((item) => item.id === Number(id));
    if (u) {
      u.name = name;
      u.abbr = abbr;
      u.description = description;
      u.status = status;
    }
  } else {
    const newId = units.length ? Math.max(...units.map((item) => item.id)) + 1 : 1;
    units.push({ id: newId, name, abbr, description, status });
  }
  closeModalById("unitModal");
  applyFilters();
}

function editUnit(id) {
  const u = units.find((item) => item.id === id);
  if (u) openUnitModal("Edit Unit", u);
}

// ============ Delete (ใช้ confirm.js) ============
function deleteUnit(id) {
  const u = units.find((item) => item.id === id);
  if (!u) return;
  showConfirm({
    title: "Confirm Delete",
    message: "ต้องการลบหน่วยนับ <strong>" + u.name + "</strong> ใช่ไหม?",
    okText: "Delete",
    okColor: "#ef4444",
    onConfirm: function () {
      units = units.filter((item) => item.id !== id);
      applyFilters();
    },
  });
}

// ============ Filter & Sort ============
let currentSort = "default";

function getFilteredData() {
  const keyword = document.querySelector(".filter-search-input").value.toLowerCase();
  let data = units;

  if (keyword) {
    data = data.filter(
      (u) =>
        u.name.toLowerCase().includes(keyword) ||
        u.abbr.toLowerCase().includes(keyword) ||
        u.description.toLowerCase().includes(keyword)
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

  document.getElementById("addUnitBtn").addEventListener("click", function () {
    openUnitModal("Add Unit", null);
  });

  // Status toggle listener
  var statusToggle = document.getElementById("inputStatus");
  if (statusToggle) {
    statusToggle.addEventListener("change", function() {
      var lbl = document.getElementById("inputStatusLabel");
      if (lbl) { lbl.textContent = this.checked ? "Active" : "Inactive"; lbl.classList.toggle("active-label", this.checked); }
    });
  }

  renderTable(units);
});
