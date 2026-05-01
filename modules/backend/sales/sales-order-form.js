// ============================================================
// sales-order-form.js — Create/Edit Sales Order (หน้า form แยก)
// list อยู่ที่ sales-orders.html / sales-orders.js
// optional: ออก Invoice พร้อมบันทึก SO ในขั้นตอนเดียว
// ============================================================

var allCustomers = [];
var allWarehouses = [];
var allProducts = [];
var allSOs = [];
var allInvoices = [];
var editingSO = null;

function fmtMoney(n) { return "฿" + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function getQueryId() {
  var params = new URLSearchParams(window.location.search);
  var id = params.get("id");
  return id ? Number(id) : null;
}

// ============ SO/Invoice Number ============
function generateSONumber(year) {
  var y = Number(year) || new Date().getFullYear();
  var prefix = "SO-" + y + "-";
  var maxNum = 0;
  allSOs.forEach(function (so) {
    if (so.so_number && so.so_number.indexOf(prefix) === 0) {
      var n = parseInt(so.so_number.slice(prefix.length), 10);
      if (n > maxNum) maxNum = n;
    }
  });
  return prefix + String(maxNum + 1).padStart(3, "0");
}

function generateInvoiceNumber(year) {
  var y = Number(year) || new Date().getFullYear();
  var prefix = "INV-" + y + "-";
  var maxNum = 0;
  allInvoices.forEach(function (inv) {
    if (inv.invoice_number && inv.invoice_number.indexOf(prefix) === 0) {
      var n = parseInt(inv.invoice_number.slice(prefix.length), 10);
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

function refreshSONumberFromDate() {
  if (document.getElementById("editId").value) return;
  document.getElementById("inputSONumber").value = generateSONumber(getYearFromDateInput());
  document.getElementById("inputInvoiceNumber").value = generateInvoiceNumber(getYearFromDateInput());
}

// ============ Dropdowns ============
function buildProductOptions(selectedId) {
  return '<option value="">— เลือกสินค้า —</option>' + allProducts.map(function (p) {
    var sel = selectedId && Number(selectedId) === p.id ? ' selected' : '';
    return '<option value="' + p.id + '" data-price="' + (p.price || 0) + '"' + sel + '>' + p.name + '</option>';
  }).join("");
}

function populateCustomerDropdown(selectedId) {
  var sel = document.getElementById("inputCustomer");
  var html = '<option value="">— เลือกลูกค้า —</option>';
  allCustomers.forEach(function (c) {
    if (c.status === "inactive") return;
    html += '<option value="' + c.id + '">' + c.name + '</option>';
  });
  sel.innerHTML = html;
  if (selectedId) sel.value = String(selectedId);
}

function populateWarehouseDropdown(selectedId) {
  var sel = document.getElementById("inputWarehouse");
  var html = '<option value="">— เลือกคลัง —</option>';
  allWarehouses.forEach(function (w) { html += '<option value="' + w.id + '">' + w.name + '</option>'; });
  sel.innerHTML = html;
  if (selectedId) sel.value = String(selectedId);
}

// ============ Line Items ============
function addSOItemRow(data) {
  var tbody = document.getElementById("soItemsBody");
  var tr = document.createElement("tr");
  var d = data || {};
  tr.innerHTML =
    '<td><select class="form-select so-product" onchange="onSOProductChange(this)">' + buildProductOptions(d.product_id) + '</select></td>' +
    '<td><input type="number" class="form-input so-qty" value="' + (d.qty || "") + '" min="0" step="any" oninput="recalcTotals()" style="text-align:right;" /></td>' +
    '<td><input type="number" class="form-input so-price" value="' + (d.price || "") + '" min="0" step="0.01" oninput="recalcTotals()" style="text-align:right;" /></td>' +
    '<td style="text-align:right;color:#10b981;font-weight:700;" class="so-subtotal">฿0.00</td>' +
    '<td><button class="btn-icon-sm btn-danger" type="button" onclick="removeSOItemRow(this)" style="width:24px;height:24px;"><i data-lucide="x" style="width:12px;height:12px;"></i></button></td>';
  tbody.appendChild(tr);
  lucide.createIcons();
  recalcTotals();
}

function removeSOItemRow(btn) {
  btn.closest("tr").remove();
  recalcTotals();
}

function onSOProductChange(select) {
  var opt = select.options[select.selectedIndex];
  var price = opt ? Number(opt.getAttribute("data-price")) || 0 : 0;
  var tr = select.closest("tr");
  var priceInput = tr.querySelector(".so-price");
  if (price && !priceInput.value) priceInput.value = price;
  recalcTotals();
}

function recalcTotals() {
  var subtotal = 0;
  document.querySelectorAll("#soItemsBody tr").forEach(function (tr) {
    var qty = parseFloat(tr.querySelector(".so-qty").value) || 0;
    var price = parseFloat(tr.querySelector(".so-price").value) || 0;
    var sub = qty * price;
    tr.querySelector(".so-subtotal").textContent = fmtMoney(sub);
    subtotal += sub;
  });
  var taxPercent = parseFloat(document.getElementById("inputTaxPercent").value) || 0;
  var discount = parseFloat(document.getElementById("inputDiscount").value) || 0;
  var taxBase = Math.max(0, subtotal - discount);
  var taxAmount = taxBase * (taxPercent / 100);
  document.getElementById("sumSubtotal").textContent = fmtMoney(subtotal);
  document.getElementById("sumTaxAmount").textContent = fmtMoney(taxAmount);
  document.getElementById("sumTotal").textContent = fmtMoney(taxBase + taxAmount);
}

// ============ Billing toggle ============
function toggleBillingFields() {
  var checked = document.getElementById("inputCreateInvoice").checked;
  var fields = document.getElementById("billingFields");
  fields.classList.toggle("show", checked);

  if (checked) {
    // ตั้ง default due date = +30 วันจากวันที่ SO (ถ้ายังว่าง)
    var dueEl = document.getElementById("inputDueDate");
    if (!dueEl.value) {
      var soDate = document.getElementById("inputDate").value;
      if (soDate) {
        var d = new Date(soDate);
        d.setDate(d.getDate() + 30);
        dueEl.value = d.toISOString().slice(0, 10);
      }
    }
    // refresh invoice number ให้สดเสมอ (เผื่อมีคนเปิด tab อื่นออก invoice ระหว่างนั้น)
    if (!document.getElementById("editId").value) {
      document.getElementById("inputInvoiceNumber").value = generateInvoiceNumber(getYearFromDateInput());
    }
  }
}

// ============ Fill form ============
function fillForm(so) {
  document.getElementById("editId").value = so ? so.id : "";
  var dateVal = so ? so.date : new Date().toISOString().slice(0, 10);
  document.getElementById("inputDate").value = dateVal;
  var yr = dateVal && dateVal.length >= 4 ? Number(dateVal.slice(0, 4)) : new Date().getFullYear();
  document.getElementById("inputSONumber").value = so ? so.so_number : generateSONumber(yr);
  document.getElementById("inputInvoiceNumber").value = generateInvoiceNumber(yr);
  document.getElementById("inputStatus").value = so ? so.status : "processing";
  document.getElementById("inputDiscount").value = so ? (so.discount || 0) : 0;

  // คำนวณ tax_percent ย้อนหลังจาก tax amount (เก็บใน DB เป็น amount)
  var taxPercent = 7;
  if (so) {
    var taxBase = Math.max(0, Number(so.subtotal || 0) - Number(so.discount || 0));
    if (taxBase > 0 && so.tax) {
      taxPercent = Math.round((Number(so.tax) / taxBase) * 10000) / 100;
    } else {
      taxPercent = 0;
    }
  }
  document.getElementById("inputTaxPercent").value = taxPercent;
  document.getElementById("inputNote").value = so ? (so.note || "") : "";
  populateCustomerDropdown(so ? so.customer_id : null);
  populateWarehouseDropdown(so ? so.warehouse_id : null);

  var tbody = document.getElementById("soItemsBody");
  tbody.innerHTML = "";
  var items = so && so.sales_order_items ? so.sales_order_items : [];
  if (items.length) {
    items.forEach(function (it) { addSOItemRow({ product_id: it.product_id, qty: it.qty, price: it.price }); });
  } else {
    addSOItemRow();
  }

  // ตรวจ Invoice ที่ผูกกับ SO นี้แล้ว → ซ่อน toggle ให้ไม่ทำซ้ำ
  if (so) {
    var existingInv = allInvoices.find(function (inv) { return Number(inv.so_id) === Number(so.id); });
    if (existingInv) {
      var toggleWrap = document.querySelector(".billing-toggle");
      if (toggleWrap) {
        toggleWrap.innerHTML =
          '<i data-lucide="check-circle" style="width:18px;height:18px;color:#10b981;"></i>' +
          '<div style="display:flex;flex-direction:column;gap:2px;">' +
            '<span class="billing-toggle-text">มี Invoice ผูกกับ SO นี้แล้ว: <strong>' + (existingInv.invoice_number || "") + '</strong></span>' +
            '<span class="billing-toggle-hint">หากต้องการแก้ไข ให้ไปที่หน้า Invoices</span>' +
          '</div>';
        toggleWrap.style.cursor = "default";
        toggleWrap.style.background = "#ecfdf5";
        toggleWrap.style.borderColor = "#a7f3d0";
        if (typeof lucide !== "undefined") lucide.createIcons();
      }
    }
  }

  recalcTotals();
}

// ============ Save ============
function collectItems() {
  var items = [];
  document.querySelectorAll("#soItemsBody tr").forEach(function (tr) {
    var pid = Number(tr.querySelector(".so-product").value);
    var qty = parseFloat(tr.querySelector(".so-qty").value);
    var price = parseFloat(tr.querySelector(".so-price").value);
    if (pid && qty > 0 && price >= 0) {
      items.push({ product_id: pid, qty: qty, price: price });
    }
  });
  return items;
}

function saveSO() {
  var id = document.getElementById("editId").value;
  var soNumber = document.getElementById("inputSONumber").value.trim();
  var customerId = Number(document.getElementById("inputCustomer").value) || null;
  var warehouseId = Number(document.getElementById("inputWarehouse").value) || null;
  var date = document.getElementById("inputDate").value;
  var status = document.getElementById("inputStatus").value;
  var taxPercent = parseFloat(document.getElementById("inputTaxPercent").value) || 0;
  var discount = parseFloat(document.getElementById("inputDiscount").value) || 0;
  var note = document.getElementById("inputNote").value.trim();
  var items = collectItems();

  if (!date) { document.getElementById("inputDate").focus(); return; }
  if (!customerId) { showToast("กรุณาเลือกลูกค้า", "warning"); document.getElementById("inputCustomer").focus(); return; }
  if (!warehouseId) { showToast("กรุณาเลือกคลังจ่ายออก", "warning"); document.getElementById("inputWarehouse").focus(); return; }
  if (!items.length) { showToast("กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ", "warning"); return; }

  var subtotal = items.reduce(function (s, it) { return s + it.qty * it.price; }, 0);
  var taxBase = Math.max(0, subtotal - discount);
  var taxAmount = taxBase * (taxPercent / 100);
  var total = taxBase + taxAmount;

  var header = {
    so_number: soNumber,
    customer_id: customerId,
    warehouse_id: warehouseId,
    date: date,
    subtotal: subtotal,
    tax: taxAmount,
    discount: discount,
    total: total,
    status: status,
    note: note || null,
  };

  // Invoice options (ถ้าเลือกออก)
  var createInvoice = !!document.getElementById("inputCreateInvoice").checked;
  var hasExistingInvoice = id && allInvoices.some(function (inv) { return Number(inv.so_id) === Number(id); });
  var invoicePayload = null;
  if (createInvoice && !hasExistingInvoice) {
    var invNumber = document.getElementById("inputInvoiceNumber").value.trim();
    var dueDate = document.getElementById("inputDueDate").value || null;
    var invStatus = document.getElementById("inputInvoiceStatus").value || "unpaid";
    invoicePayload = {
      invoice_number: invNumber,
      customer_id: customerId,
      date: date,
      due_date: dueDate,
      amount: total,
      status: invStatus,
      note: note || null,
    };
  }

  var saveBtn = document.getElementById("saveSOBtn");
  saveBtn.disabled = true;

  var op = id
    ? updateSalesOrderDB(Number(id), header, items).then(function () { return { id: Number(id) }; })
    : createSalesOrderDB(header, items);

  op.then(function (so) {
    if (!invoicePayload) return so;
    invoicePayload.so_id = so && so.id ? so.id : null;
    return createInvoiceDB(invoicePayload).then(function () { return so; });
  }).then(function () {
    var msg = id
      ? "บันทึกการแก้ไขสำเร็จ"
      : (invoicePayload ? "สร้าง SO + Invoice สำเร็จ" : "สร้าง SO สำเร็จ");
    showToast(msg, "success");
    setTimeout(function () { window.location.href = "sales-orders.html"; }, 600);
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
      if (!allCustomers.length) missing.push("ลูกค้า");
      if (!allWarehouses.length) missing.push("คลัง");
      if (!allProducts.length) missing.push("สินค้า");
      if (missing.length) {
        if (typeof showToast === "function") showToast("ยังไม่มีข้อมูล " + missing.join(" / ") + " — กรุณาเพิ่มก่อน", "warning");
        return;
      }
      setFieldValue("inputDate", randomPastDate(60));
      refreshSONumberFromDate();
      pickRandomSelectOption("inputCustomer");
      pickRandomSelectOption("inputWarehouse");
      pickRandomSelectOption("inputStatus");
      setFieldValue("inputNote", randomNote());
      setFieldValue("inputDiscount", rdBool(0.3) ? randomMoney(10, 200) : 0);
      setFieldValue("inputTaxPercent", rdPick([0, 7, 10]));
      document.getElementById("soItemsBody").innerHTML = "";
      var n = rdInt(1, 3);
      for (var i = 0; i < n; i++) {
        var p = rdPick(allProducts);
        addSOItemRow({ product_id: p.id, qty: rdInt(1, 8), price: p.price || rdFloat(50, 2000, 2) });
      }
      recalcTotals();
    },
  });
}

// ============ Init ============
document.addEventListener("DOMContentLoaded", function () {
  var editId = getQueryId();

  document.getElementById("inputDate").addEventListener("change", refreshSONumberFromDate);

  Promise.all([
    typeof fetchCustomersDB === "function" ? fetchCustomersDB() : Promise.resolve([]),
    typeof fetchProducts === "function" ? fetchProducts() : Promise.resolve([]),
    typeof fetchWarehousesDB === "function" ? fetchWarehousesDB() : Promise.resolve([]),
    typeof fetchSalesOrdersDB === "function" ? fetchSalesOrdersDB() : Promise.resolve([]),
    typeof fetchInvoicesDB === "function" ? fetchInvoicesDB() : Promise.resolve([]),
  ]).then(function (res) {
    allCustomers = (res[0] || []).map(function (c) {
      return { id: c.id, name: c.name || "", status: c.status || "active" };
    });
    allProducts = (res[1] || []).map(function (p) {
      return { id: p.id, name: p.name || "", sku: p.sku || "", price: Number(p.price) || 0 };
    });
    allWarehouses = (res[2] || []).map(function (w) {
      return { id: w.id, name: w.name || "" };
    });
    allSOs = res[3] || [];
    allInvoices = res[4] || [];

    if (!allProducts.length) showToast("ยังไม่มีสินค้า — กรุณาเพิ่มสินค้าก่อน", "warning", 4000);
    if (!allCustomers.length) showToast("ยังไม่มีลูกค้า — กรุณาเพิ่มลูกค้าก่อน", "warning", 4000);
    if (!allWarehouses.length) showToast("ยังไม่มีคลัง — กรุณาเพิ่มคลังก่อน", "warning", 4000);

    if (editId) {
      editingSO = allSOs.find(function (x) { return x.id === editId; });
      if (editingSO) {
        document.getElementById("pageTitle").textContent = "Edit Sales Order";
        document.getElementById("pageSubtitle").textContent = "แก้ไขคำสั่งขาย " + (editingSO.so_number || "");
        fillForm(editingSO);
      } else {
        showToast("ไม่พบคำสั่งขายที่ต้องการแก้ไข", "error");
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
