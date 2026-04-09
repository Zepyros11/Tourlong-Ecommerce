// ============================================================
// warehouses.js — Tree View + Single Form (Country > Branch > Warehouse)
// รองรับ 2 ชั้น (Country > Warehouse) หรือ 3 ชั้น (Country > Branch > Warehouse)
// ============================================================

// อ่านค่าจาก Advance Settings (localStorage)
var treeMode = localStorage.getItem("pathara_toggleBranch") === "true" ? 3 : 2;
// default = 3 ชั้น ถ้ายังไม่เคยตั้งค่า
if (localStorage.getItem("pathara_toggleBranch") === null) treeMode = 3;

// ============ Mock Data ============
var countries = [
  { id: 1, code: "TH", name: "Thailand",  status: "active" },
  { id: 2, code: "LA", name: "Laos",      status: "active" },
  { id: 3, code: "MM", name: "Myanmar",   status: "active" },
  { id: 4, code: "KH", name: "Cambodia",  status: "inactive" },
];

var branches = [
  { id: 1, countryId: 1, name: "สำนักงานใหญ่ กรุงเทพ", address: "123 ถ.สุขุมวิท กรุงเทพ",   phone: "02-123-4567", status: "active" },
  { id: 2, countryId: 1, name: "สาขาเชียงใหม่",       address: "456 ถ.นิมมานฯ เชียงใหม่",    phone: "053-123-456", status: "active" },
  { id: 3, countryId: 1, name: "สาขาหาดใหญ่",         address: "789 ถ.เพชรเกษม สงขลา",      phone: "074-123-456", status: "active" },
  { id: 4, countryId: 2, name: "สาขาเวียงจันทน์",      address: "Sisattanak, Vientiane",       phone: "+856-21-123", status: "active" },
  { id: 5, countryId: 3, name: "สาขาย่างกุ้ง",         address: "Bahan Township, Yangon",      phone: "+95-1-1234",  status: "inactive" },
];

var warehouses = [
  { id: 1, branchId: 1, name: "คลังกลาง บางนา",      location: "บางนา, กรุงเทพ",      manager: "สมชาย วงศ์ดี",    status: "active" },
  { id: 2, branchId: 1, name: "คลังออนไลน์ ลาดกระบัง", location: "ลาดกระบัง, กรุงเทพ",   manager: "ธนา รัตนกุล",     status: "active" },
  { id: 3, branchId: 2, name: "คลังภาคเหนือ",         location: "สันทราย, เชียงใหม่",    manager: "วิภา สุขใจ",      status: "active" },
  { id: 4, branchId: 3, name: "คลังภาคใต้",           location: "หาดใหญ่, สงขลา",       manager: "ประวิทย์ แก้วมณี", status: "active" },
  { id: 5, branchId: 4, name: "คลังเวียงจันทน์",       location: "Vientiane, Laos",       manager: "Kham Phong",      status: "active" },
  { id: 6, branchId: 5, name: "คลังย่างกุ้ง",          location: "Yangon, Myanmar",       manager: "Aung Win",        status: "inactive" },
];

// ============ Helpers ============
function getBranches(countryId) { return branches.filter(function(b) { return b.countryId === countryId; }); }
function getWarehouses(branchId) { return warehouses.filter(function(w) { return w.branchId === branchId; }); }
function getCountryName(id) { var c = countries.find(function(x) { return x.id === id; }); return c ? c.name : ""; }
function getBranchName(id) { var b = branches.find(function(x) { return x.id === id; }); return b ? b.name : ""; }
function getBranchCountryId(branchId) { var b = branches.find(function(x) { return x.id === branchId; }); return b ? b.countryId : null; }
function nextId(arr) { return arr.length ? Math.max.apply(null, arr.map(function(x) { return x.id; })) + 1 : 1; }

function statusBadge(s) {
  return '<span class="badge badge-' + (s === "active" ? "active" : "inactive") + '">' + (s === "active" ? "Active" : "Inactive") + '</span>';
}

function actionBtns(editFn, deleteFn) {
  return '<div style="display:flex;gap:4px;">' +
    '<button class="btn-icon-sm" onclick="' + editFn + '"><i data-lucide="pencil"></i></button>' +
    '<button class="btn-icon-sm btn-danger" onclick="' + deleteFn + '"><i data-lucide="trash-2"></i></button>' +
  '</div>';
}

