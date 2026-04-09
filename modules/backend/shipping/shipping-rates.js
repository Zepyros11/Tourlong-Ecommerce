// ============================================================
// shipping-rates.js — logic เฉพาะหน้า Shipping Rates
// ------------------------------------------------------------
// ใช้ร่วมกับ: modal.js, confirm.js
// ============================================================

// ============ Mock Database ============
let rates = [
  { id: 1, carrier: "Kerry Express",  zone: "กรุงเทพและปริมณฑล", weightMin: 0,  weightMax: 5,  baseRate: 50,  perKg: 10, days: "1-2", status: "active" },
  { id: 2, carrier: "Kerry Express",  zone: "ทั่วประเทศ",         weightMin: 0,  weightMax: 5,  baseRate: 80,  perKg: 15, days: "2-3", status: "active" },
  { id: 3, carrier: "Flash Express",  zone: "กรุงเทพและปริมณฑล", weightMin: 0,  weightMax: 3,  baseRate: 40,  perKg: 12, days: "1-2", status: "active" },
  { id: 4, carrier: "Flash Express",  zone: "ทั่วประเทศ",         weightMin: 0,  weightMax: 3,  baseRate: 60,  perKg: 18, days: "2-4", status: "active" },
  { id: 5, carrier: "Thailand Post",  zone: "ทั่วประเทศ",         weightMin: 0,  weightMax: 20, baseRate: 35,  perKg: 8,  days: "3-5", status: "active" },
  { id: 6, carrier: "J&T Express",    zone: "ทั่วประเทศ",         weightMin: 0,  weightMax: 10, baseRate: 55,  perKg: 12, days: "2-3", status: "active" },
  { id: 7, carrier: "DHL",            zone: "ทั่วประเทศ",         weightMin: 0,  weightMax: 30, baseRate: 150, perKg: 25, days: "1-2", status: "active" },
  { id: 8, carrier: "Thailand Post",  zone: "ภาคเหนือ",           weightMin: 5,  weightMax: 20, baseRate: 45,  perKg: 10, days: "4-7", status: "inactive" },
];

// ============ Update Stat Cards ============
function updateStats() {
  document.getElementById("statAll").textContent = rates.length;
  document.getElementById("statActive").textContent = rates.filter((r) => r.status === "active").length;
}

