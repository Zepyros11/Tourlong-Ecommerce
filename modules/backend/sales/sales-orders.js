// ============================================================
// sales-orders.js — Sales Orders (Supabase, line items)
// auto stock_movements type=out via DB trigger when completed
// ============================================================

var salesOrders = [];
var allCustomers = [];
var allWarehouses = [];
var allProducts = [];

function fmtMoney(n) { return "฿" + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function getStatusBadge(status) {
  switch (status) {
    case "completed":  return '<span class="badge badge-active">Completed</span>';
    case "processing": return '<span class="badge" style="background-color:#fef3c7;color:#f59e0b;">Processing</span>';
    case "cancelled":  return '<span class="badge badge-inactive">Cancelled</span>';
    default: return '<span class="badge">' + status + '</span>';
  }
}

function updateStats() {
  document.getElementById("statAll").textContent = salesOrders.length;
  document.getElementById("statCompleted").textContent = salesOrders.filter(function (so) { return so.status === "completed"; }).length;
  document.getElementById("statProcessing").textContent = salesOrders.filter(function (so) { return so.status === "processing"; }).length;
  document.getElementById("statCancelled").textContent = salesOrders.filter(function (so) { return so.status === "cancelled"; }).length;
}

function renderTable(data) {
  updateStats();
  var tbody = document.getElementById("soTableBody");
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:30px;color:#94a3b8;font-size:11px;">ยังไม่มีคำสั่งขาย</td></tr>';
    lucide.createIcons();
    return;
  }
  tbody.innerHTML = data.map(function (so, i) {
    var customer = so.customers ? so.customers.name : "—";
    var itemCount = so.sales_order_items ? so.sales_order_items.length : 0;
    return '<tr>' +
      '<td>' + (i + 1) + '</td>' +
      '<td><strong>' + so.so_number + '</strong></td>' +
      '<td>' + customer + '</td>' +
      '<td>' + (so.date || "—") + '</td>' +
      '<td>' + itemCount + '</td>' +
      '<td>' + fmtMoney(so.total) + '</td>' +
      '<td>' + getStatusBadge(so.status) + '</td>' +
      '<td><div class="table-actions">' +
        '<button class="btn-icon-sm" onclick="editSO(' + so.id + ')"><i data-lucide="pencil"></i></button>' +
        '<button class="btn-icon-sm btn-danger" onclick="deleteSO(' + so.id + ')"><i data-lucide="trash-2"></i></button>' +
      '</div></td>' +
    '</tr>';
  }).join("");
  lucide.createIcons();
  if (typeof refreshSortableHeaders === "function") refreshSortableHeaders();
}

function generateSONumber() {
  var year = new Date().getFullYear();
  var prefix = "SO-" + year + "-";
  var maxNum = 0;
  salesOrders.forEach(function (so) {
    if (so.so_number && so.so_number.indexOf(prefix) === 0) {
      var n = parseInt(so.so_number.slice(prefix.length), 10);
      if (n > maxNum) maxNum = n;
    }
  });
  return prefix + String(maxNum + 1).padStart(3, "0");
}

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
    '<td style="padding:4px;"><select class="form-select so-product" onchange="onSOProductChange(this)" style="padding:6px 8px;font-size:10px;">' + buildProductOptions(d.product_id) + '</select></td>' +
    '<td style="padding:4px;"><input type="number" class="form-input so-qty" value="' + (d.qty || "") + '" min="0" step="any" oninput="recalcTotals()" style="padding:6px 8px;font-size:10px;text-align:right;" /></td>' +
    '<td style="padding:4px;"><input type="number" class="form-input so-price" value="' + (d.price || "") + '" min="0" step="0.01" oninput="recalcTotals()" style="padding:6px 8px;font-size:10px;text-align:right;" /></td>' +
    '<td style="padding:4px;text-align:right;color:#10b981;font-weight:700;" class="so-subtotal">฿0.00</td>' +
    '<td style="padding:4px;"><button class="btn-icon-sm btn-danger" type="button" onclick="removeSOItemRow(this)" style="width:22px;height:22px;"><i data-lucide="x" style="width:10px;height:10px;"></i></button></td>';
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
  var tax = parseFloat(document.getElementById("inputTax").value) || 0;
  var discount = parseFloat(document.getElementById("inputDiscount").value) || 0;
  document.getElementById("sumSubtotal").textContent = fmtMoney(subtotal);
  document.getElementById("sumTotal").textContent = fmtMoney(subtotal + tax - discount);
}

