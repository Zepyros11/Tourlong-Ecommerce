// ============================================================
// shipments.js — Shipments (Supabase, links SO/Customer/Rate)
// ============================================================

var shipments = [];
var allSOs = [];
var allCustomers = [];
var allRates = [];

function fmtMoney(n) { return "฿" + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function getStatusBadge(status) {
  switch (status) {
    case "delivered": return '<span class="badge badge-active">Delivered</span>';
    case "shipped":   return '<span class="badge" style="background-color:#fef3c7;color:#f59e0b;">Shipped</span>';
    case "pending":   return '<span class="badge" style="background-color:#eff6ff;color:#3b82f6;">Pending</span>';
    case "cancelled": return '<span class="badge badge-inactive">Cancelled</span>';
    default: return '<span class="badge">' + status + '</span>';
  }
}

function updateStats() {
  document.getElementById("statAll").textContent = shipments.length;
  document.getElementById("statDelivered").textContent = shipments.filter(function (s) { return s.status === "delivered"; }).length;
  document.getElementById("statTransit").textContent = shipments.filter(function (s) { return s.status === "shipped"; }).length;
  document.getElementById("statPending").textContent = shipments.filter(function (s) { return s.status === "pending"; }).length;
}

function renderTable(data) {
  updateStats();
  var tbody = document.getElementById("shipmentTableBody");
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:30px;color:#94a3b8;font-size:11px;">ยังไม่มีการจัดส่ง</td></tr>';
    lucide.createIcons();
    return;
  }
  tbody.innerHTML = data.map(function (s, i) {
    var soRef = s.sales_orders ? s.sales_orders.so_number : "—";
    var customer = s.customers ? s.customers.name : "—";
    return '<tr>' +
      '<td>' + (i + 1) + '</td>' +
      '<td><strong>' + s.shipment_number + '</strong></td>' +
      '<td>' + soRef + '</td>' +
      '<td>' + customer + '</td>' +
      '<td>' + (s.carrier || "—") + '</td>' +
      '<td>' + (s.tracking_number || "—") + '</td>' +
      '<td>' + (s.ship_date || "—") + '</td>' +
      '<td>' + getStatusBadge(s.status) + '</td>' +
      '<td><div class="table-actions">' +
        '<button class="btn-icon-sm" onclick="editShipment(' + s.id + ')"><i data-lucide="pencil"></i></button>' +
        '<button class="btn-icon-sm btn-danger" onclick="deleteShipment(' + s.id + ')"><i data-lucide="trash-2"></i></button>' +
      '</div></td>' +
    '</tr>';
  }).join("");
  lucide.createIcons();
  if (typeof refreshSortableHeaders === "function") refreshSortableHeaders();
}

function generateShipmentNumber() {
  var year = new Date().getFullYear();
  var prefix = "SHP-" + year + "-";
  var maxNum = 0;
  shipments.forEach(function (s) {
    if (s.shipment_number && s.shipment_number.indexOf(prefix) === 0) {
      var n = parseInt(s.shipment_number.slice(prefix.length), 10);
      if (n > maxNum) maxNum = n;
    }
  });
  return prefix + String(maxNum + 1).padStart(3, "0");
}