// ============ Render Table ============
function renderTable(data) {
  updateStats();
  const tbody = document.getElementById("rateTableBody");
  tbody.innerHTML = data
    .map(
      (r, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${r.carrier}</td>
      <td>${r.zone}</td>
      <td>${r.weightMin}-${r.weightMax} kg</td>
      <td>฿${r.baseRate.toLocaleString()}</td>
      <td>฿${r.perKg.toLocaleString()}</td>
      <td>${r.days}</td>
      <td><span class="badge badge-${r.status === "active" ? "active" : "inactive"}">${r.status === "active" ? "Active" : "Inactive"}</span></td>
      <td>
        <div class="table-actions">
          <button class="btn-icon-sm" onclick="editRate(${r.id})"><i data-lucide="pencil"></i></button>
          <button class="btn-icon-sm btn-danger" onclick="deleteRate(${r.id})"><i data-lucide="trash-2"></i></button>
        </div>
      </td>
    </tr>
  `
    )
    .join("");
  lucide.createIcons();
  if (typeof refreshSortableHeaders === "function") refreshSortableHeaders();
}

// ============ Add / Edit Modal ============
function openRateModal(title, r) {
  document.getElementById("modalTitle").textContent = title;
  document.getElementById("editId").value = r ? r.id : "";
  document.getElementById("inputCarrier").value = r ? r.carrier : "Kerry Express";
  document.getElementById("inputZone").value = r ? r.zone : "กรุงเทพและปริมณฑล";
  document.getElementById("inputWeightMin").value = r ? r.weightMin : "";
  document.getElementById("inputWeightMax").value = r ? r.weightMax : "";
  document.getElementById("inputBaseRate").value = r ? r.baseRate : "";
  document.getElementById("inputPerKg").value = r ? r.perKg : "";
  document.getElementById("inputDays").value = r ? r.days : "";
  document.getElementById("inputStatus").checked = r ? r.status === "active" : true;
  var _lbl = document.getElementById("inputStatusLabel"); if(_lbl) { _lbl.textContent = (r ? r.status === "active" : true) ? "Active" : "Inactive"; _lbl.classList.toggle("active-label", r ? r.status === "active" : true); }
  openModalById("rateModal", function () {
    document.getElementById("inputCarrier").focus();
  });
}

function saveRate() {
  const id = document.getElementById("editId").value;
  const carrier = document.getElementById("inputCarrier").value;
  const zone = document.getElementById("inputZone").value;
  const weightMin = Number(document.getElementById("inputWeightMin").value);
  const weightMax = Number(document.getElementById("inputWeightMax").value);
  const baseRate = Number(document.getElementById("inputBaseRate").value);
  const perKg = Number(document.getElementById("inputPerKg").value);
  const days = document.getElementById("inputDays").value.trim();
  const status = document.getElementById("inputStatus").checked ? "active" : "inactive";
  if (!days) return document.getElementById("inputDays").focus();

  if (id) {
    const r = rates.find((item) => item.id === Number(id));
    if (r) {
      r.carrier = carrier;
      r.zone = zone;
      r.weightMin = weightMin;
      r.weightMax = weightMax;
      r.baseRate = baseRate;
      r.perKg = perKg;
      r.days = days;
      r.status = status;
    }
  } else {
    const newId = rates.length ? Math.max(...rates.map((item) => item.id)) + 1 : 1;
    rates.push({ id: newId, carrier, zone, weightMin, weightMax, baseRate, perKg, days, status });
  }
  closeModalById("rateModal");
  applyFilters();
}

function editRate(id) {
  const r = rates.find((item) => item.id === id);
  if (r) openRateModal("Edit Rate", r);
}

// ============ Delete (ใช้ confirm.js) ============
function deleteRate(id) {
  const r = rates.find((item) => item.id === id);
  if (!r) return;
  showConfirm({
    title: "Confirm Delete",
    message: "ต้องการลบอัตราค่าขนส่ง <strong>" + r.carrier + " — " + r.zone + "</strong> ใช่ไหม?",
    okText: "Delete",
    okColor: "#ef4444",
    onConfirm: function () {
      rates = rates.filter((item) => item.id !== id);
      applyFilters();
    },
  });
}

// ============ Filter & Sort ============
let currentSort = "default";

function getFilteredData() {
  const keyword = document.querySelector(".filter-search-input").value.toLowerCase();
  let data = rates;

  if (keyword) {
    data = data.filter(
      (r) =>
        r.carrier.toLowerCase().includes(keyword) ||
        r.zone.toLowerCase().includes(keyword)
    );
  }

  switch (currentSort) {
    case "name-asc":
      data = [...data].sort((a, b) => a.carrier.localeCompare(b.carrier));
      break;
    case "price-asc":
      data = [...data].sort((a, b) => a.baseRate - b.baseRate);
      break;
    case "price-desc":
      data = [...data].sort((a, b) => b.baseRate - a.baseRate);
      break;
  }

  return data;
}

function applyFilters() {
  renderTable(getFilteredData());
}

// ============ Init ============
document.addEventListener("DOMContentLoaded", function () {
  document.querySelector(".filter-search-input").addEventListener("input", applyFilters);

  document.getElementById("sortSelect").addEventListener("change", function () {
    currentSort = this.value;
    applyFilters();
  });

  document.getElementById("addRateBtn").addEventListener("click", function () {
    openRateModal("Add Rate", null);
  });

  // Status toggle listener
  var statusToggle = document.getElementById("inputStatus");
  if (statusToggle) {
    statusToggle.addEventListener("change", function() {
      var lbl = document.getElementById("inputStatusLabel");
      if (lbl) { lbl.textContent = this.checked ? "Active" : "Inactive"; lbl.classList.toggle("active-label", this.checked); }
    });
  }

  renderTable(rates);
});