// ============ Modal ============
function openSOModal(title, so) {
  if (!allProducts.length) { alertMsg("ยังไม่มีสินค้า", "กรุณาเพิ่มสินค้าก่อน"); return; }
  if (!allWarehouses.length) { alertMsg("ยังไม่มีคลัง", "กรุณาเพิ่มคลังก่อน"); return; }
  document.getElementById("modalTitle").textContent = title;
  document.getElementById("editId").value = so ? so.id : "";
  document.getElementById("inputSONumber").value = so ? so.so_number : generateSONumber();
  document.getElementById("inputDate").value = so ? so.date : new Date().toISOString().slice(0, 10);
  document.getElementById("inputStatus").value = so ? so.status : "processing";
  document.getElementById("inputTax").value = so ? so.tax : 0;
  document.getElementById("inputDiscount").value = so ? so.discount : 0;
  document.getElementById("inputNote").value = so ? (so.note || "") : "";
  populateCustomerDropdown(so ? so.customer_id : null);
  populateWarehouseDropdown(so ? so.warehouse_id : null);

  var tbody = document.getElementById("soItemsBody");
  tbody.innerHTML = "";
  var items = so && so.sales_order_items ? so.sales_order_items : [];
  if (items.length) items.forEach(function (it) { addSOItemRow({ product_id: it.product_id, qty: it.qty, price: it.price }); });
  else addSOItemRow();
  recalcTotals();
  openModalById("soModal");
}

function alertMsg(title, message) {
  if (typeof showConfirm === "function") {
    showConfirm({ title: title, message: message, okText: "OK", okColor: "#47b8b4", onConfirm: function () {} });
  }
}

