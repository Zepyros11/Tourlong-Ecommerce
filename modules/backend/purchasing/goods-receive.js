// ============================================================
// goods-receive.js — Goods Receipts (Supabase, line items + PO ref)
// auto stock_movements type=in via DB trigger
// ============================================================

var goodsReceipts = [];
var allPOs = [];
var allSuppliers = [];
var allWarehouses = [];
var allProducts = [];

// ============ Helpers ============
function fmtMoney(n) { return "฿" + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtQty(n) { return Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 3 }); }

function getStatusBadge(status) {
  switch (status) {
    case "completed": return '<span class="badge badge-active">Completed</span>';
    case "pending":   return '<span class="badge" style="background-color:#fef3c7;color:#f59e0b;">Pending</span>';
    case "cancelled": return '<span class="badge badge-inactive">Cancelled</span>';
    default: return '<span class="badge">' + status + '</span>';
  }
}

// ============ Stats ============
function updateStats() {
  document.getElementById("statAll").textContent = goodsReceipts.length;
  document.getElementById("statCompleted").textContent = goodsReceipts.filter(function (g) { return g.status === "completed"; }).length;
  document.getElementById("statPending").textContent = goodsReceipts.filter(function (g) { return g.status === "pending"; }).length;
}

// ============ Render ============
function renderTable(data) {
  updateStats();
  var tbody = document.getElementById("grTableBody");
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:30px;color:#94a3b8;font-size:11px;">ยังไม่มีใบรับสินค้า</td></tr>';
    lucide.createIcons();
    return;
  }
  tbody.innerHTML = data.map(function (g, i) {
    var poRef = g.purchase_orders ? g.purchase_orders.po_number : "—";
    var supplier = g.suppliers ? g.suppliers.name : "—";
    var itemCount = g.goods_receipt_items ? g.goods_receipt_items.length : 0;
    return '<tr>' +
      '<td>' + (i + 1) + '</td>' +
      '<td><strong>' + g.gr_number + '</strong></td>' +
      '<td>' + poRef + '</td>' +
      '<td>' + supplier + '</td>' +
      '<td>' + (g.date || "—") + '</td>' +
      '<td>' + itemCount + '</td>' +
      '<td>' + getStatusBadge(g.status) + '</td>' +
      '<td><div class="table-actions">' +
        '<button class="btn-icon-sm" onclick="editGR(' + g.id + ')"><i data-lucide="pencil"></i></button>' +
        '<button class="btn-icon-sm btn-danger" onclick="deleteGR(' + g.id + ')"><i data-lucide="trash-2"></i></button>' +
      '</div></td>' +
    '</tr>';
  }).join("");
  lucide.createIcons();
  if (typeof refreshSortableHeaders === "function") refreshSortableHeaders();
}