// ============ Stats ============
function updateStats() {
  document.getElementById("statCountries").textContent = countries.length;
  document.getElementById("statBranches").textContent = branches.length;
  document.getElementById("statWarehouses").textContent = warehouses.length;
}

// ============ Dropdown Populators ============
function populateCountrySelect() {
  var el = document.getElementById("inputCountry");
  if (!el) return;
  el.innerHTML = countries.filter(function(c) { return c.status === "active"; }).map(function(c) {
    return '<option value="' + c.id + '">' + c.code + ' — ' + c.name + '</option>';
  }).join("");
}

function populateBranchSelect(countryId, selectedId) {
  var el = document.getElementById("inputBranch");
  if (!el) return;
  var filtered = branches.filter(function(b) { return b.countryId === Number(countryId) && b.status === "active"; });
  el.innerHTML = filtered.map(function(b) {
    return '<option value="' + b.id + '"' + (b.id === selectedId ? ' selected' : '') + '>' + b.name + '</option>';
  }).join("");
  if (!filtered.length) el.innerHTML = '<option value="">— ไม่มีสาขา —</option>';
}

function onCountryChange() {
  populateBranchSelect(document.getElementById("inputCountry").value);
}

// ============ Mode Toggle (2/3 ชั้น) ============
function setMode(mode) {
  treeMode = mode;
  document.getElementById("mode2Btn").classList.toggle("active", mode === 2);
  document.getElementById("mode3Btn").classList.toggle("active", mode === 3);
  // ซ่อน/แสดง branch stat card
  var branchCard = document.getElementById("statBranchCard");
  if (branchCard) branchCard.style.display = mode === 2 ? "none" : "flex";
  renderTree();
}

// ============ Toggle New Country / Branch ============
var isNewCountry = false;
var isNewBranch = false;

function toggleNewCountry() {
  isNewCountry = !isNewCountry;
  document.getElementById("countrySelectRow").style.display = isNewCountry ? "none" : "flex";
  document.getElementById("countryNewRow").style.display = isNewCountry ? "flex" : "none";
  if (isNewCountry) document.getElementById("inputCountryCode").focus();
}

function toggleNewBranch() {
  isNewBranch = !isNewBranch;
  document.getElementById("branchSelectRow").style.display = isNewBranch ? "none" : "flex";
  document.getElementById("branchNewRow").style.display = isNewBranch ? "flex" : "none";
  if (isNewBranch) document.getElementById("inputBranchName").focus();
}

// ============ Open Modal ============
function openAddModal() {
  document.getElementById("modalTitle").textContent = "Add Warehouse";
  document.getElementById("editId").value = "";
  document.getElementById("editType").value = "warehouse";

  // Reset toggle
  isNewCountry = false; isNewBranch = false;
  document.getElementById("countrySelectRow").style.display = "flex";
  document.getElementById("countryNewRow").style.display = "none";
  document.getElementById("branchSelectRow").style.display = "flex";
  document.getElementById("branchNewRow").style.display = "none";

  // Disable branch ถ้า 2 ชั้น
  var branchGroup = document.getElementById("branchFormGroup");
  if (branchGroup) {
    branchGroup.style.opacity = treeMode === 2 ? "0.4" : "1";
    branchGroup.style.pointerEvents = treeMode === 2 ? "none" : "auto";
  }

  // Reset fields
  document.getElementById("inputCountryCode").value = "";
  document.getElementById("inputCountryName").value = "";
  document.getElementById("inputBranchName").value = "";
  document.getElementById("inputWhName").value = "";
  document.getElementById("inputWhLocation").value = "";
  document.getElementById("inputWhManager").value = "";
  document.getElementById("inputWhStatus").checked = true;

  populateCountrySelect();
  setTimeout(function() { onCountryChange(); }, 50);
  openModalById("warehouseModal", function() { document.getElementById("inputWhName").focus(); });
}

