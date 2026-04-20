// ============================================================
// stock-movement.js — Stock Movement History (Supabase)
// ------------------------------------------------------------
// in/out/transfer log — ยังไม่ sync กับ initial_stock
// ============================================================

var allProducts = [];
var allWarehouses = [];
var movements = [];

// ============ Helpers ============
function fmtQty(n) { return Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 3 }); }
function typeBadge(t) {
  if (t === "in")       return '<span class="badge badge-active">Stock In</span>';
  if (t === "out")      return '<span class="badge badge-inactive">Stock Out</span>';
  if (t === "transfer") return '<span class="badge" style="background-color:#fef3c7;color:#f59e0b">Transfer</span>';
  return t;
}
function warehouseText(m) {
  var dest = m.warehouse ? m.warehouse.name : "—";
  if (m.type === "transfer") {
    var from = m.from_warehouse ? m.from_warehouse.name : "—";
    return '<span style="font-size:10px;color:#64748b;">' + from + '</span> <i data-lucide="arrow-right" style="width:11px;height:11px;display:inline;vertical-align:-1px;color:#f59e0b;"></i> <span style="font-size:10px;color:#1e293b;font-weight:600;">' + dest + '</span>';
  }
  return dest;
}

// ============ Stats ============
function updateStats() {
  document.getElementById("statAll").textContent = movements.length;
  document.getElementById("statIn").textContent = movements.filter(function (m) { return m.type === "in"; }).length;
  document.getElementById("statOut").textContent = movements.filter(function (m) { return m.type === "out"; }).length;
}

// ============ Render ============
function renderTable(data) {
  updateStats();
  var tbody = document.getElementById("movementTableBody");
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:30px;color:#94a3b8;font-size:11px;">ยังไม่มีการเคลื่อนไหว</td></tr>';
    lucide.createIcons();
    return;
  }
  tbody.innerHTML = data.map(function (m, i) {
    var pName = m.products ? m.products.name : "—";
    return '<tr>' +
      '<td>' + (i + 1) + '</td>' +
      '<td>' + (m.date || "—") + '</td>' +
      '<td>' + pName + '</td>' +
      '<td>' + typeBadge(m.type) + '</td>' +
      '<td>' + warehouseText(m) + '</td>' +
      '<td>' + fmtQty(m.qty) + '</td>' +
      '<td style="color:#64748b;font-size:10px;">' + (m.note || "—") + '</td>' +
      '<td><div class="table-actions">' +
        '<button class="btn-icon-sm" onclick="editMovement(' + m.id + ')"><i data-lucide="pencil"></i></button>' +
        '<button class="btn-icon-sm btn-danger" onclick="deleteMovement(' + m.id + ')"><i data-lucide="trash-2"></i></button>' +
      '</div></td>' +
    '</tr>';
  }).join("");
  lucide.createIcons();
  if (typeof refreshSortableHeaders === "function") refreshSortableHeaders();
}

// ============ Dropdowns ============
function populateProductDropdown(presetId) {
  var sel = document.getElementById("inputProduct");
  sel.innerHTML = allProducts.map(function (p) {
    return '<option value="' + p.id + '">' + p.name + '</option>';
  }).join("");
  if (presetId) sel.value = String(presetId);
}

function populateWarehouseDropdowns(destId, fromId) {
  var opts = allWarehouses.map(function (w) {
    return '<option value="' + w.id + '">' + w.name + '</option>';
  }).join("");
  var dest = document.getElementById("inputWarehouse");
  var from = document.getElementById("inputFromWarehouse");
  dest.innerHTML = opts;
  from.innerHTML = opts;
  if (destId) dest.value = String(destId);
  if (fromId) from.value = String(fromId);
}

// ============ Modal ============
function onTypeChange() {
  var t = document.getElementById("inputType").value;
  var fromGroup = document.getElementById("fromWarehouseGroup");
  var label = document.getElementById("labelWarehouse");
  if (t === "transfer") {
    fromGroup.style.display = "block";
    label.textContent = "To Warehouse";
  } else {
    fromGroup.style.display = "none";
    label.textContent = "Warehouse";
  }
}