function collectItems() {
  var items = [];
  document.querySelectorAll("#soItemsBody tr").forEach(function (tr) {
    var pid = Number(tr.querySelector(".so-product").value);
    var qty = parseFloat(tr.querySelector(".so-qty").value);
    var price = parseFloat(tr.querySelector(".so-price").value);
    if (pid && qty > 0 && price >= 0) items.push({ product_id: pid, qty: qty, price: price });
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
  var tax = parseFloat(document.getElementById("inputTax").value) || 0;
  var discount = parseFloat(document.getElementById("inputDiscount").value) || 0;
  var note = document.getElementById("inputNote").value.trim();
  var items = collectItems();

  if (!warehouseId) { alertMsg("ไม่ครบถ้วน", "กรุณาเลือกคลังที่จ่ายออก"); return; }
  if (!date) return document.getElementById("inputDate").focus();
  if (!items.length) { alertMsg("ไม่ถูกต้อง", "กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ"); return; }

  var subtotal = items.reduce(function (s, it) { return s + it.qty * it.price; }, 0);
  var total = subtotal + tax - discount;

  var header = {
    so_number: soNumber,
    customer_id: customerId,
    warehouse_id: warehouseId,
    date: date,
    subtotal: subtotal,
    tax: tax,
    discount: discount,
    total: total,
    status: status,
    note: note || null,
  };

  var op = id
    ? updateSalesOrderDB(Number(id), header, items)
    : createSalesOrderDB(header, items);

  op.then(function () { return reloadSOs(); })
    .then(function () {
      closeModalById("soModal");
      applyFilters();
    })
    .catch(function (err) { console.error(err); alertMsg("เกิดข้อผิดพลาด", err.message || "บันทึกไม่สำเร็จ"); });
}

function editSO(id) {
  var so = salesOrders.find(function (x) { return x.id === id; });
  if (so) openSOModal("Edit Order", so);
}

function deleteSO(id) {
  var so = salesOrders.find(function (x) { return x.id === id; });
  if (!so) return;
  var msg = "ต้องการลบคำสั่งขาย <strong>" + so.so_number + "</strong> ใช่ไหม?";
  if (so.status === "completed") msg += "<br><br><span style='color:#ef4444;font-size:10px;'>⚠️ SO นี้เคยตัด stock แล้ว — ระบบจะสร้าง movement reverse อัตโนมัติ</span>";
  showConfirm({
    title: "Confirm Delete",
    message: msg,
    okText: "Delete",
    okColor: "#ef4444",
    onConfirm: function () {
      deleteSalesOrderDB(id)
        .then(function () { return reloadSOs(); })
        .then(function () { applyFilters(); })
        .catch(function (err) { console.error(err); });
    },
  });
}

var currentFilter = "all";
var currentSort = "default";

function getFilteredData() {
  var keyword = document.querySelector(".filter-search-input").value.toLowerCase();
  var data = salesOrders.slice();
  if (currentFilter !== "all") data = data.filter(function (so) { return so.status === currentFilter; });
  if (keyword) {
    data = data.filter(function (so) {
      var cName = so.customers ? so.customers.name.toLowerCase() : "";
      return (so.so_number || "").toLowerCase().includes(keyword) || cName.includes(keyword);
    });
  }
  switch (currentSort) {
    case "date-desc":   data = data.slice().sort(function (a, b) { return (b.date || "").localeCompare(a.date || ""); }); break;
    case "date-asc":    data = data.slice().sort(function (a, b) { return (a.date || "").localeCompare(b.date || ""); }); break;
    case "amount-desc": data = data.slice().sort(function (a, b) { return Number(b.total) - Number(a.total); }); break;
    case "amount-asc":  data = data.slice().sort(function (a, b) { return Number(a.total) - Number(b.total); }); break;
  }
  return data;
}

function applyFilters() { renderTable(getFilteredData()); }

function reloadAll() {
  return Promise.all([
    typeof fetchCustomersDB === "function" ? fetchCustomersDB() : Promise.resolve([]),
    typeof fetchProducts === "function" ? fetchProducts() : Promise.resolve([]),
    typeof fetchWarehousesDB === "function" ? fetchWarehousesDB() : Promise.resolve([]),
    typeof fetchSalesOrdersDB === "function" ? fetchSalesOrdersDB() : Promise.resolve([]),
  ]).then(function (res) {
    allCustomers = (res[0] || []).map(function (c) { return { id: c.id, name: c.name || "", status: c.status || "active" }; });
    allProducts = (res[1] || []).map(function (p) { return { id: p.id, name: p.name || "", sku: p.sku || "", price: Number(p.price) || 0 }; });
    allWarehouses = (res[2] || []).map(function (w) { return { id: w.id, name: w.name || "" }; });
    salesOrders = (res[3] || []).map(normalizeSO);
  });
}

function reloadSOs() {
  return (typeof fetchSalesOrdersDB === "function" ? fetchSalesOrdersDB() : Promise.resolve([]))
    .then(function (rows) { salesOrders = (rows || []).map(normalizeSO); });
}

function normalizeSO(so) {
  return {
    id: so.id,
    so_number: so.so_number || "",
    customer_id: so.customer_id,
    warehouse_id: so.warehouse_id,
    date: so.date || "",
    subtotal: Number(so.subtotal) || 0,
    tax: Number(so.tax) || 0,
    discount: Number(so.discount) || 0,
    total: Number(so.total) || 0,
    status: so.status || "processing",
    note: so.note || "",
    customers: so.customers || null,
    warehouses: so.warehouses || null,
    sales_order_items: so.sales_order_items || [],
  };
}

if (typeof registerRandomFill === "function") {
  registerRandomFill({
    target: "#soModal",
    fill: function () {
      // so_number readonly — skip
      setFieldValue("inputDate", randomPastDate(30));
      pickRandomSelectOption("inputCustomer");
      pickRandomSelectOption("inputWarehouse");
      pickRandomSelectOption("inputStatus");
      setFieldValue("inputNote", randomNote());
      setFieldValue("inputDiscount", rdBool(0.3) ? randomMoney(10, 200) : 0);
      setFieldValue("inputTax", rdBool(0.5) ? randomMoney(10, 500) : 0);
      // populate 1-2 line items if products exist and tbody currently has a single empty row
      if (typeof addSOItemRow === "function" && typeof allProducts !== "undefined" && allProducts.length) {
        var tbody = document.getElementById("soItemsBody");
        if (tbody) tbody.innerHTML = "";
        var count = rdInt(1, 2);
        for (var i = 0; i < count; i++) {
          var p = rdPick(allProducts);
          addSOItemRow({ product_id: p.id, qty: randomQty(1, 8), price: p.price || randomMoney(50, 2000) });
        }
      }
      if (typeof recalcTotals === "function") { try { recalcTotals(); } catch (e) {} }
    },
  });
}

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

  document.getElementById("addSOBtn").addEventListener("click", function () {
    openSOModal("Create Order", null);
  });

  reloadAll()
    .then(function () { applyFilters(); })
    .catch(function (err) { console.error(err); applyFilters(); });
});
