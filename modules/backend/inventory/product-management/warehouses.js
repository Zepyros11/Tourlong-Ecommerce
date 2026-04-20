// ============================================================
// warehouses.js — Warehouse Management (simple table)
// ============================================================

// ============ Data (Supabase) ============
var warehouses = [];

function reloadWarehouses() {
  return fetchWarehousesDB().then(function (rows) {
    warehouses = (rows || []).map(function (r) {
      return {
        id: r.id,
        name: r.name || "",
        code: r.code || "",
        location: r.location || "",
        manager: r.manager || "",
        status: r.status || "active",
      };
    });
    return warehouses;
  });
}

function generateCode() {
  var maxNum = 0;
  warehouses.forEach(function (w) {
    var match = (w.code || "").match(/^WH-(\d+)$/);
    if (match) { var n = parseInt(match[1], 10); if (n > maxNum) maxNum = n; }
  });
  var next = maxNum + 1;
  return "WH-" + (next < 10 ? "0" : "") + next;
}

function getWhById(id) {
  return warehouses.find(function (w) { return w.id === id; }) || null;
}

// ============ Stats ============
function updateStats() {
  document.getElementById("statAll").textContent = warehouses.length;
  document.getElementById("statActive").textContent = warehouses.filter(function (w) { return w.status === "active"; }).length;
}

// ============ Render Table ============
function renderTable(data) {
  updateStats();
  var tbody = document.getElementById("whTableBody");
  tbody.innerHTML = data.map(function (w, i) {
    return '<tr>' +
      '<td>' + (i + 1) + '</td>' +
      '<td style="font-weight:600;">' + w.name + '</td>' +
      '<td><span style="font-size:10px;font-weight:700;color:#3b82f6;background:#eff6ff;padding:2px 8px;border-radius:6px;">' + (w.code || '—') + '</span></td>' +
      '<td style="font-size:11px;color:#64748b;">' + (w.location || '—') + '</td>' +
      '<td style="font-size:11px;color:#64748b;">' + (w.manager || '—') + '</td>' +
      '<td>' +
        '<label class="toggle" style="vertical-align:middle;">' +
          '<input type="checkbox" onchange="toggleStatus(' + w.id + ',this.checked)"' + (w.status === "active" ? ' checked' : '') + ' />' +
          '<span class="toggle-slider"></span>' +
        '</label>' +
      '</td>' +
      '<td><div class="table-actions">' +
        '<button class="btn-icon-sm" onclick="editWarehouse(' + w.id + ')"><i data-lucide="pencil"></i></button>' +
        '<button class="btn-icon-sm btn-danger" onclick="deleteWarehouse(' + w.id + ')"><i data-lucide="trash-2"></i></button>' +
      '</div></td>' +
    '</tr>';
  }).join("") || '<tr><td colspan="7" style="text-align:center;color:#94a3b8;padding:30px;">ยังไม่มีคลังสินค้า</td></tr>';
  lucide.createIcons();
  if (typeof refreshSortableHeaders === "function") refreshSortableHeaders();
}

// ============ Toggle Status ============
function toggleStatus(id, isActive) {
  updateWarehouseDB(id, { status: isActive ? "active" : "inactive" })
    .then(reloadWarehouses)
    .then(applyFilters)
    .catch(function (err) {
      console.error(err);
      reloadWarehouses().then(applyFilters);
    });
}

// ============ Modal ============
function openWhModal(w) {
  document.getElementById("modalTitle").textContent = w ? "Edit Warehouse" : "Add Warehouse";
  document.getElementById("editId").value = w ? w.id : "";
  document.getElementById("inputName").value = w ? w.name : "";
  document.getElementById("inputCode").value = w ? (w.code || "") : generateCode();
  document.getElementById("inputLocation").value = w ? (w.location || "") : "";
  document.getElementById("inputManager").value = w ? (w.manager || "") : "";
  document.getElementById("inputStatus").checked = w ? w.status === "active" : true;
  var lbl = document.getElementById("inputStatusLabel");
  var isActive = w ? w.status === "active" : true;
  lbl.textContent = isActive ? "Active" : "Inactive";
  lbl.classList.toggle("active-label", isActive);
  openModalById("whModal", function () { document.getElementById("inputName").focus(); });
}

