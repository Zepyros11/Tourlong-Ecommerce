// ============================================================
// goods-receive-form.js — Create/Edit Goods Receipt (หน้า form แยก)
// list อยู่ที่ goods-receive.html / goods-receive.js
// ============================================================

var allGRs = [];
var allPOs = [];
var allSuppliers = [];
var allWarehouses = [];
var allProducts = [];
var editingGR = null;

function fmtMoney(n) { return "฿" + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

// ============ GR Number ============
function generateGRNumber(year) {
  var y = Number(year) || new Date().getFullYear();
  var prefix = "GR-" + y + "-";
  var maxNum = 0;
  allGRs.forEach(function (g) {
    if (g.gr_number && g.gr_number.indexOf(prefix) === 0) {
      var n = parseInt(g.gr_number.slice(prefix.length), 10);
      if (n > maxNum) maxNum = n;
    }
  });
  return prefix + String(maxNum + 1).padStart(3, "0");
}

function refreshGRNumberFromDate() {
  if (document.getElementById("editId").value) return; // ไม่แก้ตอน edit
  var v = document.getElementById("inputDate").value;
  var yr = v && v.length >= 4 ? Number(v.slice(0, 4)) : new Date().getFullYear();
  document.getElementById("inputGRNumber").value = generateGRNumber(yr);
}

// ============ Outstanding qty (per PO item) ============
function computePOOutstanding(po) {
  // returns map<po_item_id, {po_item_id, product_id, ordered, received, remaining}>
  var result = {};
  (po.purchase_order_items || []).forEach(function (it) {
    result[it.id] = { po_item_id: it.id, product_id: it.product_id, ordered: Number(it.qty) || 0, received: 0, remaining: Number(it.qty) || 0 };
  });
  // subtract received qty from ALL GRs linked to this PO (except the one currently being edited)
  var currentEditId = document.getElementById("editId").value;
  (allGRs || []).forEach(function (g) {
    if (Number(g.po_id) !== Number(po.id)) return;
    if (g.status === "cancelled") return;
    if (currentEditId && Number(g.id) === Number(currentEditId)) return; // exclude self on edit
    (g.goods_receipt_items || []).forEach(function (it) {
      if (!it.po_item_id) return;
      var row = result[it.po_item_id];
      if (!row) return;
      row.received += Number(it.qty) || 0;
      row.remaining = Math.max(0, row.ordered - row.received);
    });
  });
  return result;
}

function isPOFullyReceived(po) {
  var out = computePOOutstanding(po);
  var ids = Object.keys(out);
  if (!ids.length) return false;
  return ids.every(function (k) { return out[k].remaining <= 0; });
}

// Overall across ALL GRs (no self-exclude) — for displaying PO status in dropdown
function computePOOverall(po) {
  var ordered = 0, received = 0;
  (po.purchase_order_items || []).forEach(function (it) { ordered += Number(it.qty) || 0; });
  (allGRs || []).forEach(function (g) {
    if (Number(g.po_id) !== Number(po.id)) return;
    if (g.status === "cancelled") return;
    (g.goods_receipt_items || []).forEach(function (it) {
      if (!it.po_item_id) return;
      received += Number(it.qty) || 0;
    });
  });
  return { ordered: ordered, received: received, remaining: Math.max(0, ordered - received) };
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
    // Use "overall" (include all GRs) for the dropdown label — reflects real PO status
    var overall = computePOOverall(po);
    var isFull = overall.ordered > 0 && overall.remaining <= 0;
    var suffix = overall.ordered > 0
      ? (isFull ? " — รับครบแล้ว" : " — เหลือ " + overall.remaining + "/" + overall.ordered)
      : "";
    // keep fully-received PO selectable only if it's the current edit target
    var disabled = isFull && Number(selectedId) !== Number(po.id) ? " disabled" : "";
    html += '<option value="' + po.id + '"' + disabled + '>' + po.po_number +
            (po.suppliers ? ' — ' + po.suppliers.name : '') + suffix + '</option>';
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
  refreshWarehouseHighlight();
}

// Highlight ช่องคลังเมื่อยังไม่ได้เลือก (required field)
function refreshWarehouseHighlight() {
  var sel = document.getElementById("inputWarehouse");
  if (!sel) return;
  if (!sel.value) {
    sel.style.borderColor = "#f59e0b";
    sel.style.background = "#fffbeb";
    sel.style.boxShadow = "0 0 0 3px rgba(245, 158, 11, 0.15)";
  } else {
    sel.style.borderColor = "";
    sel.style.background = "";
    sel.style.boxShadow = "";
  }
}

// ============ PO auto-fill ============
function onPOChange() {
  var poId = Number(document.getElementById("inputPO").value);
  if (!poId) return;
  var po = allPOs.find(function (p) { return p.id === poId; });
  if (!po) return;
  if (po.supplier_id) document.getElementById("inputSupplier").value = String(po.supplier_id);
  var outstanding = computePOOutstanding(po);
  var tbody = document.getElementById("grItemsBody");
  tbody.innerHTML = "";
  (po.purchase_order_items || []).forEach(function (it) {
    var info = outstanding[it.id];
    var remaining = info ? info.remaining : Number(it.qty) || 0;
    if (remaining <= 0) return; // skip fully-received lines
    addGRItemRow({ po_item_id: it.id, product_id: it.product_id, qty: remaining, cost: it.cost, po_qty: remaining });
  });
  if (!tbody.children.length) {
    if (typeof showToast === "function") showToast("PO นี้รับครบทุกรายการแล้ว", "info");
    addGRItemRow();
  }
  recalcTotals();
}

// ============ Line Items ============
function addGRItemRow(data) {
  var tbody = document.getElementById("grItemsBody");
  var tr = document.createElement("tr");
  var d = data || {};
  var poQty = d.po_qty != null ? Number(d.po_qty) : null;
  if (poQty != null) tr.dataset.poQty = String(poQty);
  if (d.po_item_id) tr.dataset.poItemId = String(d.po_item_id);

  // row อ้างอิง PO → ปิดการแก้ไขทุกฟิลด์ (รับครบตาม PO เท่านั้น)
  var isPORef = !!d.po_item_id;
  var lockAttr = isPORef ? " readonly tabindex=\"-1\"" : "";
  var lockSelectAttr = isPORef ? " disabled" : "";
  var lockStyle = isPORef ? "background:#f1f5f9;cursor:not-allowed;" : "";

  var varianceHtml = poQty != null
    ? '<div class="qty-variance" style="font-size:9px;margin-top:3px;text-align:right;color:#94a3b8;font-weight:600;">คาด: ' + poQty + '</div>'
    : '';
  var removeBtnHtml = isPORef
    ? '<span style="color:#cbd5e1;font-size:11px;" title="row อ้างอิง PO — ลบไม่ได้">🔒</span>'
    : '<button class="btn-icon-sm btn-danger" type="button" onclick="removeGRItemRow(this)" style="width:24px;height:24px;"><i data-lucide="x" style="width:12px;height:12px;"></i></button>';

  tr.innerHTML =
    '<td><select class="form-select gr-product"' + lockSelectAttr + ' style="' + lockStyle + '">' + buildProductOptions(d.product_id) + '</select></td>' +
    '<td><input type="number" class="form-input gr-qty" value="' + (d.qty || "") + '" min="0" step="any" oninput="recalcTotals()" style="text-align:right;' + lockStyle + '"' + lockAttr + ' />' + varianceHtml + '</td>' +
    '<td><input type="number" class="form-input gr-cost" value="' + (d.cost || "") + '" min="0" step="0.01" oninput="recalcTotals()" style="text-align:right;' + lockStyle + '"' + lockAttr + ' /></td>' +
    '<td style="text-align:right;color:#10b981;font-weight:700;" class="gr-subtotal">฿0.00</td>' +
    '<td>' + removeBtnHtml + '</td>';
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
  var refRows = 0, exactRows = 0, shortRows = 0, overRows = 0;
  document.querySelectorAll("#grItemsBody tr").forEach(function (tr) {
    var qty = parseFloat(tr.querySelector(".gr-qty").value) || 0;
    var cost = parseFloat(tr.querySelector(".gr-cost").value) || 0;
    var sub = qty * cost;
    tr.querySelector(".gr-subtotal").textContent = fmtMoney(sub);
    total += sub;

    var poQty = tr.dataset.poQty ? Number(tr.dataset.poQty) : null;
    if (poQty == null) return;
    refRows++;
    var variance = tr.querySelector(".qty-variance");
    if (!variance) return;
    if (qty === poQty) {
      variance.textContent = "✓ ครบ (" + poQty + ")";
      variance.style.color = "#10b981";
      exactRows++;
    } else if (qty < poQty) {
      variance.textContent = "⚠ ต้องรับครบ " + poQty + " (ขาด " + (poQty - qty) + ")";
      variance.style.color = "#ef4444";
      shortRows++;
    } else {
      variance.textContent = "⚠ ต้องรับ " + poQty + " เท่านั้น (เกิน " + (qty - poQty) + ")";
      variance.style.color = "#ef4444";
      overRows++;
    }
  });
  document.getElementById("sumTotal").textContent = fmtMoney(total);
  updateReceiveSummary(refRows, exactRows, shortRows, overRows);
}

function updateReceiveSummary(refRows, exact, shortR, over) {
  var banner = document.getElementById("receiveSummary");
  if (!banner) return;
  if (refRows === 0) { banner.style.display = "none"; return; }
  banner.style.display = "flex";
  if (shortR === 0 && over === 0 && exact === refRows) {
    banner.innerHTML = '<span style="color:#10b981;font-weight:700;">✓ ครบทุกรายการ — พร้อมบันทึก</span>';
    banner.style.background = "#ecfdf5";
  } else {
    var parts = [];
    if (shortR > 0) parts.push('<span style="color:#ef4444;font-weight:700;">⚠ รับไม่ครบ ' + shortR + ' รายการ</span>');
    if (over > 0) parts.push('<span style="color:#ef4444;font-weight:700;">⚠ รับเกิน ' + over + ' รายการ</span>');
    parts.push('<span style="color:#64748b;font-size:10px;">— GR ต้องรับเต็มจำนวน PO เท่านั้น</span>');
    banner.innerHTML = parts.join(' <span style="color:#cbd5e1;">·</span> ');
    banner.style.background = "#fef2f2";
  }
}

// ============ Fill form ============
function fillForm(g, poIdFromQuery) {
  document.getElementById("editId").value = g ? g.id : "";
  var dateVal = g ? g.date : new Date().toISOString().slice(0, 10);
  document.getElementById("inputDate").value = dateVal;
  var yr = dateVal && dateVal.length >= 4 ? Number(dateVal.slice(0, 4)) : new Date().getFullYear();
  document.getElementById("inputGRNumber").value = g ? g.gr_number : generateGRNumber(yr);
  document.getElementById("inputStatus").value = g ? g.status : "completed";
  document.getElementById("inputNote").value = g ? (g.note || "") : "";

  populatePODropdown(g ? g.po_id : (poIdFromQuery || null));
  populateSupplierDropdown(g ? g.supplier_id : null);
  populateWarehouseDropdown(g ? g.warehouse_id : null);

  var tbody = document.getElementById("grItemsBody");
  tbody.innerHTML = "";

  if (g && g.goods_receipt_items && g.goods_receipt_items.length) {
    // Edit mode with PO ref: show ALL PO items (even qty=0 for unreceived), plus manual rows
    var po = g.po_id ? allPOs.find(function (p) { return p.id === g.po_id; }) : null;
    var poItems = po ? (po.purchase_order_items || []).slice() : [];
    var outstanding = po ? computePOOutstanding(po) : {};

    if (poItems.length) {
      var matchedGRIds = {};
      // 1. iterate every PO item — find corresponding GR item (by FK, fallback product_id)
      poItems.forEach(function (pi) {
        var grItem = g.goods_receipt_items.find(function (gi) {
          return Number(gi.po_item_id) === Number(pi.id);
        });
        if (!grItem) {
          grItem = g.goods_receipt_items.find(function (gi) {
            return !gi.po_item_id && Number(gi.product_id) === Number(pi.product_id) && !matchedGRIds[gi.id];
          });
        }
        if (grItem) matchedGRIds[grItem.id] = true;
        var info = outstanding[pi.id];
        var poQty = info ? info.remaining : Number(pi.qty);
        addGRItemRow({
          po_item_id: pi.id,
          product_id: pi.product_id,
          qty: grItem ? grItem.qty : 0,
          cost: grItem ? grItem.cost : pi.cost,
          po_qty: poQty,
        });
      });
      // 2. append any manual GR rows that didn't match a PO item
      g.goods_receipt_items.forEach(function (gi) {
        if (matchedGRIds[gi.id]) return;
        addGRItemRow({
          po_item_id: gi.po_item_id || null,
          product_id: gi.product_id,
          qty: gi.qty,
          cost: gi.cost,
          po_qty: null,
        });
      });
    } else {
      // No PO reference — just render saved rows as-is
      g.goods_receipt_items.forEach(function (it) {
        addGRItemRow({ po_item_id: it.po_item_id || null, product_id: it.product_id, qty: it.qty, cost: it.cost, po_qty: null });
      });
    }
  } else if (poIdFromQuery) {
    // pre-fill from PO reference
    onPOChange();
  } else {
    addGRItemRow();
  }
  recalcTotals();
}

// ============ Save ============
function collectItems() {
  var items = [];
  document.querySelectorAll("#grItemsBody tr").forEach(function (tr) {
    var pid = Number(tr.querySelector(".gr-product").value);
    var qty = parseFloat(tr.querySelector(".gr-qty").value);
    var cost = parseFloat(tr.querySelector(".gr-cost").value);
    var poItemId = tr.dataset.poItemId ? Number(tr.dataset.poItemId) : null;
    if (pid && qty > 0) {
      items.push({ po_item_id: poItemId, product_id: pid, qty: qty, cost: cost || 0 });
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

  if (!warehouseId) {
    showToast("กรุณาเลือกคลังที่รับเข้า", "warning");
    var whEl = document.getElementById("inputWarehouse");
    whEl.style.borderColor = "#ef4444";
    whEl.focus();
    whEl.addEventListener("change", function () { whEl.style.borderColor = ""; }, { once: true });
    return;
  }
  if (!date) {
    showToast("กรุณาระบุวันที่รับ", "warning");
    var dtEl = document.getElementById("inputDate");
    dtEl.style.borderColor = "#ef4444";
    dtEl.focus();
    dtEl.addEventListener("change", function () { dtEl.style.borderColor = ""; }, { once: true });
    return;
  }
  if (!items.length) { showToast("กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ", "warning"); return; }

  // GR ต้องรับครบเท่านั้น — ทุกบรรทัดที่อ้างอิง PO ต้อง qty == po_qty
  var shortLines = [];
  var overLines = [];
  document.querySelectorAll("#grItemsBody tr").forEach(function (tr) {
    var poQty = tr.dataset.poQty ? Number(tr.dataset.poQty) : null;
    if (poQty == null) return; // manual row ที่ไม่มี ref PO ไม่ตรวจ
    var qty = parseFloat(tr.querySelector(".gr-qty").value) || 0;
    if (qty < poQty) shortLines.push(poQty - qty);
    else if (qty > poQty) overLines.push(qty - poQty);
  });
  if (shortLines.length) {
    showToast("รับไม่ครบ " + shortLines.length + " รายการ — GR ต้องรับเต็มจำนวน PO", "warning");
    return;
  }
  if (overLines.length) {
    showToast("รับเกิน " + overLines.length + " รายการ — qty ต้องเท่ากับยอดสั่ง", "warning");
    return;
  }

  var header = {
    gr_number: grNumber,
    po_id: poId,
    supplier_id: supplierId,
    warehouse_id: warehouseId,
    date: date,
    status: status,
    note: note || null,
  };

  var saveBtn = document.getElementById("saveGRBtn");
  saveBtn.disabled = true;

  var op = id
    ? updateGoodsReceiptDB(Number(id), header, items)
    : createGoodsReceiptDB(header, items);

  op.then(function () {
    showToast(id ? "บันทึกการแก้ไขสำเร็จ" : "สร้างใบรับสินค้าสำเร็จ", "success");
    setTimeout(function () { window.location.href = "goods-receive.html"; }, 600);
  }).catch(function (err) {
    console.error(err);
    showToast(err.message || "บันทึกไม่สำเร็จ", "error");
    saveBtn.disabled = false;
  });
}

// ============ Random fill (dev) ============
if (typeof registerRandomFill === "function") {
  registerRandomFill({
    target: "page",
    fill: function () {
      var missing = [];
      if (!allProducts.length) missing.push("สินค้า");
      if (!allWarehouses.length) missing.push("คลัง");
      if (missing.length) {
        if (typeof showToast === "function") showToast("ยังไม่มีข้อมูล " + missing.join(" / ") + " — กรุณาเพิ่มก่อน", "warning");
        return;
      }
      setFieldValue("inputDate", randomPastDate(30));
      refreshGRNumberFromDate();
      pickRandomSelectOption("inputPO", { includeEmpty: true });
      if (typeof onPOChange === "function") { try { onPOChange(); } catch (e) {} }
      var sup = document.getElementById("inputSupplier");
      if (sup && !sup.value) pickRandomSelectOption("inputSupplier");
      var wh = document.getElementById("inputWarehouse");
      if (wh && !wh.value) pickRandomSelectOption("inputWarehouse");
      pickRandomSelectOption("inputStatus");
      setFieldValue("inputNote", randomNote());
      var itemsBody = document.getElementById("grItemsBody");
      if (itemsBody && !itemsBody.children.length) {
        var count = rdInt(1, 2);
        for (var i = 0; i < count; i++) {
          var p = rdPick(allProducts);
          addGRItemRow({ product_id: p.id, qty: randomQty(1, 20), cost: randomMoney(30, 1500) });
        }
      }
      recalcTotals();
    },
  });
}

// ============ Init ============
document.addEventListener("DOMContentLoaded", function () {
  var editId = getQueryParam("id");
  var poIdFromQuery = getQueryParam("po_id");

  document.getElementById("inputDate").addEventListener("change", refreshGRNumberFromDate);
  document.getElementById("inputWarehouse").addEventListener("change", refreshWarehouseHighlight);

  Promise.all([
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
    allGRs = res[4] || [];

    if (!allProducts.length) showToast("ยังไม่มีสินค้า — กรุณาเพิ่มสินค้าก่อน", "warning", 4000);
    if (!allWarehouses.length) showToast("ยังไม่มีคลัง — กรุณาเพิ่มคลังก่อน", "warning", 4000);

    if (editId) {
      editingGR = allGRs.find(function (x) { return Number(x.id) === Number(editId); });
      if (editingGR) {
        document.getElementById("pageTitle").textContent = "แก้ไขใบรับสินค้า";
        document.getElementById("pageSubtitle").textContent = editingGR.gr_number || "";
        fillForm({
          id: editingGR.id,
          gr_number: editingGR.gr_number || "",
          po_id: editingGR.po_id,
          supplier_id: editingGR.supplier_id,
          warehouse_id: editingGR.warehouse_id,
          date: editingGR.date || "",
          status: editingGR.status || "completed",
          note: editingGR.note || "",
          goods_receipt_items: editingGR.goods_receipt_items || [],
        });
      } else {
        showToast("ไม่พบใบรับสินค้าที่ต้องการแก้ไข", "error");
        fillForm(null);
      }
    } else {
      fillForm(null, poIdFromQuery ? Number(poIdFromQuery) : null);
      if (poIdFromQuery) {
        // cleanup query string
        history.replaceState({}, "", "goods-receive-form.html");
      }
    }
  }).catch(function (err) {
    console.error(err);
    showToast("โหลดข้อมูลไม่สำเร็จ", "error");
    fillForm(null);
  });
});