function editWarehouse(id) {
  var w = warehouses.find(function(x) { return x.id === id; });
  if (!w) return;
  document.getElementById("modalTitle").textContent = "Edit Warehouse";
  document.getElementById("editId").value = w.id;
  document.getElementById("editType").value = "warehouse";

  isNewCountry = false; isNewBranch = false;
  document.getElementById("countrySelectRow").style.display = "flex";
  document.getElementById("countryNewRow").style.display = "none";
  document.getElementById("branchSelectRow").style.display = "flex";
  document.getElementById("branchNewRow").style.display = "none";

  populateCountrySelect();
  var countryId = getBranchCountryId(w.branchId);
  document.getElementById("inputCountry").value = countryId;
  setTimeout(function() { populateBranchSelect(countryId, w.branchId); }, 50);

  document.getElementById("inputWhName").value = w.name;
  document.getElementById("inputWhLocation").value = w.location;
  document.getElementById("inputWhManager").value = w.manager;
  document.getElementById("inputWhStatus").checked = w.status === "active";
  var _lbl = document.getElementById("inputWhStatusLabel"); if(_lbl) { _lbl.textContent = w.status === "active" ? "Active" : "Inactive"; _lbl.classList.toggle("active-label", w.status === "active"); }
  openModalById("warehouseModal");
}

function editCountry(id) {
  var c = countries.find(function(x) { return x.id === id; });
  if (!c) return;
  document.getElementById("modalTitle").textContent = "Edit Country";
  document.getElementById("editId").value = c.id;
  document.getElementById("editType").value = "country";

  // แสดง new country row พร้อมข้อมูลเดิม
  isNewCountry = true;
  document.getElementById("countrySelectRow").style.display = "none";
  document.getElementById("countryNewRow").style.display = "flex";
  document.getElementById("inputCountryCode").value = c.code;
  document.getElementById("inputCountryName").value = c.name;

  // ซ่อน branch + warehouse fields
  isNewBranch = false;
  document.getElementById("branchSelectRow").style.display = "flex";
  document.getElementById("branchNewRow").style.display = "none";
  document.getElementById("inputWhName").value = "";
  document.getElementById("inputWhLocation").value = "";
  document.getElementById("inputWhManager").value = "";

  openModalById("warehouseModal");
}

function editBranch(id) {
  var b = branches.find(function(x) { return x.id === id; });
  if (!b) return;
  document.getElementById("modalTitle").textContent = "Edit Branch";
  document.getElementById("editId").value = b.id;
  document.getElementById("editType").value = "branch";

  isNewCountry = false;
  document.getElementById("countrySelectRow").style.display = "flex";
  document.getElementById("countryNewRow").style.display = "none";
  populateCountrySelect();
  document.getElementById("inputCountry").value = b.countryId;

  isNewBranch = true;
  document.getElementById("branchSelectRow").style.display = "none";
  document.getElementById("branchNewRow").style.display = "flex";
  document.getElementById("inputBranchName").value = b.name;

  document.getElementById("inputWhName").value = "";
  document.getElementById("inputWhLocation").value = "";
  document.getElementById("inputWhManager").value = "";

  openModalById("warehouseModal");
}

// ============ Save All ============
function saveAll() {
  var editType = document.getElementById("editType").value;
  var editId = document.getElementById("editId").value;

  // ---- Save/Create Country ----
  var countryId;
  if (isNewCountry) {
    var code = document.getElementById("inputCountryCode").value.trim().toUpperCase();
    var cName = document.getElementById("inputCountryName").value.trim();
    if (!code || !cName) { document.getElementById("inputCountryCode").focus(); return; }

    if (editType === "country" && editId) {
      var existC = countries.find(function(x) { return x.id === Number(editId); });
      if (existC) { existC.code = code; existC.name = cName; }
      closeModalById("warehouseModal"); renderTree(); return;
    }
    // สร้าง country ใหม่
    var existing = countries.find(function(c) { return c.code === code; });
    if (existing) { countryId = existing.id; }
    else { countryId = nextId(countries); countries.push({ id: countryId, code: code, name: cName, status: "active" }); }
  } else {
    countryId = Number(document.getElementById("inputCountry").value);
  }

  if (editType === "country") { closeModalById("warehouseModal"); renderTree(); return; }

  // ---- Save/Create Branch (ข้ามถ้า 2 ชั้น) ----
  var branchId;
  if (treeMode === 2) {
    // 2 ชั้น: สร้าง auto branch ชื่อ "default" ถ้ายังไม่มี
    var defaultBranch = branches.find(function(b) { return b.countryId === countryId && b.name === "default"; });
    if (!defaultBranch) {
      branchId = nextId(branches);
      branches.push({ id: branchId, countryId: countryId, name: "default", address: "", phone: "", status: "active" });
    } else {
      branchId = defaultBranch.id;
    }
  } else {
    // 3 ชั้น
    if (isNewBranch) {
      var bName = document.getElementById("inputBranchName").value.trim();
      if (!bName) { document.getElementById("inputBranchName").focus(); return; }

      if (editType === "branch" && editId) {
        var existB = branches.find(function(x) { return x.id === Number(editId); });
        if (existB) { existB.name = bName; existB.countryId = countryId; }
        closeModalById("warehouseModal"); renderTree(); return;
      }
      branchId = nextId(branches);
      branches.push({ id: branchId, countryId: countryId, name: bName, address: "", phone: "", status: "active" });
    } else {
      branchId = Number(document.getElementById("inputBranch").value);
    }

    if (editType === "branch") { closeModalById("warehouseModal"); renderTree(); return; }
  }

  // ---- Save/Create Warehouse ----
  var whName = document.getElementById("inputWhName").value.trim();
  var whLocation = document.getElementById("inputWhLocation").value.trim();
  var whManager = document.getElementById("inputWhManager").value.trim();
  var whStatus = document.getElementById("inputWhStatus").checked ? "active" : "inactive";
  if (!whName) { document.getElementById("inputWhName").focus(); return; }

  if (editId) {
    var w = warehouses.find(function(x) { return x.id === Number(editId); });
    if (w) { w.branchId = branchId; w.name = whName; w.location = whLocation; w.manager = whManager; w.status = whStatus; }
  } else {
    warehouses.push({ id: nextId(warehouses), branchId: branchId, name: whName, location: whLocation, manager: whManager, status: whStatus });
  }

  closeModalById("warehouseModal");
  renderTree();
}

