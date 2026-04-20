// ============================================================
// purchase-returns.js — Purchase Returns (Supabase, line items + GR ref)
// auto stock_movements type=out via DB trigger when status=approved
// ============================================================

var returns = [];
var allGRs = [];
var allSuppliers = [];
var allWarehouses = [];
var allProducts = [];

// ============ Helpers ============
function fmtMoney(n) { return "฿" + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function getStatusBadge(status) {
  switch (status) {
    case "approved":  return '<span class="badge badge-active">Approved</span>';
    case "pending":   return '<span class="badge" style="background-color:#fef3c7;color:#f59e0b;">Pending</span>';
    case "cancelled": return '<span class="badge badge-inactive">Cancelled</span>';
    default: return '<span class="badge">' + status + '</span>';
  }
}

// ============ Stats ============
function updateStats() {
  document.getElementById("statAll").textContent = returns.length;
  document.getElementById("statApproved").textContent = returns.filter(function (r) { return r.status === "approved"; }).length;
  document.getElementById("statPending").textContent = returns.filter(function (r) { return r.status === "pending"; }).length;
}

// ============ Render ============
function renderTable(data) {
  updateStats();
  var tbody = document.getElementById("returnTableBody");
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:30px;color:#94a3b8;font-size:11px;">ยังไม่มีรายการส่งคืน</td></tr>';
    lucide.createIcons();
    return;
  }
  tbody.innerHTML = data.map(function (r, i) {
    var grRef = r.goods_receipts ? r.goods_receipts.gr_number : "—";
    var supplier = r.suppliers ? r.suppliers.name : "—";
    return '<tr>' +
      '<td>' + (i + 1) + '</td>' +
      '<td><strong>' + r.return_number + '</strong></td>' +
      '<td>' + grRef + '</td>' +
      '<td>' + supplier + '</td>' +
      '<td>' + (r.date || "—") + '</td>' +
      '<td style="color:#64748b;font-size:10px;">' + (r.reason || "—") + '</td>' +
      '<td>' + getStatusBadge(r.status) + '</td>' +
      '<td><div class="table-actions">' +
        '<button class="btn-icon-sm" onclick="editReturn(' + r.id + ')"><i data-lucide="pencil"></i></button>' +
        '<button class="btn-icon-sm btn-danger" onclick="deleteReturn(' + r.id + ')"><i data-lucide="trash-2"></i></button>' +
      '</div></td>' +
    '</tr>';
  }).join("");
  lucide.createIcons();
  if (typeof refreshSortableHeaders === "function") refreshSortableHeaders();
}

// ============ Return Number ============
function generateReturnNumber() {
  var year = new Date().getFullYear();
  var prefix = "PR-" + year + "-";
  var maxNum = 0;
  returns.forEach(function (r) {
    if (r.return_number && r.return_number.indexOf(prefix) === 0) {
      var n = parseInt(r.return_number.slice(prefix.length), 10);
      if (n > maxNum) maxNum = n;
    }
  });
  return prefix + String(maxNum + 1).padStart(3, "0");
}

// ============ Dropdowns ============
function buildProductOptions(selectedId) {
  return '<option value="">— เลือกสินค้า —</option>' + allProducts.map(function (p) {
    var sel = selectedId && Number(selectedId) === p.id ? ' selected' : '';
    return '<option value="' + p.id + '"' + sel + '>' + p.name + '</option>';
  }).join("");
}

function populateGRDropdown(selectedId) {
  var sel = document.getElementById("inputGR");
  var html = '<option value="">— ไม่อิง GR —</option>';
  allGRs.forEach(function (g) {
    if (g.status !== "completed") return;
    html += '<option value="' + g.id + '">' + g.gr_number + (g.suppliers ? ' — ' + g.suppliers.name : '') + '</option>';
  });
  sel.innerHTML = html;
  if (selectedId) sel.value = String(selectedId);
}

function populateSupplierDropdown(selectedId) {
  var sel = document.getElementById("inputSupplier");
  var html = '<option value="">— เลือกผู้ขาย —</option>';
  allSuppliers.forEach(function (s) {
    if (s.status === "inactive") return;
    html += '<option value="' + s.id + '">' + s.name + '</option>';
  });
  sel.innerHTML = html;
  if (selectedId) sel.value = String(selectedId);
}