function openMovementModal(title, m) {
  if (!allProducts.length) { alertMsg("ยังไม่มีสินค้า", "กรุณาเพิ่มสินค้าก่อน"); return; }
  if (!allWarehouses.length) { alertMsg("ยังไม่มีคลัง", "กรุณาเพิ่มคลังก่อน"); return; }
  document.getElementById("modalTitle").textContent = title;
  document.getElementById("editId").value = m ? m.id : "";
  document.getElementById("inputType").value = m ? m.type : "in";
  populateProductDropdown(m ? m.product_id : null);
  populateWarehouseDropdowns(m ? m.warehouse_id : null, m ? m.from_warehouse_id : null);
  document.getElementById("inputDate").value = m ? m.date : new Date().toISOString().slice(0, 10);
  document.getElementById("inputQty").value = m ? m.qty : "";
  document.getElementById("inputNote").value = m ? (m.note || "") : "";
  onTypeChange();
  openModalById("movementModal", function () { document.getElementById("inputQty").focus(); });
}

function alertMsg(title, message) {
  if (typeof showConfirm === "function") {
    showConfirm({ title: title, message: message, okText: "OK", okColor: "#47b8b4", onConfirm: function () {} });
  }
}

function saveMovement() {
  var id = document.getElementById("editId").value;
  var type = document.getElementById("inputType").value;
  var productId = Number(document.getElementById("inputProduct").value);
  var warehouseId = Number(document.getElementById("inputWarehouse").value);
  var fromWarehouseId = type === "transfer" ? Number(document.getElementById("inputFromWarehouse").value) : null;
  var date = document.getElementById("inputDate").value;
  var qty = parseFloat(document.getElementById("inputQty").value) || 0;
  var note = document.getElementById("inputNote").value.trim();

  if (!productId || !warehouseId) return;
  if (!qty) return document.getElementById("inputQty").focus();
  if (type === "transfer" && fromWarehouseId === warehouseId) {
    alertMsg("ไม่ถูกต้อง", "คลังต้นทางและปลายทางห้ามเป็นคลังเดียวกัน");
    return;
  }

  var payload = {
    type: type,
    product_id: productId,
    warehouse_id: warehouseId,
    from_warehouse_id: fromWarehouseId,
    date: date,
    qty: qty,
    note: note || null,
  };

  var op = id ? updateMovementDB(Number(id), payload) : createMovementDB(payload);
  op.then(function () { return reloadMovements(); })
    .then(function () {
      closeModalById("movementModal");
      applyFilters();
    })
    .catch(function (err) { console.error(err); });
}

function editMovement(id) {
  var m = movements.find(function (x) { return x.id === id; });
  if (m) openMovementModal("Edit Movement", m);
}

// ============ Delete ============
function deleteMovement(id) {
  var m = movements.find(function (x) { return x.id === id; });
  if (!m) return;
  var pName = m.products ? m.products.name : "";
  showConfirm({
    title: "Confirm Delete",
    message: "ต้องการลบรายการ <strong>" + pName + "</strong> (" + (m.date || "") + ") ใช่ไหม?",
    okText: "Delete",
    okColor: "#ef4444",
    onConfirm: function () {
      deleteMovementDB(id)
        .then(function () { return reloadMovements(); })
        .then(function () { applyFilters(); })
        .catch(function (err) { console.error(err); });
    },
  });
}

// ============ Filter & Sort ============
var currentFilter = "all";
var currentSort = "default";

function getFilteredData() {
  var keyword = document.querySelector(".filter-search-input").value.toLowerCase();
  var data = movements.slice();

  if (currentFilter !== "all") data = data.filter(function (m) { return m.type === currentFilter; });

  if (keyword) {
    data = data.filter(function (m) {
      var pName = m.products ? m.products.name.toLowerCase() : "";
      var wName = m.warehouse ? m.warehouse.name.toLowerCase() : "";
      var fName = m.from_warehouse ? m.from_warehouse.name.toLowerCase() : "";
      var note = (m.note || "").toLowerCase();
      return pName.includes(keyword) || wName.includes(keyword) || fName.includes(keyword) || note.includes(keyword);
    });
  }

  switch (currentSort) {
    case "date-desc": data = data.slice().sort(function (a, b) { return (b.date || "").localeCompare(a.date || ""); }); break;
    case "date-asc":  data = data.slice().sort(function (a, b) { return (a.date || "").localeCompare(b.date || ""); }); break;
    case "qty-desc":  data = data.slice().sort(function (a, b) { return Number(b.qty) - Number(a.qty); }); break;
    case "qty-asc":   data = data.slice().sort(function (a, b) { return Number(a.qty) - Number(b.qty); }); break;
  }
  return data;
}

