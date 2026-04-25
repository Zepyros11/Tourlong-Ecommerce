// ============================================================
// purchase-order-form.js — Create/Edit Purchase Order (หน้า form แยก)
// list อยู่ที่ purchase-orders.html / purchase-orders.js
// ============================================================

var allSuppliers = [];
var allProducts = [];
var allPOs = [];
var editingPO = null;

function fmtMoney(n) { return "฿" + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function getQueryId() {
  var params = new URLSearchParams(window.location.search);
  var id = params.get("id");
  return id ? Number(id) : null;
}

// ============ PO Number ============
function generatePONumber(year) {
  var y = Number(year) || new Date().getFullYear();
  var prefix = "PO-" + y + "-";
  var maxNum = 0;
  allPOs.forEach(function (po) {
    if (po.po_number && po.po_number.indexOf(prefix) === 0) {
      var n = parseInt(po.po_number.slice(prefix.length), 10);
      if (n > maxNum) maxNum = n;
    }
  });
  return prefix + String(maxNum + 1).padStart(3, "0");
}

function getYearFromDateInput() {
  var v = document.getElementById("inputDate").value;
  if (v && v.length >= 4) return Number(v.slice(0, 4));
  return new Date().getFullYear();
}

function refreshPONumberFromDate() {
  if (document.getElementById("editId").value) return; // ไม่แก้เลขเดิมตอน edit
  document.getElementById("inputPONumber").value = generatePONumber(getYearFromDateInput());
}

// ============ Dropdowns ============
function buildProductOptions(selectedId) {
  return '<option value="">— เลือกสินค้า —</option>' + allProducts.map(function (p) {
    var sel = selectedId && Number(selectedId) === p.id ? ' selected' : '';
    return '<option value="' + p.id + '" data-cost="' + (p.price || 0) + '"' + sel + '>' + p.name + '</option>';
  }).join("");
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

// ============ Line Items ============
function addPOItemRow(data) {
  var tbody = document.getElementById("poItemsBody");
  var tr = document.createElement("tr");
  var d = data || {};
  tr.innerHTML =
    '<td><select class="form-select po-product" onchange="onProductChange(this)">' + buildProductOptions(d.product_id) + '</select></td>' +
    '<td><input type="number" class="form-input po-qty" value="' + (d.qty || "") + '" min="0" step="any" oninput="recalcTotals()" style="text-align:right;" /></td>' +
    '<td><input type="number" class="form-input po-cost" value="' + (d.cost || "") + '" min="0" step="0.01" oninput="recalcTotals()" style="text-align:right;" /></td>' +
    '<td style="text-align:right;color:#10b981;font-weight:700;" class="po-subtotal">฿0.00</td>' +
    '<td><button class="btn-icon-sm btn-danger" type="button" onclick="removePOItemRow(this)" style="width:24px;height:24px;"><i data-lucide="x" style="width:12px;height:12px;"></i></button></td>';
  tbody.appendChild(tr);
  lucide.createIcons();
  recalcTotals();
}

function removePOItemRow(btn) {
  btn.closest("tr").remove();
  recalcTotals();
}

function onProductChange(select) {
  var opt = select.options[select.selectedIndex];
  var cost = opt ? Number(opt.getAttribute("data-cost")) || 0 : 0;
  var tr = select.closest("tr");
  var costInput = tr.querySelector(".po-cost");
  if (cost && !costInput.value) costInput.value = cost;
  recalcTotals();
}

function recalcTotals() {
  var subtotal = 0;
  document.querySelectorAll("#poItemsBody tr").forEach(function (tr) {
    var qty = parseFloat(tr.querySelector(".po-qty").value) || 0;
    var cost = parseFloat(tr.querySelector(".po-cost").value) || 0;
    var sub = qty * cost;
    tr.querySelector(".po-subtotal").textContent = fmtMoney(sub);
    subtotal += sub;
  });
  var taxPercent = parseFloat(document.getElementById("inputTaxPercent").value) || 0;
  var shipping = parseFloat(document.getElementById("inputShipping").value) || 0;
  var taxAmount = subtotal * (taxPercent / 100);
  document.getElementById("sumSubtotal").textContent = fmtMoney(subtotal);
  document.getElementById("sumTaxAmount").textContent = fmtMoney(taxAmount);
  document.getElementById("sumTotal").textContent = fmtMoney(subtotal + taxAmount + shipping);
}

// ============ Fill form ============
function fillForm(po) {
  document.getElementById("editId").value = po ? po.id : "";
  var dateVal = po ? po.date : new Date().toISOString().slice(0, 10);
  document.getElementById("inputDate").value = dateVal;
  var yr = dateVal && dateVal.length >= 4 ? Number(dateVal.slice(0, 4)) : new Date().getFullYear();
  document.getElementById("inputPONumber").value = po ? po.po_number : generatePONumber(yr);
  document.getElementById("inputStatus").value = po ? po.status : "pending";
  var taxPercent = 7;
  if (po) {
    if (po.tax_percent != null) taxPercent = Number(po.tax_percent);
    else if (po.subtotal > 0 && po.tax) taxPercent = Math.round((Number(po.tax) / Number(po.subtotal)) * 10000) / 100;
    else taxPercent = 0;
  }
  document.getElementById("inputTaxPercent").value = taxPercent;
  document.getElementById("inputShipping").value = po ? (po.shipping || 0) : 0;
  document.getElementById("inputNote").value = po ? (po.note || "") : "";
  populateSupplierDropdown(po ? po.supplier_id : null);

  var tbody = document.getElementById("poItemsBody");
  tbody.innerHTML = "";
  var items = po && po.purchase_order_items ? po.purchase_order_items : [];
  if (items.length) {
    items.forEach(function (it) { addPOItemRow({ product_id: it.product_id, qty: it.qty, cost: it.cost }); });
  } else {
    addPOItemRow();
  }
  recalcTotals();
}

// ============ Save ============
function collectItems() {
  var items = [];
  document.querySelectorAll("#poItemsBody tr").forEach(function (tr) {
    var pid = Number(tr.querySelector(".po-product").value);
    var qty = parseFloat(tr.querySelector(".po-qty").value);
    var cost = parseFloat(tr.querySelector(".po-cost").value);
    if (pid && qty > 0 && cost >= 0) {
      items.push({ product_id: pid, qty: qty, cost: cost });
    }
  });
  return items;
}

function savePO() {
  var id = document.getElementById("editId").value;
  var poNumber = document.getElementById("inputPONumber").value.trim();
  var supplierId = Number(document.getElementById("inputSupplier").value) || null;
  var date = document.getElementById("inputDate").value;
  var status = document.getElementById("inputStatus").value;
  var taxPercent = parseFloat(document.getElementById("inputTaxPercent").value) || 0;
  var shipping = parseFloat(document.getElementById("inputShipping").value) || 0;
  var note = document.getElementById("inputNote").value.trim();
  var items = collectItems();

  if (!date) { document.getElementById("inputDate").focus(); return; }
  if (!supplierId) { showToast("กรุณาเลือกผู้ขาย", "warning"); document.getElementById("inputSupplier").focus(); return; }
  if (!items.length) { showToast("กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ", "warning"); return; }

  var subtotal = items.reduce(function (s, it) { return s + it.qty * it.cost; }, 0);
  var taxAmount = subtotal * (taxPercent / 100);
  var total = subtotal + taxAmount + shipping;

  var header = {
    po_number: poNumber,
    supplier_id: supplierId,
    date: date,
    subtotal: subtotal,
    tax: taxAmount,
    tax_percent: taxPercent,
    shipping: shipping,
    total: total,
    status: status,
    note: note || null,
  };

  var saveBtn = document.getElementById("savePOBtn");
  saveBtn.disabled = true;

  var op = id
    ? updatePurchaseOrderDB(Number(id), header, items)
    : createPurchaseOrderDB(header, items);

  op.then(function () {
    showToast(id ? "บันทึกการแก้ไขสำเร็จ" : "สร้างใบสั่งซื้อสำเร็จ", "success");
    setTimeout(function () { window.location.href = "purchase-orders.html"; }, 600);
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
      if (!allSuppliers.length) missing.push("ผู้ขาย");
      if (!allProducts.length) missing.push("สินค้า");
      if (missing.length) {
        if (typeof showToast === "function") showToast("ยังไม่มีข้อมูล " + missing.join(" / ") + " — กรุณาเพิ่มก่อน", "warning");
        return;
      }
      setFieldValue("inputDate", randomPastDate(60));
      refreshPONumberFromDate();
      pickRandomSelectOption("inputSupplier");
      pickRandomSelectOption("inputStatus", { includeEmpty: true });
      setFieldValue("inputNote", randomNote());
      setFieldValue("inputTaxPercent", rdPick([0, 7, 10]));
      setFieldValue("inputShipping", rdPick([0, 50, 100, 200, 500]));
      // clear + add 1-3 random line items
      document.getElementById("poItemsBody").innerHTML = "";
      var n = rdInt(1, 3);
      for (var i = 0; i < n; i++) {
        var p = rdPick(allProducts);
        addPOItemRow({ product_id: p.id, qty: rdInt(1, 20), cost: rdFloat(20, 500, 2) });
      }
      recalcTotals();
    },
  });
}

// ============ Init ============
document.addEventListener("DOMContentLoaded", function () {
  var editId = getQueryId();

  document.getElementById("inputDate").addEventListener("change", refreshPONumberFromDate);

  Promise.all([
    typeof fetchSuppliersDB === "function" ? fetchSuppliersDB() : Promise.resolve([]),
    typeof fetchProducts === "function" ? fetchProducts() : Promise.resolve([]),
    typeof fetchPurchaseOrdersDB === "function" ? fetchPurchaseOrdersDB() : Promise.resolve([]),
  ]).then(function (res) {
    allSuppliers = (res[0] || []).map(function (s) {
      return { id: s.id, name: s.name || "", status: s.status || "active" };
    });
    allProducts = (res[1] || []).map(function (p) {
      return { id: p.id, name: p.name || "", sku: p.sku || "", price: Number(p.price) || 0 };
    });
    allPOs = res[2] || [];

    if (!allProducts.length) {
      showToast("ยังไม่มีสินค้า — กรุณาเพิ่มสินค้าก่อน", "warning", 4000);
    }
    if (!allSuppliers.length) {
      showToast("ยังไม่มีผู้ขาย — กรุณาเพิ่มผู้ขายก่อน", "warning", 4000);
    }

    if (editId) {
      editingPO = allPOs.find(function (x) { return x.id === editId; });
      if (editingPO) {
        document.getElementById("pageTitle").textContent = "Edit PO";
        document.getElementById("pageSubtitle").textContent = "แก้ไขใบสั่งซื้อ " + (editingPO.po_number || "");
        fillForm({
          id: editingPO.id,
          po_number: editingPO.po_number || "",
          supplier_id: editingPO.supplier_id,
          date: editingPO.date || "",
          subtotal: Number(editingPO.subtotal) || 0,
          tax: Number(editingPO.tax) || 0,
          tax_percent: editingPO.tax_percent != null ? Number(editingPO.tax_percent) : null,
          shipping: Number(editingPO.shipping) || 0,
          status: editingPO.status || "pending",
          note: editingPO.note || "",
          purchase_order_items: editingPO.purchase_order_items || [],
        });
      } else {
        showToast("ไม่พบใบสั่งซื้อที่ต้องการแก้ไข", "error");
        fillForm(null);
      }
    } else {
      fillForm(null);
    }
  }).catch(function (err) {
    console.error(err);
    showToast("โหลดข้อมูลไม่สำเร็จ", "error");
    fillForm(null);
  });
});
