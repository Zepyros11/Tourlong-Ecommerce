// ============================================================
// shipping-rates.js — Shipping Rates (Supabase)
// ============================================================

var rates = [];

function fmtMoney(n) { return "฿" + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function updateStats() {
  document.getElementById("statAll").textContent = rates.length;
  document.getElementById("statActive").textContent = rates.filter(function (r) { return r.status === "active"; }).length;
}

function renderTable(data) {
  updateStats();
  var tbody = document.getElementById("rateTableBody");
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:30px;color:#94a3b8;font-size:11px;">ยังไม่มีอัตราค่าขนส่ง</td></tr>';
    lucide.createIcons();
    return;
  }
  tbody.innerHTML = data.map(function (r, i) {
    return '<tr>' +
      '<td>' + (i + 1) + '</td>' +
      '<td>' + (r.carrier || "") + '</td>' +
      '<td>' + (r.zone || "") + '</td>' +
      '<td>' + r.weight_min + '-' + r.weight_max + ' kg</td>' +
      '<td>' + fmtMoney(r.base_rate) + '</td>' +
      '<td>' + fmtMoney(r.per_kg) + '</td>' +
      '<td>' + (r.days || "—") + '</td>' +
      '<td><span class="badge badge-' + (r.status === "active" ? "active" : "inactive") + '">' + (r.status === "active" ? "Active" : "Inactive") + '</span></td>' +
      '<td><div class="table-actions">' +
        '<button class="btn-icon-sm" onclick="editRate(' + r.id + ')"><i data-lucide="pencil"></i></button>' +
        '<button class="btn-icon-sm btn-danger" onclick="deleteRate(' + r.id + ')"><i data-lucide="trash-2"></i></button>' +
      '</div></td>' +
    '</tr>';
  }).join("");
  lucide.createIcons();
  if (typeof refreshSortableHeaders === "function") refreshSortableHeaders();
}

function openRateModal(title, r) {
  document.getElementById("modalTitle").textContent = title;
  document.getElementById("editId").value = r ? r.id : "";
  document.getElementById("inputCarrier").value = r ? r.carrier : "Kerry Express";
  document.getElementById("inputZone").value = r ? r.zone : "กรุงเทพและปริมณฑล";
  document.getElementById("inputWeightMin").value = r ? r.weight_min : "";
  document.getElementById("inputWeightMax").value = r ? r.weight_max : "";
  document.getElementById("inputBaseRate").value = r ? r.base_rate : "";
  document.getElementById("inputPerKg").value = r ? r.per_kg : "";
  document.getElementById("inputDays").value = r ? (r.days || "") : "";
  var active = r ? r.status === "active" : true;
  document.getElementById("inputStatus").checked = active;
  var lbl = document.getElementById("inputStatusLabel");
  if (lbl) { lbl.textContent = active ? "Active" : "Inactive"; lbl.classList.toggle("active-label", active); }
  openModalById("rateModal", function () { document.getElementById("inputCarrier").focus(); });
}

function saveRate() {
  var id = document.getElementById("editId").value;
  var days = document.getElementById("inputDays").value.trim();
  if (!days) return document.getElementById("inputDays").focus();

  var payload = {
    carrier: document.getElementById("inputCarrier").value,
    zone: document.getElementById("inputZone").value,
    weight_min: Number(document.getElementById("inputWeightMin").value) || 0,
    weight_max: Number(document.getElementById("inputWeightMax").value) || 0,
    base_rate: Number(document.getElementById("inputBaseRate").value) || 0,
    per_kg: Number(document.getElementById("inputPerKg").value) || 0,
    days: days,
    status: document.getElementById("inputStatus").checked ? "active" : "inactive",
  };

  var op = id ? updateShippingRateDB(Number(id), payload) : createShippingRateDB(payload);
  op.then(function () { return reloadRates(); })
    .then(function () {
      closeModalById("rateModal");
      applyFilters();
    })
    .catch(function (err) { console.error(err); });
}

