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