function populateSODropdown(selectedId) {
  var sel = document.getElementById("inputSO");
  var html = '<option value="">— ไม่อิง SO —</option>';
  allSOs.forEach(function (so) {
    if (so.status === "cancelled") return;
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

function populateRateDropdown(selectedId) {
  var sel = document.getElementById("inputRate");
  var html = '<option value="">— ไม่อิง Rate —</option>';
  allRates.forEach(function (r) {
    if (r.status === "inactive") return;
    html += '<option value="' + r.id + '" data-carrier="' + r.carrier + '" data-cost="' + r.base_rate + '">' + r.carrier + ' — ' + r.zone + ' (฿' + r.base_rate + ')</option>';
  });
  sel.innerHTML = html;
  if (selectedId) sel.value = String(selectedId);
}

function onSOChange() {
  var soId = Number(document.getElementById("inputSO").value);
  if (!soId) return;
  var so = allSOs.find(function (s) { return s.id === soId; });
  if (so && so.customer_id) document.getElementById("inputCustomer").value = String(so.customer_id);
}

function onRateChange() {
  var sel = document.getElementById("inputRate");
  var opt = sel.options[sel.selectedIndex];
  if (!opt || !opt.value) return;
  var carrier = opt.getAttribute("data-carrier");
  var cost = Number(opt.getAttribute("data-cost")) || 0;
  if (carrier) document.getElementById("inputCarrier").value = carrier;
  if (cost && !document.getElementById("inputCost").value) document.getElementById("inputCost").value = cost;
}

function openShipmentModal(title, s) {
  document.getElementById("modalTitle").textContent = title;
  document.getElementById("editId").value = s ? s.id : "";
  document.getElementById("inputShipmentNo").value = s ? s.shipment_number : generateShipmentNumber();
  document.getElementById("inputCarrier").value = s ? (s.carrier || "Kerry Express") : "Kerry Express";
  document.getElementById("inputTracking").value = s ? (s.tracking_number || "") : "";
  document.getElementById("inputDate").value = s ? s.ship_date : new Date().toISOString().slice(0, 10);
  document.getElementById("inputDeliveredDate").value = s ? (s.delivered_date || "") : "";
  document.getElementById("inputCost").value = s ? s.cost : "";
  document.getElementById("inputStatus").value = s ? s.status : "pending";
  document.getElementById("inputNote").value = s ? (s.note || "") : "";
  populateSODropdown(s ? s.so_id : null);
  populateCustomerDropdown(s ? s.customer_id : null);
  populateRateDropdown(s ? s.shipping_rate_id : null);
  openModalById("shipmentModal");
}

function saveShipment() {
  var id = document.getElementById("editId").value;
  var shipNumber = document.getElementById("inputShipmentNo").value.trim();
  var soId = Number(document.getElementById("inputSO").value) || null;
  var customerId = Number(document.getElementById("inputCustomer").value) || null;
  var rateId = Number(document.getElementById("inputRate").value) || null;
  var carrier = document.getElementById("inputCarrier").value;
  var tracking = document.getElementById("inputTracking").value.trim();
  var date = document.getElementById("inputDate").value;
  var deliveredDate = document.getElementById("inputDeliveredDate").value || null;
  var cost = Number(document.getElementById("inputCost").value) || 0;
  var status = document.getElementById("inputStatus").value;
  var note = document.getElementById("inputNote").value.trim();

  if (!date) return document.getElementById("inputDate").focus();

  var payload = {
    shipment_number: shipNumber,
    so_id: soId,
    customer_id: customerId,
    shipping_rate_id: rateId,
    carrier: carrier || null,
    tracking_number: tracking || null,
    ship_date: date,
    delivered_date: deliveredDate,
    cost: cost,
    status: status,
    note: note || null,
  };

  var op = id ? updateShipmentDB(Number(id), payload) : createShipmentDB(payload);
  op.then(function () { return reloadShipments(); })
    .then(function () {
      closeModalById("shipmentModal");
      applyFilters();
    })
    .catch(function (err) { console.error(err); });
}

function editShipment(id) {
  var s = shipments.find(function (x) { return x.id === id; });
  if (s) openShipmentModal("Edit Shipment", s);
}

function deleteShipment(id) {
  var s = shipments.find(function (x) { return x.id === id; });
  if (!s) return;
  showConfirm({
    title: "Confirm Delete",
    message: "ต้องการลบการจัดส่ง <strong>" + s.shipment_number + "</strong> ใช่ไหม?",
    okText: "Delete", okColor: "#ef4444",
    onConfirm: function () {
      deleteShipmentDB(id)
        .then(function () { return reloadShipments(); })
        .then(function () { applyFilters(); })
        .catch(function (err) { console.error(err); });
    },
  });
}

var currentFilter = "all";
var currentSort = "default";

function getFilteredData() {
  var keyword = document.querySelector(".filter-search-input").value.toLowerCase();
  var data = shipments.slice();
  if (currentFilter !== "all") data = data.filter(function (s) { return s.status === currentFilter; });
  if (keyword) {
    data = data.filter(function (s) {
      var soRef = s.sales_orders ? s.sales_orders.so_number.toLowerCase() : "";
      var cName = s.customers ? s.customers.name.toLowerCase() : "";
      return (s.shipment_number || "").toLowerCase().includes(keyword) || soRef.includes(keyword) || cName.includes(keyword) ||
             (s.carrier || "").toLowerCase().includes(keyword) || (s.tracking_number || "").toLowerCase().includes(keyword);
    });
  }
  switch (currentSort) {
    case "date-desc": data = data.slice().sort(function (a, b) { return (b.ship_date || "").localeCompare(a.ship_date || ""); }); break;
    case "date-asc":  data = data.slice().sort(function (a, b) { return (a.ship_date || "").localeCompare(b.ship_date || ""); }); break;
  }
  return data;
}

function applyFilters() { renderTable(getFilteredData()); }

function reloadAll() {
  return Promise.all([
    typeof fetchCustomersDB === "function" ? fetchCustomersDB() : Promise.resolve([]),
    typeof fetchSalesOrdersDB === "function" ? fetchSalesOrdersDB() : Promise.resolve([]),
    typeof fetchShippingRatesDB === "function" ? fetchShippingRatesDB() : Promise.resolve([]),
    typeof fetchShipmentsDB === "function" ? fetchShipmentsDB() : Promise.resolve([]),
  ]).then(function (res) {
    allCustomers = (res[0] || []).map(function (c) { return { id: c.id, name: c.name || "", status: c.status || "active" }; });
    allSOs = (res[1] || []).map(function (so) {
      return { id: so.id, so_number: so.so_number, customer_id: so.customer_id, status: so.status, customers: so.customers || null };
    });
    allRates = (res[2] || []).map(function (r) {
      return { id: r.id, carrier: r.carrier || "", zone: r.zone || "", base_rate: Number(r.base_rate) || 0, status: r.status || "active" };
    });
    shipments = (res[3] || []).map(normalizeShipment);
  });
}

function reloadShipments() {
  return (typeof fetchShipmentsDB === "function" ? fetchShipmentsDB() : Promise.resolve([]))
    .then(function (rows) { shipments = (rows || []).map(normalizeShipment); });
}

function normalizeShipment(s) {
  return {
    id: s.id,
    shipment_number: s.shipment_number || "",
    so_id: s.so_id,
    customer_id: s.customer_id,
    shipping_rate_id: s.shipping_rate_id,
    carrier: s.carrier || "",
    tracking_number: s.tracking_number || "",
    ship_date: s.ship_date || "",
    delivered_date: s.delivered_date || "",
    cost: Number(s.cost) || 0,
    status: s.status || "pending",
    note: s.note || "",
    customers: s.customers || null,
    sales_orders: s.sales_orders || null,
    shipping_rates: s.shipping_rates || null,
  };
}

// ============ Random fill (dev) ============
if (typeof registerRandomFill === "function") {
  registerRandomFill({
    target: "#shipmentModal",
    fill: function () {
      // shipment number readonly — auto-gen ไว้แล้ว
      // SO: อาจเว้นว่างไว้ก็ได้ (random ~50%)
      var soSel = document.getElementById("inputSO");
      if (soSel && rdBool(0.5) && soSel.options.length > 1) {
        pickRandomSelectOption("inputSO", { includeEmpty: false });
        if (typeof onSOChange === "function") onSOChange();
      }
      // Customer: ถ้ายังว่างให้สุ่ม
      var custSel = document.getElementById("inputCustomer");
      if (custSel && !custSel.value) pickRandomSelectOption("inputCustomer", { includeEmpty: false });

      // Rate (optional ~50%)
      var rateSel = document.getElementById("inputRate");
      if (rateSel && rdBool(0.5) && rateSel.options.length > 1) {
        pickRandomSelectOption("inputRate", { includeEmpty: false });
        if (typeof onRateChange === "function") onRateChange();
      }

      // Carrier
      var carrierSel = document.getElementById("inputCarrier");
      if (carrierSel) pickRandomSelectOption("inputCarrier", { includeEmpty: false });

      setFieldValue("inputTracking", rdInt(1000000000, 9999999999).toString());
      setFieldValue("inputDate", randomPastDate(7));

      // Status + delivered date logic
      var status = rdPick(["pending", "shipped", "shipped", "delivered", "delivered"]);
      setFieldValue("inputStatus", status);
      if (status === "delivered") {
        setFieldValue("inputDeliveredDate", randomPastDate(3));
      } else {
        setFieldValue("inputDeliveredDate", "");
      }

      if (!document.getElementById("inputCost").value) {
        setFieldValue("inputCost", randomMoney(50, 300));
      }
      setFieldValue("inputNote", randomNote());
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

  document.getElementById("addShipmentBtn").addEventListener("click", function () {
    openShipmentModal("Create Shipment", null);
  });

  reloadAll()
    .then(function () { applyFilters(); })
    .catch(function (err) { console.error(err); applyFilters(); });
});
