// ============================================================
// sales-returns.js — Sales Returns (Supabase, line items + SO ref)
// auto stock_movements type=in via DB trigger when approved
// ============================================================

var returns = [];
var allSOs = [];
var allCustomers = [];
var allWarehouses = [];
var allProducts = [];

function fmtMoney(n) { return "฿" + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function getStatusBadge(status) {
  switch (status) {
    case "approved":  return '<span class="badge badge-active">Approved</span>';
    case "pending":   return '<span class="badge" style="background-color:#fef3c7;color:#f59e0b;">Pending</span>';
    case "cancelled": return '<span class="badge badge-inactive">Cancelled</span>';
    default: return '<span class="badge">' + status + '</span>';
  }
}

function updateStats() {
  document.getElementById("statAll").textContent = returns.length;
  document.getElementById("statApproved").textContent = returns.filter(function (r) { return r.status === "approved"; }).length;
  document.getElementById("statPending").textContent = returns.filter(function (r) { return r.status === "pending"; }).length;
}

function renderTable(data) {
  updateStats();
  var tbody = document.getElementById("returnTableBody");
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:30px;color:#94a3b8;font-size:11px;">ยังไม่มีรายการรับคืน</td></tr>';
    lucide.createIcons();
    return;
  }
  tbody.innerHTML = data.map(function (r, i) {
    var soRef = r.sales_orders ? r.sales_orders.so_number : "—";
    var customer = r.customers ? r.customers.name : "—";
    var refund = (r.sales_return_items || []).reduce(function (s, it) { return s + Number(it.subtotal || 0); }, 0);
    return '<tr>' +
      '<td>' + (i + 1) + '</td>' +
      '<td><strong>' + r.return_number + '</strong></td>' +
      '<td>' + soRef + '</td>' +
      '<td>' + customer + '</td>' +
      '<td>' + (r.date || "—") + '</td>' +
      '<td style="color:#64748b;font-size:10px;">' + (r.reason || "—") + '</td>' +
      '<td>' + fmtMoney(refund) + '</td>' +
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

function generateReturnNumber() {
  var year = new Date().getFullYear();
  var prefix = "SR-" + year + "-";
  var maxNum = 0;
  returns.forEach(function (r) {
    if (r.return_number && r.return_number.indexOf(prefix) === 0) {
      var n = parseInt(r.return_number.slice(prefix.length), 10);
      if (n > maxNum) maxNum = n;
    }
  });
  return prefix + String(maxNum + 1).padStart(3, "0");
}

function buildProductOptions(selectedId) {
  return '<option value="">— เลือกสินค้า —</option>' + allProducts.map(function (p) {
    var sel = selectedId && Number(selectedId) === p.id ? ' selected' : '';
    return '<option value="' + p.id + '"' + sel + '>' + p.name + '</option>';
  }).join("");
}

function populateSODropdown(selectedId) {
  var sel = document.getElementById("inputSO");
  var html = '<option value="">— ไม่อิง SO —</option>';
  allSOs.forEach(function (so) {
    if (so.status !== "completed") return;
    html += '<option value="' + so.id + '">' + so.so_number + (so.customers ? ' — ' + so.customers.name : '') + '</option>';
  });
  sel.innerHTML = html;
  if (selectedId) sel.value = String(selectedId);
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

function onSOChange() {
  var soId = Number(document.getElementById("inputSO").value);
  if (!soId) return;
  var so = allSOs.find(function (s) { return s.id === soId; });
  if (!so) return;
  if (so.customer_id) document.getElementById("inputCustomer").value = String(so.customer_id);
  if (so.warehouse_id) document.getElementById("inputWarehouse").value = String(so.warehouse_id);
  var tbody = document.getElementById("srItemsBody");
  tbody.innerHTML = "";
  (so.sales_order_items || []).forEach(function (it) {
    addSRItemRow({ product_id: it.product_id, qty: it.qty, price: it.price });
  });
  if (!tbody.children.length) addSRItemRow();
  recalcTotals();
}

function addSRItemRow(data) {
  var tbody = document.getElementById("srItemsBody");
  var tr = document.createElement("tr");
  var d = data || {};
  tr.innerHTML =
    '<td style="padding:4px;"><select class="form-select sr-product" style="padding:6px 8px;font-size:10px;">' + buildProductOptions(d.product_id) + '</select></td>' +
    '<td style="padding:4px;"><input type="number" class="form-input sr-qty" value="' + (d.qty || "") + '" min="0" step="any" oninput="recalcTotals()" style="padding:6px 8px;font-size:10px;text-align:right;" /></td>' +
    '<td style="padding:4px;"><input type="number" class="form-input sr-price" value="' + (d.price || "") + '" min="0" step="0.01" oninput="recalcTotals()" style="padding:6px 8px;font-size:10px;text-align:right;" /></td>' +
    '<td style="padding:4px;text-align:right;color:#3b82f6;font-weight:700;" class="sr-subtotal">฿0.00</td>' +
    '<td style="padding:4px;"><button class="btn-icon-sm btn-danger" type="button" onclick="removeSRItemRow(this)" style="width:22px;height:22px;"><i data-lucide="x" style="width:10px;height:10px;"></i></button></td>';
  tbody.appendChild(tr);
  lucide.createIcons();
  recalcTotals();
}

function removeSRItemRow(btn) {
  btn.closest("tr").remove();
  recalcTotals();
}

function recalcTotals() {
  var total = 0;
  document.querySelectorAll("#srItemsBody tr").forEach(function (tr) {
    var qty = parseFloat(tr.querySelector(".sr-qty").value) || 0;
    var price = parseFloat(tr.querySelector(".sr-price").value) || 0;
    var sub = qty * price;
    tr.querySelector(".sr-subtotal").textContent = fmtMoney(sub);
    total += sub;
  });
  document.getElementById("sumTotal").textContent = fmtMoney(total);
}

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
  populateSODropdown(r ? r.so_id : null);
  populateCustomerDropdown(r ? r.customer_id : null);
  populateWarehouseDropdown(r ? r.warehouse_id : null);

  var tbody = document.getElementById("srItemsBody");
  tbody.innerHTML = "";
  var items = r && r.sales_return_items ? r.sales_return_items : [];
  if (items.length) items.forEach(function (it) { addSRItemRow({ product_id: it.product_id, qty: it.qty, price: it.price }); });
  else addSRItemRow();
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
  document.querySelectorAll("#srItemsBody tr").forEach(function (tr) {
    var pid = Number(tr.querySelector(".sr-product").value);
    var qty = parseFloat(tr.querySelector(".sr-qty").value);
    var price = parseFloat(tr.querySelector(".sr-price").value);
    if (pid && qty > 0) items.push({ product_id: pid, qty: qty, price: price || 0 });
  });
  return items;
}

function saveReturn() {
  var id = document.getElementById("editId").value;
  var returnNumber = document.getElementById("inputReturnNumber").value.trim();
  var soId = Number(document.getElementById("inputSO").value) || null;
  var customerId = Number(document.getElementById("inputCustomer").value) || null;
  var warehouseId = Number(document.getElementById("inputWarehouse").value) || null;
  var date = document.getElementById("inputDate").value;
  var status = document.getElementById("inputStatus").value;
  var reason = document.getElementById("inputReason").value.trim();
  var note = document.getElementById("inputNote").value.trim();
  var items = collectItems();

  if (!warehouseId) { alertMsg("ไม่ครบถ้วน", "กรุณาเลือกคลังที่รับของคืน"); return; }
  if (!date) return document.getElementById("inputDate").focus();
  if (!items.length) { alertMsg("ไม่ถูกต้อง", "กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ"); return; }

  var header = {
    return_number: returnNumber,
    so_id: soId,
    customer_id: customerId,
    warehouse_id: warehouseId,
    date: date,
    status: status,
    reason: reason || null,
    note: note || null,
  };

  var op = id
    ? updateSalesReturnDB(Number(id), header, items)
    : createSalesReturnDB(header, items);

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
  var msg = "ต้องการลบการรับคืน <strong>" + r.return_number + "</strong> ใช่ไหม?";
  if (r.status === "approved") msg += "<br><br><span style='color:#ef4444;font-size:10px;'>⚠️ Return นี้เคยเพิ่ม stock แล้ว — ระบบจะสร้าง movement reverse อัตโนมัติ</span>";
  showConfirm({
    title: "Confirm Delete",
    message: msg,
    okText: "Delete",
    okColor: "#ef4444",
    onConfirm: function () {
      deleteSalesReturnDB(id)
        .then(function () { return reloadReturns(); })
        .then(function () { applyFilters(); })
        .catch(function (err) { console.error(err); });
    },
  });
}

var currentFilter = "all";
var currentSort = "default";

function getFilteredData() {
  var keyword = document.querySelector(".filter-search-input").value.toLowerCase();
  var data = returns.slice();
  if (currentFilter !== "all") data = data.filter(function (r) { return r.status === currentFilter; });
  if (keyword) {
    data = data.filter(function (r) {
      var soRef = r.sales_orders ? r.sales_orders.so_number.toLowerCase() : "";
      var cName = r.customers ? r.customers.name.toLowerCase() : "";
      return (r.return_number || "").toLowerCase().includes(keyword) || soRef.includes(keyword) || cName.includes(keyword) || (r.reason || "").toLowerCase().includes(keyword);
    });
  }
  switch (currentSort) {
    case "date-desc": data = data.slice().sort(function (a, b) { return (b.date || "").localeCompare(a.date || ""); }); break;
    case "date-asc":  data = data.slice().sort(function (a, b) { return (a.date || "").localeCompare(b.date || ""); }); break;
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
    typeof fetchSalesReturnsDB === "function" ? fetchSalesReturnsDB() : Promise.resolve([]),
  ]).then(function (res) {
    allCustomers = (res[0] || []).map(function (c) { return { id: c.id, name: c.name || "", status: c.status || "active" }; });
    allProducts = (res[1] || []).map(function (p) { return { id: p.id, name: p.name || "", sku: p.sku || "" }; });
    allWarehouses = (res[2] || []).map(function (w) { return { id: w.id, name: w.name || "" }; });
    allSOs = (res[3] || []).map(function (so) {
      return {
        id: so.id, so_number: so.so_number, customer_id: so.customer_id, warehouse_id: so.warehouse_id, status: so.status,
        customers: so.customers || null,
        sales_order_items: so.sales_order_items || [],
      };
    });
    returns = (res[4] || []).map(normalizeReturn);
  });
}

function reloadReturns() {
  return (typeof fetchSalesReturnsDB === "function" ? fetchSalesReturnsDB() : Promise.resolve([]))
    .then(function (rows) { returns = (rows || []).map(normalizeReturn); });
}

function normalizeReturn(r) {
  return {
    id: r.id,
    return_number: r.return_number || "",
    so_id: r.so_id,
    customer_id: r.customer_id,
    warehouse_id: r.warehouse_id,
    date: r.date || "",
    reason: r.reason || "",
    status: r.status || "pending",
    note: r.note || "",
    sales_orders: r.sales_orders || null,
    customers: r.customers || null,
    warehouses: r.warehouses || null,
    sales_return_items: r.sales_return_items || [],
  };
}

if (typeof registerRandomFill === "function") {
  registerRandomFill({
    target: "#returnModal",
    fill: function () {
      // return_number readonly — skip
      setFieldValue("inputDate", randomPastDate(30));
      pickRandomSelectOption("inputSO", { includeEmpty: true });
      if (typeof onSOChange === "function") { try { onSOChange(); } catch (e) {} }
      var custSel = document.getElementById("inputCustomer");
      if (custSel && !custSel.value) pickRandomSelectOption("inputCustomer");
      var whSel = document.getElementById("inputWarehouse");
      if (whSel && !whSel.value) pickRandomSelectOption("inputWarehouse");
      pickRandomSelectOption("inputStatus");
      setFieldValue("inputReason", rdPick(["สินค้าชำรุด", "ลูกค้าเปลี่ยนใจ", "สินค้าไม่ตรงตามสั่ง", "หมดอายุ", "ส่งผิดรุ่น"]));
      setFieldValue("inputNote", randomNote());
      // populate 1-2 items if SO didn't auto-populate
      var itemsBody = document.getElementById("srItemsBody");
      if (itemsBody && !itemsBody.children.length && typeof addSRItemRow === "function" && typeof allProducts !== "undefined" && allProducts.length) {
        var count = rdInt(1, 2);
        for (var i = 0; i < count; i++) {
          var p = rdPick(allProducts);
          addSRItemRow({ product_id: p.id, qty: randomQty(1, 3), price: randomMoney(50, 2000) });
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

  document.getElementById("addReturnBtn").addEventListener("click", function () {
    openReturnModal("Create Return", null);
  });

  reloadAll()
    .then(function () { applyFilters(); })
    .catch(function (err) { console.error(err); applyFilters(); });
});
