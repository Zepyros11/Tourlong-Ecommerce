// ============================================================
// table.js — Table Component (ใช้ร่วมทุกหน้า)
// ------------------------------------------------------------
// หน้าที่: render ตาราง, search/filter, sortable column headers
// วิธีใช้: <script src="../../assets/js/table.js"></script>
//
// Sortable columns:
//   เพิ่ม data-sort="fieldName" ที่ <th> เช่น:
//   <th data-sort="name">Name</th>
//   <th data-sort="price" data-sort-type="number">Price</th>
//
//   data-sort-type: "string" (default), "number", "date"
// ============================================================

/**
 * Render ตารางจาก data array
 */
function renderTableData(tbodyId, data, rowTemplate) {
  var tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  tbody.innerHTML = data.map(function (item, i) { return rowTemplate(item, i); }).join("");
  if (typeof lucide !== "undefined") lucide.createIcons();
}

/**
 * Filter ข้อมูลจาก keyword
 */
function filterData(data, keyword, fields) {
  var kw = keyword.toLowerCase();
  if (!kw) return data;
  return data.filter(function (item) {
    return fields.some(function (field) {
      var val = item[field];
      return val && String(val).toLowerCase().includes(kw);
    });
  });
}

/**
 * ผูก search input กับ table
 */
function bindSearch(inputSelector, options) {
  var input = document.querySelector(inputSelector);
  if (!input) return;
  input.addEventListener("input", function () {
    var filtered = filterData(options.getData(), this.value, options.searchFields);
    renderTableData(options.tbodyId, filtered, options.rowTemplate);
  });
}

// ============ Sortable Table Headers ============

/**
 * เพิ่ม sort icon ให้ <th> ที่มี data-sort (ไม่ซ้ำ)
 */
function refreshSortableHeaders() {
  document.querySelectorAll("th[data-sort]").forEach(function (th) {
    th.classList.add("th-sortable");
    if (!th.querySelector(".sort-icon")) {
      th.innerHTML = '<span class="th-sort-content">' + th.innerHTML +
        '</span><span class="sort-icon"><svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">' +
        '<path d="M5 1L8 4H2L5 1Z" class="sort-asc-arrow"/>' +
        '<path d="M5 9L2 6H8L5 9Z" class="sort-desc-arrow"/></svg></span>';
    }
  });
}

/**
 * Sort ตาราง DOM rows ตาม column
 */
function sortTableByTh(th) {
  var table = th.closest("table");
  var tbody = table ? table.querySelector("tbody") : null;
  if (!tbody || !tbody.children.length) return;

  var sortType = th.dataset.sortType || "string";
  var currentDir = th.dataset.sortDir || "";
  var newDir = currentDir === "asc" ? "desc" : "asc";

  // Reset other headers in same table
  table.querySelectorAll("th[data-sort]").forEach(function (otherTh) {
    otherTh.dataset.sortDir = "";
    otherTh.classList.remove("sort-asc", "sort-desc");
  });

  th.dataset.sortDir = newDir;
  th.classList.add("sort-" + newDir);

  var colIndex = Array.from(th.parentNode.children).indexOf(th);
  var rows = Array.from(tbody.querySelectorAll("tr"));

  rows.sort(function (a, b) {
    var aCell = a.children[colIndex];
    var bCell = b.children[colIndex];
    var aVal = aCell ? aCell.textContent.trim() : "";
    var bVal = bCell ? bCell.textContent.trim() : "";

    if (sortType === "number") {
      aVal = parseFloat(aVal.replace(/[^0-9.\-]/g, "")) || 0;
      bVal = parseFloat(bVal.replace(/[^0-9.\-]/g, "")) || 0;
    } else if (sortType === "date") {
      aVal = new Date(aVal).getTime() || 0;
      bVal = new Date(bVal).getTime() || 0;
    } else {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }

    if (aVal < bVal) return newDir === "asc" ? -1 : 1;
    if (aVal > bVal) return newDir === "asc" ? 1 : -1;
    return 0;
  });

  rows.forEach(function (row) { tbody.appendChild(row); });
}

// ============ Event Delegation (ทำครั้งเดียว ไม่ซ้ำ) ============
document.addEventListener("click", function (e) {
  var th = e.target.closest("th[data-sort]");
  if (th) sortTableByTh(th);
});

// Init sort icons เมื่อ DOM ready
document.addEventListener("DOMContentLoaded", function () {
  refreshSortableHeaders();
});

// ============================================================
// Bulk Select + Delete Helper
// ------------------------------------------------------------
// วิธีใช้:
// 1) ใน HTML thead แรกสุดใส่ column header:
//    <th style="width:36px;text-align:center;">
//      <input type="checkbox" id="selectAllCheckbox" onchange="onSelectAll(this)" style="cursor:pointer;" />
//    </th>
//
// 2) ใน JS row template ให้ prepend bulkCheckboxCell(item.id):
//    return '<tr>' + bulkCheckboxCell(m.id) + '<td>' + ... + '</tr>';
//
// 3) อัพเดท colspan ของแถว empty-state ให้ +1
//
// 4) หลัง renderTable ของเพจเรียก syncBulkBar()
//
// 5) เรียก initBulkSelect({...}) ตอน init (หลัง DOMContentLoaded):
//    initBulkSelect({
//      deleteFn: deleteMovementDB,
//      onAfterDelete: function () { return reloadMovements().then(applyFilters); },
//      itemLabel: "รายการ",  // optional
//    });
//    — จะ inject bulk action bar ให้อัตโนมัติ (เหนือ .table-container)
// ============================================================