// ============ Delete ============
function deleteCountry(id) {
  var c = countries.find(function(x) { return x.id === id; });
  if (!c) return;
  showConfirm({ title: "Delete Country", message: "ต้องการลบประเทศ <strong>" + c.name + "</strong> และข้อมูลทั้งหมดภายใน?", okText: "Delete", okColor: "#ef4444",
    onConfirm: function() {
      var bIds = branches.filter(function(b) { return b.countryId === id; }).map(function(b) { return b.id; });
      warehouses = warehouses.filter(function(w) { return bIds.indexOf(w.branchId) === -1; });
      branches = branches.filter(function(b) { return b.countryId !== id; });
      countries = countries.filter(function(x) { return x.id !== id; });
      renderTree();
    }
  });
}

function deleteBranch(id) {
  var b = branches.find(function(x) { return x.id === id; });
  if (!b) return;
  showConfirm({ title: "Delete Branch", message: "ต้องการลบสาขา <strong>" + b.name + "</strong> และคลังทั้งหมดภายใน?", okText: "Delete", okColor: "#ef4444",
    onConfirm: function() {
      warehouses = warehouses.filter(function(w) { return w.branchId !== id; });
      branches = branches.filter(function(x) { return x.id !== id; });
      renderTree();
    }
  });
}

function deleteWarehouse(id) {
  var w = warehouses.find(function(x) { return x.id === id; });
  if (!w) return;
  showConfirm({ title: "Delete Warehouse", message: "ต้องการลบคลังสินค้า <strong>" + w.name + "</strong>?", okText: "Delete", okColor: "#ef4444",
    onConfirm: function() { warehouses = warehouses.filter(function(x) { return x.id !== id; }); renderTree(); }
  });
}