// ============ GR Number ============
function generateGRNumber() {
  var year = new Date().getFullYear();
  var prefix = "GR-" + year + "-";
  var maxNum = 0;
  goodsReceipts.forEach(function (g) {
    if (g.gr_number && g.gr_number.indexOf(prefix) === 0) {
      var n = parseInt(g.gr_number.slice(prefix.length), 10);
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

function populatePODropdown(selectedId) {
  var sel = document.getElementById("inputPO");
  var html = '<option value="">— ไม่อิง PO —</option>';
  allPOs.forEach(function (po) {
    if (po.status === "cancelled") return;
    html += '<option value="' + po.id + '">' + po.po_number + (po.suppliers ? ' — ' + po.suppliers.name : '') + '</option>';
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

// ============ PO auto-fill ============
function onPOChange() {
  var poId = Number(document.getElementById("inputPO").value);
  if (!poId) return;
  var po = allPOs.find(function (p) { return p.id === poId; });
  if (!po) return;
  if (po.supplier_id) document.getElementById("inputSupplier").value = String(po.supplier_id);
  // copy line items
  var tbody = document.getElementById("grItemsBody");
  tbody.innerHTML = "";
  (po.purchase_order_items || []).forEach(function (it) {
    addGRItemRow({ product_id: it.product_id, qty: it.qty, cost: it.cost });
  });
  if (!tbody.children.length) addGRItemRow();
  recalcTotals();
}

// ============ Line Items ============
function addGRItemRow(data) {
  var tbody = document.getElementById("grItemsBody");
  var tr = document.createElement("tr");
  var d = data || {};
  tr.innerHTML =
    '<td style="padding:4px;"><select class="form-select gr-product" style="padding:6px 8px;font-size:10px;">' + buildProductOptions(d.product_id) + '</select></td>' +
    '<td style="padding:4px;"><input type="number" class="form-input gr-qty" value="' + (d.qty || "") + '" min="0" step="any" oninput="recalcTotals()" style="padding:6px 8px;font-size:10px;text-align:right;" /></td>' +
    '<td style="padding:4px;"><input type="number" class="form-input gr-cost" value="' + (d.cost || "") + '" min="0" step="0.01" oninput="recalcTotals()" style="padding:6px 8px;font-size:10px;text-align:right;" /></td>' +
    '<td style="padding:4px;text-align:right;color:#10b981;font-weight:700;" class="gr-subtotal">฿0.00</td>' +
    '<td style="padding:4px;"><button class="btn-icon-sm btn-danger" type="button" onclick="removeGRItemRow(this)" style="width:22px;height:22px;"><i data-lucide="x" style="width:10px;height:10px;"></i></button></td>';
  tbody.appendChild(tr);
  lucide.createIcons();
  recalcTotals();
}

function removeGRItemRow(btn) {
  btn.closest("tr").remove();
  recalcTotals();
}

function recalcTotals() {
  var total = 0;
  document.querySelectorAll("#grItemsBody tr").forEach(function (tr) {
    var qty = parseFloat(tr.querySelector(".gr-qty").value) || 0;
    var cost = parseFloat(tr.querySelector(".gr-cost").value) || 0;
    var sub = qty * cost;
    tr.querySelector(".gr-subtotal").textContent = fmtMoney(sub);
    total += sub;
  });
  document.getElementById("sumTotal").textContent = fmtMoney(total);
}

// ============ Modal ============
function openGRModal(title, g) {
  if (!allProducts.length) { alertMsg("ยังไม่มีสินค้า", "กรุณาเพิ่มสินค้าก่อน"); return; }
  if (!allWarehouses.length) { alertMsg("ยังไม่มีคลัง", "กรุณาเพิ่มคลังก่อน"); return; }
  document.getElementById("modalTitle").textContent = title;
  document.getElementById("editId").value = g ? g.id : "";
  document.getElementById("inputGRNumber").value = g ? g.gr_number : generateGRNumber();
  document.getElementById("inputDate").value = g ? g.date : new Date().toISOString().slice(0, 10);
  document.getElementById("inputStatus").value = g ? g.status : "completed";
  document.getElementById("inputNote").value = g ? (g.note || "") : "";
  populatePODropdown(g ? g.po_id : null);
  populateSupplierDropdown(g ? g.supplier_id : null);
  populateWarehouseDropdown(g ? g.warehouse_id : null);

  var tbody = document.getElementById("grItemsBody");
  tbody.innerHTML = "";
  var items = g && g.goods_receipt_items ? g.goods_receipt_items : [];
  if (items.length) {
    items.forEach(function (it) { addGRItemRow({ product_id: it.product_id, qty: it.qty, cost: it.cost }); });
  } else {
    addGRItemRow();
  }
  recalcTotals();
  openModalById("grModal");
}

function alertMsg(title, message) {
  if (typeof showConfirm === "function") {
    showConfirm({ title: title, message: message, okText: "OK", okColor: "#47b8b4", onConfirm: function () {} });
  }
}

function collectItems() {
  var items = [];
  document.querySelectorAll("#grItemsBody tr").forEach(function (tr) {
    var pid = Number(tr.querySelector(".gr-product").value);
    var qty = parseFloat(tr.querySelector(".gr-qty").value);
    var cost = parseFloat(tr.querySelector(".gr-cost").value);
    if (pid && qty > 0) {
      items.push({ product_id: pid, qty: qty, cost: cost || 0 });
    }
  });
  return items;
}

function saveGR() {
  var id = document.getElementById("editId").value;
  var grNumber = document.getElementById("inputGRNumber").value.trim();
  var poId = Number(document.getElementById("inputPO").value) || null;
  var supplierId = Number(document.getElementById("inputSupplier").value) || null;
  var warehouseId = Number(document.getElementById("inputWarehouse").value) || null;
  var date = document.getElementById("inputDate").value;
  var status = document.getElementById("inputStatus").value;
  var note = document.getElementById("inputNote").value.trim();
  var items = collectItems();

  if (!warehouseId) { alertMsg("ไม่ครบถ้วน", "กรุณาเลือกคลังที่รับเข้า"); return; }
  if (!date) return document.getElementById("inputDate").focus();
  if (!items.length) { alertMsg("ไม่ถูกต้อง", "กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ"); return; }

  var header = {
    gr_number: grNumber,
    po_id: poId,
    supplier_id: supplierId,
    warehouse_id: warehouseId,
    date: date,
    status: status,
    note: note || null,
  };

  var op = id
    ? updateGoodsReceiptDB(Number(id), header, items)
    : createGoodsReceiptDB(header, items);

  op.then(function () { return reloadGRs(); })
    .then(function () {
      closeModalById("grModal");
      applyFilters();
    })
    .catch(function (err) { console.error(err); alertMsg("เกิดข้อผิดพลาด", err.message || "บันทึกไม่สำเร็จ"); });
}

function editGR(id) {
  var g = goodsReceipts.find(function (x) { return x.id === id; });
  if (g) openGRModal("Edit GR", g);
}

function deleteGR(id) {
  var g = goodsReceipts.find(function (x) { return x.id === id; });
  if (!g) return;
  var msg = "ต้องการลบใบรับสินค้า <strong>" + g.gr_number + "</strong> ใช่ไหม?";
  if (g.status === "completed") msg += "<br><br><span style='color:#ef4444;font-size:10px;'>⚠️ GR นี้เคย update stock แล้ว — ระบบจะสร้าง movement reverse อัตโนมัติ</span>";
  showConfirm({
    title: "Confirm Delete",
    message: msg,
    okText: "Delete",
    okColor: "#ef4444",
    onConfirm: function () {
      deleteGoodsReceiptDB(id)
        .then(function () { return reloadGRs(); })
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
  var data = goodsReceipts.slice();

  if (currentFilter !== "all") data = data.filter(function (g) { return g.status === currentFilter; });

  if (keyword) {
    data = data.filter(function (g) {
      var poRef = g.purchase_orders ? g.purchase_orders.po_number.toLowerCase() : "";
      var sName = g.suppliers ? g.suppliers.name.toLowerCase() : "";
      return (g.gr_number || "").toLowerCase().includes(keyword) || poRef.includes(keyword) || sName.includes(keyword);
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
    typeof fetchPurchaseOrdersDB === "function" ? fetchPurchaseOrdersDB() : Promise.resolve([]),
    typeof fetchGoodsReceiptsDB === "function" ? fetchGoodsReceiptsDB() : Promise.resolve([]),
  ]).then(function (res) {
    allSuppliers = (res[0] || []).map(function (s) { return { id: s.id, name: s.name || "", status: s.status || "active" }; });
    allProducts = (res[1] || []).map(function (p) { return { id: p.id, name: p.name || "", sku: p.sku || "" }; });
    allWarehouses = (res[2] || []).map(function (w) { return { id: w.id, name: w.name || "" }; });
    allPOs = (res[3] || []).map(function (po) {
      return {
        id: po.id, po_number: po.po_number, supplier_id: po.supplier_id, status: po.status,
        suppliers: po.suppliers || null,
        purchase_order_items: po.purchase_order_items || [],
      };
    });
    goodsReceipts = (res[4] || []).map(normalizeGR);
  });
}

function reloadGRs() {
  return (typeof fetchGoodsReceiptsDB === "function" ? fetchGoodsReceiptsDB() : Promise.resolve([]))
    .then(function (rows) { goodsReceipts = (rows || []).map(normalizeGR); });
}

function normalizeGR(g) {
  return {
    id: g.id,
    gr_number: g.gr_number || "",
    po_id: g.po_id,
    supplier_id: g.supplier_id,
    warehouse_id: g.warehouse_id,
    date: g.date || "",
    status: g.status || "completed",
    note: g.note || "",
    purchase_orders: g.purchase_orders || null,
    suppliers: g.suppliers || null,
    warehouses: g.warehouses || null,
    goods_receipt_items: g.goods_receipt_items || [],
  };
}

// ============ Random fill ============
if (typeof registerRandomFill === "function") {
  registerRandomFill({
    target: "#grModal",
    fill: function () {
      // gr_number readonly — skip
      setFieldValue("inputDate", randomPastDate(30));
      pickRandomSelectOption("inputPO", { includeEmpty: true });
      if (typeof onPOChange === "function") { try { onPOChange(); } catch (e) {} }
      var sup = document.getElementById("inputSupplier");
      if (sup && !sup.value) pickRandomSelectOption("inputSupplier");
      var wh = document.getElementById("inputWarehouse");
      if (wh && !wh.value) pickRandomSelectOption("inputWarehouse");
      pickRandomSelectOption("inputStatus");
      setFieldValue("inputNote", randomNote());
      var itemsBody = document.getElementById("grItemsBody");
      if (itemsBody && !itemsBody.children.length && typeof addGRItemRow === "function" && typeof allProducts !== "undefined" && allProducts.length) {
        var count = rdInt(1, 2);
        for (var i = 0; i < count; i++) {
          var p = rdPick(allProducts);
          addGRItemRow({ product_id: p.id, qty: randomQty(1, 20), cost: randomMoney(30, 1500) });
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

  document.getElementById("addGRBtn").addEventListener("click", function () {
    openGRModal("Create GR", null);
  });

  reloadAll()
    .then(function () { applyFilters(); })
    .catch(function (err) { console.error(err); applyFilters(); });
});