function populateWarehouseDropdown(selectedId) {
  var sel = document.getElementById("inputWarehouse");
  var html = '<option value="">— เลือกคลัง —</option>';
  allWarehouses.forEach(function (w) {
    html += '<option value="' + w.id + '">' + w.name + '</option>';
  });
  sel.innerHTML = html;
  if (selectedId) sel.value = String(selectedId);
}

// ============ GR auto-fill ============
function onGRChange() {
  var grId = Number(document.getElementById("inputGR").value);
  if (!grId) return;
  var gr = allGRs.find(function (g) { return g.id === grId; });
  if (!gr) return;
  if (gr.supplier_id) document.getElementById("inputSupplier").value = String(gr.supplier_id);
  if (gr.warehouse_id) document.getElementById("inputWarehouse").value = String(gr.warehouse_id);
  var tbody = document.getElementById("prItemsBody");
  tbody.innerHTML = "";
  (gr.goods_receipt_items || []).forEach(function (it) {
    addPRItemRow({ product_id: it.product_id, qty: it.qty, cost: it.cost });
  });
  if (!tbody.children.length) addPRItemRow();
  recalcTotals();
}

// ============ Line Items ============
function addPRItemRow(data) {
  var tbody = document.getElementById("prItemsBody");
  var tr = document.createElement("tr");
  var d = data || {};
  tr.innerHTML =
    '<td style="padding:4px;"><select class="form-select pr-product" style="padding:6px 8px;font-size:10px;">' + buildProductOptions(d.product_id) + '</select></td>' +
    '<td style="padding:4px;"><input type="number" class="form-input pr-qty" value="' + (d.qty || "") + '" min="0" step="any" oninput="recalcTotals()" style="padding:6px 8px;font-size:10px;text-align:right;" /></td>' +
    '<td style="padding:4px;"><input type="number" class="form-input pr-cost" value="' + (d.cost || "") + '" min="0" step="0.01" oninput="recalcTotals()" style="padding:6px 8px;font-size:10px;text-align:right;" /></td>' +
    '<td style="padding:4px;text-align:right;color:#ef4444;font-weight:700;" class="pr-subtotal">฿0.00</td>' +
    '<td style="padding:4px;"><button class="btn-icon-sm btn-danger" type="button" onclick="removePRItemRow(this)" style="width:22px;height:22px;"><i data-lucide="x" style="width:10px;height:10px;"></i></button></td>';
  tbody.appendChild(tr);
  lucide.createIcons();
  recalcTotals();
}

function removePRItemRow(btn) {
  btn.closest("tr").remove();
  recalcTotals();
}

function recalcTotals() {
  var total = 0;
  document.querySelectorAll("#prItemsBody tr").forEach(function (tr) {
    var qty = parseFloat(tr.querySelector(".pr-qty").value) || 0;
    var cost = parseFloat(tr.querySelector(".pr-cost").value) || 0;
    var sub = qty * cost;
    tr.querySelector(".pr-subtotal").textContent = fmtMoney(sub);
    total += sub;
  });
  document.getElementById("sumTotal").textContent = fmtMoney(total);
}

// ============ Modal ============
function openReturnModal(title, r) {
  if (!allProducts.length) { alertMsg("ยังไม่มีสินค้า", "กรุณาเพิ่มสินค้าก่อน"); return; }
  if (!allWarehouses.length) { alertMsg("ยังไม่มีคลัง", "กรุณาเพิ่มคลังก่อน"); return; }
  document.getElementById("modalTitle").textContent = title;
  document.getElementById("editId").value = r ? r.id : "";
  document.getElementById("inputReturnNumber").value = r ? r.return_number : generateReturnNumber();
  document.getElementById("inputDate").value = r ? r.date : new Date().toISOString().slice(0, 10);
  document.getElementById("inputStatus").value = r ? r.status : "pending";
  document.getElementById("inputReason").value = r ? (r.reason || "") : "";
  document.getElementById("inputNote").value = r ? (r.note || "") : "";
  populateGRDropdown(r ? r.gr_id : null);
  populateSupplierDropdown(r ? r.supplier_id : null);
  populateWarehouseDropdown(r ? r.warehouse_id : null);

  var tbody = document.getElementById("prItemsBody");
  tbody.innerHTML = "";
  var items = r && r.purchase_return_items ? r.purchase_return_items : [];
  if (items.length) {
    items.forEach(function (it) { addPRItemRow({ product_id: it.product_id, qty: it.qty, cost: it.cost }); });
  } else {
    addPRItemRow();
  }
  recalcTotals();
  openModalById("returnModal");
}