// ============ Render Tree ============
function renderTree() {
  updateStats();
  var keyword = (document.getElementById("treeSearch").value || "").toLowerCase();
  var container = document.getElementById("treeContainer");
  var html = "";

  countries.forEach(function(c) {
    var cBranches = getBranches(c.id);
    var whCount = 0;
    cBranches.forEach(function(b) { whCount += getWarehouses(b.id).length; });

    var matchCountry = !keyword || c.name.toLowerCase().includes(keyword) || c.code.toLowerCase().includes(keyword);
    var matchChildren = false;

    var innerHtml = "";

    if (treeMode === 2) {
      // === 2 ชั้น: Country > Warehouse (ข้าม Branch) ===
      var allWh = [];
      cBranches.forEach(function(b) { allWh = allWh.concat(getWarehouses(b.id)); });

      allWh.forEach(function(w) {
        var matchW = !keyword || w.name.toLowerCase().includes(keyword) || w.location.toLowerCase().includes(keyword) || w.manager.toLowerCase().includes(keyword);
        if (matchW || matchCountry) {
          matchChildren = true;
          innerHtml += '<div class="tree-warehouse">' +
            '<i data-lucide="package" class="tree-wh-icon"></i>' +
            '<span class="tree-wh-name">' + w.name + '</span>' +
            '<span class="tree-wh-detail">' + w.location + '</span>' +
            '<span class="tree-wh-manager">' + w.manager + '</span>' +
            '<div class="tree-wh-meta">' + statusBadge(w.status) + actionBtns('editWarehouse(' + w.id + ')', 'deleteWarehouse(' + w.id + ')') + '</div>' +
          '</div>';
        }
      });

    } else {
      // === 3 ชั้น: Country > Branch > Warehouse ===
      cBranches.forEach(function(b) {
        var bWarehouses = getWarehouses(b.id);
        var matchBranch = !keyword || b.name.toLowerCase().includes(keyword);
        var matchWh = false;

        var whHtml = "";
        bWarehouses.forEach(function(w) {
          var matchW = !keyword || w.name.toLowerCase().includes(keyword) || w.location.toLowerCase().includes(keyword) || w.manager.toLowerCase().includes(keyword);
          if (matchW || matchBranch || matchCountry) {
            matchWh = true;
            whHtml += '<div class="tree-warehouse">' +
              '<i data-lucide="package" class="tree-wh-icon"></i>' +
              '<span class="tree-wh-name">' + w.name + '</span>' +
              '<span class="tree-wh-detail">' + w.location + '</span>' +
              '<span class="tree-wh-manager">' + w.manager + '</span>' +
              '<div class="tree-wh-meta">' + statusBadge(w.status) + actionBtns('editWarehouse(' + w.id + ')', 'deleteWarehouse(' + w.id + ')') + '</div>' +
            '</div>';
          }
        });

        if (matchBranch || matchWh || matchCountry) {
          matchChildren = true;
          innerHtml += '<div class="tree-branch' + (keyword ? " open" : "") + '">' +
            '<div class="tree-branch-header" onclick="this.parentElement.classList.toggle(\'open\')">' +
              '<i data-lucide="chevron-right" class="tree-chevron"></i>' +
              '<i data-lucide="building" class="tree-branch-icon"></i>' +
              '<span class="tree-branch-name">' + b.name + '</span>' +
              '<div class="tree-branch-meta">' +
                '<span>' + bWarehouses.length + ' คลัง</span>' +
                statusBadge(b.status) +
                actionBtns('editBranch(' + b.id + ')', 'deleteBranch(' + b.id + ')') +
              '</div>' +
            '</div>' +
            '<div class="tree-warehouses">' + whHtml + '</div>' +
          '</div>';
        }
      });
    }

    if (matchCountry || matchChildren) {
      var metaText = treeMode === 2
        ? '<span>' + whCount + ' คลัง</span>'
        : '<span>' + cBranches.length + ' สาขา</span><span>' + whCount + ' คลัง</span>';

      html += '<div class="tree-country' + (keyword ? " open" : "") + '">' +
        '<div class="tree-country-header" onclick="this.parentElement.classList.toggle(\'open\')">' +
          '<i data-lucide="chevron-right" class="tree-chevron"></i>' +
          '<span class="tree-flag">' + c.code + '</span>' +
          '<span class="tree-country-name">' + c.name + '</span>' +
          '<div class="tree-country-meta">' +
            metaText +
            statusBadge(c.status) +
            actionBtns('editCountry(' + c.id + ')', 'deleteCountry(' + c.id + ')') +
          '</div>' +
        '</div>' +
        '<div class="tree-branches">' + innerHtml + '</div>' +
      '</div>';
    }
  });

  container.innerHTML = html || '<p style="text-align:center;color:#94a3b8;padding:40px;">ไม่พบข้อมูล</p>';
  lucide.createIcons();
}

// ============ Init ============
document.addEventListener("DOMContentLoaded", function() {
  document.getElementById("addWarehouseBtn").addEventListener("click", openAddModal);
  document.getElementById("treeSearch").addEventListener("input", renderTree);

  // Status toggle listener
  var whStatusToggle = document.getElementById("inputWhStatus");
  if (whStatusToggle) {
    whStatusToggle.addEventListener("change", function() {
      var lbl = document.getElementById("inputWhStatusLabel");
      if (lbl) { lbl.textContent = this.checked ? "Active" : "Inactive"; lbl.classList.toggle("active-label", this.checked); }
    });
  }

  // Apply mode จาก settings
  var branchCard = document.getElementById("statBranchCard");
  if (branchCard) branchCard.style.display = treeMode === 2 ? "none" : "flex";

  renderTree();
});