function editWarehouse(id) {
  var w = getWhById(id);
  if (w) openWhModal(w);
}

function saveWarehouse() {
  var id = document.getElementById("editId").value;
  var name = document.getElementById("inputName").value.trim();
  var code = document.getElementById("inputCode").value.trim().toUpperCase();
  var location = document.getElementById("inputLocation").value.trim();
  var manager = document.getElementById("inputManager").value.trim();
  var status = document.getElementById("inputStatus").checked ? "active" : "inactive";

  if (!name) { document.getElementById("inputName").focus(); return; }

  var payload = { name: name, code: code, location: location, manager: manager, status: status };
  var promise = id
    ? updateWarehouseDB(Number(id), payload)
    : createWarehouseDB(payload);

  promise
    .then(reloadWarehouses)
    .then(function () {
      closeModalById("whModal");
      applyFilters();
    })
    .catch(function (err) {
      console.error(err);
      alert("บันทึกไม่สำเร็จ");
    });
}

// ============ Delete ============
function deleteWarehouse(id) {
  var w = getWhById(id);
  if (!w) return;
  showConfirm({
    title: "Delete Warehouse",
    message: "ต้องการลบคลังสินค้า <strong>" + w.name + "</strong> ใช่ไหม?",
    okText: "Delete", okColor: "#ef4444",
    onConfirm: function () {
      deleteWarehouseDB(id)
        .then(reloadWarehouses)
        .then(applyFilters)
        .catch(function (err) { console.error(err); });
    },
  });
}

// ============ Filter & Sort ============
var currentSort = "default";

function getFilteredData() {
  var keyword = document.querySelector(".filter-search-input").value.toLowerCase();
  var data = warehouses;

  if (keyword) {
    data = data.filter(function (w) {
      return w.name.toLowerCase().includes(keyword) ||
        (w.code || "").toLowerCase().includes(keyword) ||
        (w.location || "").toLowerCase().includes(keyword) ||
        (w.manager || "").toLowerCase().includes(keyword);
    });
  }

  switch (currentSort) {
    case "name-asc": data = [].concat(data).sort(function (a, b) { return a.name.localeCompare(b.name); }); break;
    case "name-desc": data = [].concat(data).sort(function (a, b) { return b.name.localeCompare(a.name); }); break;
  }
  return data;
}

function applyFilters() { renderTable(getFilteredData()); }

// ============ Random fill (dev) ============
if (typeof registerRandomFill === "function") {
  registerRandomFill({
    target: "#whModal",
    fill: function () {
      setFieldValue("inputName", "คลัง" + rdPick(["หลัก", "สาขา 1", "สาขา 2", "ภาคเหนือ", "ภาคใต้", "กลาง"]));
      // inputCode readonly — ข้าม (generateCode ทำให้แล้วตอนเปิด modal)
      setFieldValue("inputLocation", randomAddress());
      setFieldValue("inputManager", randomPersonName());
      var sw = document.getElementById("inputStatus");
      if (sw) { sw.checked = rdBool(0.85); sw.dispatchEvent(new Event("change", { bubbles: true })); }
    },
  });
}

// ============ Init ============
document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("addWhBtn").addEventListener("click", function () { openWhModal(null); });
  document.querySelector(".filter-search-input").addEventListener("input", applyFilters);
  document.getElementById("sortSelect").addEventListener("change", function () {
    currentSort = this.value;
    applyFilters();
  });

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

  // โหลดข้อมูลจาก Supabase
  reloadWarehouses()
    .then(applyFilters)
    .catch(function (err) {
      console.error(err);
      applyFilters();
    });
});