function alertMsg(title, message) {
  if (typeof showConfirm === "function") {
    showConfirm({ title: title, message: message, okText: "OK", okColor: "#47b8b4", onConfirm: function () {} });
  }
}

function collectItems() {
  var items = [];
  document.querySelectorAll("#prItemsBody tr").forEach(function (tr) {
    var pid = Number(tr.querySelector(".pr-product").value);
    var qty = parseFloat(tr.querySelector(".pr-qty").value);
    var cost = parseFloat(tr.querySelector(".pr-cost").value);
    if (pid && qty > 0) items.push({ product_id: pid, qty: qty, cost: cost || 0 });
  });
  return items;
}

function saveReturn() {
  var id = document.getElementById("editId").value;
  var returnNumber = document.getElementById("inputReturnNumber").value.trim();
  var grId = Number(document.getElementById("inputGR").value) || null;
  var supplierId = Number(document.getElementById("inputSupplier").value) || null;
  var warehouseId = Number(document.getElementById("inputWarehouse").value) || null;
  var date = document.getElementById("inputDate").value;
  var status = document.getElementById("inputStatus").value;
  var reason = document.getElementById("inputReason").value.trim();
  var note = document.getElementById("inputNote").value.trim();
  var items = collectItems();

  if (!warehouseId) { alertMsg("ไม่ครบถ้วน", "กรุณาเลือกคลังที่ส่งออก"); return; }
  if (!date) return document.getElementById("inputDate").focus();
  if (!items.length) { alertMsg("ไม่ถูกต้อง", "กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ"); return; }

  var header = {
    return_number: returnNumber,
    gr_id: grId,
    supplier_id: supplierId,
    warehouse_id: warehouseId,
    date: date,
    status: status,
    reason: reason || null,
    note: note || null,
  };

  var op = id
    ? updatePurchaseReturnDB(Number(id), header, items)
    : createPurchaseReturnDB(header, items);

  op.then(function () { return reloadReturns(); })
    .then(function () {
      closeModalById("returnModal");
      applyFilters();
    })
    .catch(function (err) { console.error(err); alertMsg("เกิดข้อผิดพลาด", err.message || "บันทึกไม่สำเร็จ"); });
}

function editReturn(id) {
  var r = returns.find(function (x) { return x.id === id; });
  if (r) openReturnModal("Edit Return", r);
}