function editRate(id) {
  var r = rates.find(function (x) { return x.id === id; });
  if (r) openRateModal("Edit Rate", r);
}

function deleteRate(id) {
  var r = rates.find(function (x) { return x.id === id; });
  if (!r) return;
  showConfirm({
    title: "Confirm Delete",
    message: "ต้องการลบอัตราค่าขนส่ง <strong>" + r.carrier + " — " + r.zone + "</strong> ใช่ไหม?",
    okText: "Delete", okColor: "#ef4444",
    onConfirm: function () {
      deleteShippingRateDB(id)
        .then(function () { return reloadRates(); })
        .then(function () { applyFilters(); })
        .catch(function (err) { console.error(err); });
    },
  });
}

var currentSort = "default";
function getFilteredData() {
  var keyword = document.querySelector(".filter-search-input").value.toLowerCase();
  var data = rates.slice();
  if (keyword) {
    data = data.filter(function (r) {
      return (r.carrier || "").toLowerCase().includes(keyword) || (r.zone || "").toLowerCase().includes(keyword);
    });
  }
  switch (currentSort) {
    case "name-asc":    data = data.slice().sort(function (a, b) { return (a.carrier || "").localeCompare(b.carrier || ""); }); break;
    case "price-asc":   data = data.slice().sort(function (a, b) { return Number(a.base_rate) - Number(b.base_rate); }); break;
    case "price-desc":  data = data.slice().sort(function (a, b) { return Number(b.base_rate) - Number(a.base_rate); }); break;
  }
  return data;
}

function applyFilters() { renderTable(getFilteredData()); }

function reloadRates() {
  return (typeof fetchShippingRatesDB === "function" ? fetchShippingRatesDB() : Promise.resolve([]))
    .then(function (rows) {
      rates = (rows || []).map(function (r) {
        return {
          id: r.id, carrier: r.carrier || "", zone: r.zone || "",
          weight_min: Number(r.weight_min) || 0, weight_max: Number(r.weight_max) || 0,
          base_rate: Number(r.base_rate) || 0, per_kg: Number(r.per_kg) || 0,
          days: r.days || "", status: r.status || "active",
        };
      });
    });
}

// ============ Random fill (dev) ============
if (typeof registerRandomFill === "function") {
  registerRandomFill({
    target: "#rateModal",
    fill: function () {
      pickRandomSelectOption("inputCarrier", { includeEmpty: false });
      pickRandomSelectOption("inputZone", { includeEmpty: false });
      var wMin = rdInt(0, 5);
      var wMax = rdInt(6, 30);
      setFieldValue("inputWeightMin", wMin);
      setFieldValue("inputWeightMax", wMax);
      setFieldValue("inputBaseRate", randomMoney(30, 150));
      setFieldValue("inputPerKg", randomMoney(10, 50));
      setFieldValue("inputDays", rdPick(["1-2", "2-3", "3-5", "1-3", "2-4"]));
      var sw = document.getElementById("inputStatus");
      if (sw) { sw.checked = rdBool(0.85); sw.dispatchEvent(new Event("change", { bubbles: true })); }
    },
  });
}

document.addEventListener("DOMContentLoaded", function () {
  document.querySelector(".filter-search-input").addEventListener("input", applyFilters);
  document.getElementById("sortSelect").addEventListener("change", function () {
    currentSort = this.value;
    applyFilters();
  });
  document.getElementById("addRateBtn").addEventListener("click", function () {
    openRateModal("Add Rate", null);
  });

  var statusToggle = document.getElementById("inputStatus");
  if (statusToggle) {
    statusToggle.addEventListener("change", function () {
      var lbl = document.getElementById("inputStatusLabel");
      if (lbl) { lbl.textContent = this.checked ? "Active" : "Inactive"; lbl.classList.toggle("active-label", this.checked); }
    });
  }

  reloadRates()
    .then(function () { applyFilters(); })
    .catch(function (err) { console.error(err); applyFilters(); });
});