var bulkSelect = {
  selectedIds: new Set(),
  deleteFn: null,
  onAfterDelete: null,
  itemLabel: "รายการ",
};

function initBulkSelect(opts) {
  bulkSelect.selectedIds = new Set();
  bulkSelect.deleteFn = opts.deleteFn || null;
  bulkSelect.onAfterDelete = opts.onAfterDelete || null;
  bulkSelect.itemLabel = opts.itemLabel || "รายการ";

  // inject bulk action bar ถ้ายังไม่มี
  if (!document.getElementById("bulkActionBar")) {
    var container = document.querySelector(".table-container");
    if (container) {
      var bar = document.createElement("div");
      bar.id = "bulkActionBar";
      bar.style.cssText = "display:none;align-items:center;justify-content:space-between;padding:10px 14px;margin-bottom:10px;background:#fef2f2;border:1px solid #fecaca;border-radius:10px;";
      bar.innerHTML =
        '<span style="font-size:11px;font-weight:700;color:#991b1b;">เลือกแล้ว <span id="bulkCount">0</span> รายการ</span>' +
        '<div style="display:flex;gap:8px;">' +
          '<button class="btn-secondary" onclick="clearSelection()" style="padding:6px 12px;font-size:11px;">ยกเลิก</button>' +
          '<button class="btn-primary" onclick="deleteSelected()" style="background:#ef4444;padding:6px 12px;font-size:11px;display:inline-flex;align-items:center;gap:6px;">' +
            '<i data-lucide="trash-2" style="width:12px;height:12px;"></i>ลบที่เลือก' +
          '</button>' +
        '</div>';
      container.parentNode.insertBefore(bar, container);
      if (typeof lucide !== "undefined") lucide.createIcons();
    }
  }
}

function bulkCheckboxCell(id) {
  var checked = bulkSelect.selectedIds.has(id) ? ' checked' : '';
  return '<td style="text-align:center;"><input type="checkbox" class="row-checkbox" data-id="' + id + '" onchange="onRowCheck(this)" style="cursor:pointer;"' + checked + ' /></td>';
}

function onRowCheck(cb) {
  var id = Number(cb.dataset.id);
  if (cb.checked) bulkSelect.selectedIds.add(id);
  else bulkSelect.selectedIds.delete(id);
  syncBulkBar();
}

function onSelectAll(cb) {
  document.querySelectorAll(".row-checkbox").forEach(function (b) {
    b.checked = cb.checked;
    var id = Number(b.dataset.id);
    if (cb.checked) bulkSelect.selectedIds.add(id);
    else bulkSelect.selectedIds.delete(id);
  });
  syncBulkBar();
}

function syncBulkBar() {
  var bar = document.getElementById("bulkActionBar");
  var countEl = document.getElementById("bulkCount");
  var selectAll = document.getElementById("selectAllCheckbox");
  if (!bar) return;
  var n = bulkSelect.selectedIds.size;
  if (countEl) countEl.textContent = n;
  bar.style.display = n > 0 ? "flex" : "none";

  // sync select-all: checked ถ้าเลือกครบทุกแถวที่มองเห็น, indeterminate ถ้าเลือกบางส่วน
  var boxes = document.querySelectorAll(".row-checkbox");
  var visibleChecked = 0;
  boxes.forEach(function (b) { if (b.checked) visibleChecked++; });
  if (selectAll) {
    if (boxes.length > 0 && visibleChecked === boxes.length) {
      selectAll.checked = true;
      selectAll.indeterminate = false;
    } else if (visibleChecked > 0) {
      selectAll.checked = false;
      selectAll.indeterminate = true;
    } else {
      selectAll.checked = false;
      selectAll.indeterminate = false;
    }
  }
}

function clearSelection() {
  bulkSelect.selectedIds.clear();
  document.querySelectorAll(".row-checkbox").forEach(function (b) { b.checked = false; });
  syncBulkBar();
}

function deleteSelected() {
  var ids = Array.from(bulkSelect.selectedIds);
  if (!ids.length) return;
  if (!bulkSelect.deleteFn) return;
  if (typeof showConfirm !== "function") return;

  showConfirm({
    title: "Confirm Delete",
    message: "ต้องการลบ" + bulkSelect.itemLabel + "ที่เลือก <strong>" + ids.length + "</strong> รายการใช่ไหม?",
    okText: "Delete",
    okColor: "#ef4444",
    onConfirm: function () {
      Promise.all(ids.map(function (id) { return bulkSelect.deleteFn(id); }))
        .then(function () {
          bulkSelect.selectedIds.clear();
          if (bulkSelect.onAfterDelete) return bulkSelect.onAfterDelete();
        })
        .catch(function (err) { console.error(err); });
    },
  });
}