function deleteReturn(id) {
  var r = returns.find(function (x) { return x.id === id; });
  if (!r) return;
  var msg = "ต้องการลบรายการส่งคืน <strong>" + r.return_number + "</strong> ใช่ไหม?";
  if (r.status === "approved") msg += "<br><br><span style='color:#ef4444;font-size:10px;'>⚠️ Return นี้เคยตัด stock แล้ว — ระบบจะสร้าง movement reverse อัตโนมัติ</span>";
  showConfirm({
    title: "Confirm Delete",
    message: msg,
    okText: "Delete",
    okColor: "#ef4444",
    onConfirm: function () {
      deletePurchaseReturnDB(id)
        .then(function () { return reloadReturns(); })
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
  var data = returns.slice();

  if (currentFilter !== "all") data = data.filter(function (r) { return r.status === currentFilter; });

  if (keyword) {
    data = data.filter(function (r) {
      var grRef = r.goods_receipts ? r.goods_receipts.gr_number.toLowerCase() : "";
      var sName = r.suppliers ? r.suppliers.name.toLowerCase() : "";
      return (r.return_number || "").toLowerCase().includes(keyword) || grRef.includes(keyword) || sName.includes(keyword) || (r.reason || "").toLowerCase().includes(keyword);
    });
  }

  switch (currentSort) {
    case "date-desc": data = data.slice().sort(function (a, b) { return (b.date || "").localeCompare(a.date || ""); }); break;
    case "date-asc":  data = data.slice().sort(function (a, b) { return (a.date || "").localeCompare(b.date || ""); }); break;
  }
  return data;
}

function applyFilters() { renderTable(getFilteredData()); }

// ============ Load ============
function reloadAll() {
  return Promise.all([
    typeof fetchSuppliersDB === "function" ? fetchSuppliersDB() : Promise.resolve([]),
    typeof fetchProducts === "function" ? fetchProducts() : Promise.resolve([]),
    typeof fetchWarehousesDB === "function" ? fetchWarehousesDB() : Promise.resolve([]),
    typeof fetchGoodsReceiptsDB === "function" ? fetchGoodsReceiptsDB() : Promise.resolve([]),
    typeof fetchPurchaseReturnsDB === "function" ? fetchPurchaseReturnsDB() : Promise.resolve([]),
  ]).then(function (res) {
    allSuppliers = (res[0] || []).map(function (s) { return { id: s.id, name: s.name || "", status: s.status || "active" }; });
    allProducts = (res[1] || []).map(function (p) { return { id: p.id, name: p.name || "", sku: p.sku || "" }; });
    allWarehouses = (res[2] || []).map(function (w) { return { id: w.id, name: w.name || "" }; });
    allGRs = (res[3] || []).map(function (g) {
      return {
        id: g.id, gr_number: g.gr_number, supplier_id: g.supplier_id, warehouse_id: g.warehouse_id, status: g.status,
        suppliers: g.suppliers || null,
        goods_receipt_items: g.goods_receipt_items || [],
      };
    });
    returns = (res[4] || []).map(normalizeReturn);
  });
}

function reloadReturns() {
  return (typeof fetchPurchaseReturnsDB === "function" ? fetchPurchaseReturnsDB() : Promise.resolve([]))
    .then(function (rows) { returns = (rows || []).map(normalizeReturn); });
}

function normalizeReturn(r) {
  return {
    id: r.id,
    return_number: r.return_number || "",
    gr_id: r.gr_id,
    supplier_id: r.supplier_id,
    warehouse_id: r.warehouse_id,
    date: r.date || "",
    reason: r.reason || "",
    status: r.status || "pending",
    note: r.note || "",
    suppliers: r.suppliers || null,
    warehouses: r.warehouses || null,
    goods_receipts: r.goods_receipts || null,
    purchase_return_items: r.purchase_return_items || [],
  };
}

// ============ Random fill ============
if (typeof registerRandomFill === "function") {
  registerRandomFill({
    target: "#returnModal",
    fill: function () {
      // return_number readonly — skip
      setFieldValue("inputDate", randomPastDate(30));
      pickRandomSelectOption("inputGR", { includeEmpty: true });
      if (typeof onGRChange === "function") { try { onGRChange(); } catch (e) {} }
      var sup = document.getElementById("inputSupplier");
      if (sup && !sup.value) pickRandomSelectOption("inputSupplier");
      var wh = document.getElementById("inputWarehouse");
      if (wh && !wh.value) pickRandomSelectOption("inputWarehouse");
      pickRandomSelectOption("inputStatus");
      setFieldValue("inputReason", rdPick(["สินค้าชำรุด", "สินค้าผิดรุ่น", "หมดอายุ", "คุณภาพไม่ได้มาตรฐาน", "ส่งเกินจำนวน"]));
      setFieldValue("inputNote", randomNote());
      var itemsBody = document.getElementById("prItemsBody");
      if (itemsBody && !itemsBody.children.length && typeof addPRItemRow === "function" && typeof allProducts !== "undefined" && allProducts.length) {
        var count = rdInt(1, 2);
        for (var i = 0; i < count; i++) {
          var p = rdPick(allProducts);
          addPRItemRow({ product_id: p.id, qty: randomQty(1, 5), cost: randomMoney(30, 1500) });
        }
      }
      if (typeof recalcTotals === "function") { try { recalcTotals(); } catch (e) {} }
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

  document.getElementById("addReturnBtn").addEventListener("click", function () {
    openReturnModal("Create Return", null);
  });

  reloadAll()
    .then(function () { applyFilters(); })
    .catch(function (err) { console.error(err); applyFilters(); });
});