function applyFilters() { renderTable(getFilteredData()); }

// ============ Load ============
function reloadAll() {
  return Promise.all([
    typeof fetchProducts === "function" ? fetchProducts() : Promise.resolve([]),
    typeof fetchWarehousesDB === "function" ? fetchWarehousesDB() : Promise.resolve([]),
    typeof fetchMovementsDB === "function" ? fetchMovementsDB() : Promise.resolve([]),
  ]).then(function (res) {
    allProducts = (res[0] || []).map(function (p) {
      return { id: p.id, name: p.name || "", sku: p.sku || "" };
    });
    allWarehouses = (res[1] || []).map(function (w) {
      return { id: w.id, name: w.name || "" };
    });
    movements = normalizeMovements(res[2] || []);
  });
}

function reloadMovements() {
  return (typeof fetchMovementsDB === "function" ? fetchMovementsDB() : Promise.resolve([]))
    .then(function (rows) { movements = normalizeMovements(rows || []); });
}

function normalizeMovements(rows) {
  return rows.map(function (m) {
    return {
      id: m.id,
      date: m.date || "",
      type: m.type,
      product_id: m.product_id,
      warehouse_id: m.warehouse_id,
      from_warehouse_id: m.from_warehouse_id,
      qty: Number(m.qty) || 0,
      note: m.note || "",
      products: m.products || null,
      warehouse: m.warehouse || null,
      from_warehouse: m.from_warehouse || null,
    };
  });
}

// ============ Random fill (dev) ============
if (typeof registerRandomFill === "function") {
  registerRandomFill({
    target: "#movementModal",
    fill: function () {
      // Type: เน้น in/out เป็นหลัก, นาน ๆ ที transfer
      var type = rdPick(["in", "in", "out", "out", "transfer"]);
      var typeSel = document.getElementById("inputType");
      if (typeSel) { typeSel.value = type; typeSel.dispatchEvent(new Event("change", { bubbles: true })); }

      // Product: สุ่มจาก dropdown
      pickRandomSelectOption("inputProduct", { includeEmpty: false });

      // Warehouses
      pickRandomSelectOption("inputWarehouse", { includeEmpty: false });
      if (type === "transfer") {
        pickRandomSelectOption("inputFromWarehouse", { includeEmpty: false });
        // กัน from = to
        var fromSel = document.getElementById("inputFromWarehouse");
        var toSel = document.getElementById("inputWarehouse");
        if (fromSel && toSel && fromSel.value === toSel.value && fromSel.options.length > 1) {
          for (var i = 0; i < fromSel.options.length; i++) {
            if (fromSel.options[i].value !== toSel.value) { fromSel.value = fromSel.options[i].value; break; }
          }
        }
      }

      setFieldValue("inputDate", randomPastDate(30));
      setFieldValue("inputQty", rdInt(1, 50));
      setFieldValue("inputNote", randomNote());
    },
  });
}

// ============ Init ============
document.addEventListener("DOMContentLoaded", function () {
  document.querySelector(".filter-search-input").addEventListener("input", applyFilters);

  document.querySelectorAll(".filter-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".filter-btn").forEach(function (b) { b.classList.remove("active"); });
      this.classList.add("active");
      currentFilter = this.dataset.status;
      applyFilters();
    });
  });

  document.getElementById("sortSelect").addEventListener("change", function () {
    currentSort = this.value;
    applyFilters();
  });

  document.getElementById("addMovementBtn").addEventListener("click", function () {
    openMovementModal("Add Movement", null);
  });

  reloadAll()
    .then(function () { applyFilters(); })
    .catch(function (err) { console.error(err); applyFilters(); });
});
