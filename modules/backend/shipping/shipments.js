// ============================================================
// shipments.js — logic เฉพาะหน้า Shipments
// ------------------------------------------------------------
// ใช้ร่วมกับ: modal.js, confirm.js
// ============================================================

// ============ Mock Database ============
let shipments = [
  { id: 1, shipNo: "SHP-2026-001", soRef: "SO-2026-147", customer: "บ.เอบีซี จำกัด",       carrier: "Kerry Express",  tracking: "KEX1234567890",  date: "2026-04-02", status: "delivered" },
  { id: 2, shipNo: "SHP-2026-002", soRef: "SO-2026-148", customer: "คุณสมศรี จันทร์ดี",     carrier: "Flash Express",  tracking: "FLE9876543210",  date: "2026-04-03", status: "delivered" },
  { id: 3, shipNo: "SHP-2026-003", soRef: "SO-2026-149", customer: "บ.XYZ เทรดดิ้ง",       carrier: "DHL",            tracking: "DHL5551234567",  date: "2026-04-04", status: "delivered" },
  { id: 4, shipNo: "SHP-2026-004", soRef: "SO-2026-150", customer: "คุณธนา ใจงาม",         carrier: "Thailand Post",  tracking: "THP7778889990",  date: "2026-04-05", status: "delivered" },
  { id: 5, shipNo: "SHP-2026-005", soRef: "SO-2026-152", customer: "คุณธนา ใจงาม",         carrier: "J&T Express",    tracking: "JT12345678",     date: "2026-04-07", status: "transit" },
  { id: 6, shipNo: "SHP-2026-006", soRef: "SO-2026-154", customer: "บ.เอบีซี จำกัด",       carrier: "Kerry Express",  tracking: "KEX9998887776",  date: "2026-04-07", status: "transit" },
  { id: 7, shipNo: "SHP-2026-007", soRef: "SO-2026-155", customer: "คุณวิชัย สุขสม",       carrier: "Flash Express",  tracking: "",               date: "2026-04-08", status: "pending" },
  { id: 8, shipNo: "SHP-2026-008", soRef: "SO-2026-156", customer: "คุณสมศรี จันทร์ดี",     carrier: "Kerry Express",  tracking: "",               date: "2026-04-08", status: "pending" },
];

// ============ Update Stat Cards ============
function updateStats() {
  document.getElementById("statAll").textContent = shipments.length;
  document.getElementById("statDelivered").textContent = shipments.filter((s) => s.status === "delivered").length;
  document.getElementById("statTransit").textContent = shipments.filter((s) => s.status === "transit").length;
  document.getElementById("statPending").textContent = shipments.filter((s) => s.status === "pending").length;
}

// ============ Status Badge ============
function getStatusBadge(status) {
  switch (status) {
    case "delivered":
      return '<span class="badge badge-active">Delivered</span>';
    case "transit":
      return '<span class="badge" style="background-color:#fef3c7;color:#f59e0b;">In Transit</span>';
    case "pending":
      return '<span class="badge" style="background-color:#eff6ff;color:#3b82f6;">Pending</span>';
    default:
      return '<span class="badge">' + status + '</span>';
  }
}

// ============ Render Table ============
function renderTable(data) {
  updateStats();
  const tbody = document.getElementById("shipmentTableBody");
  tbody.innerHTML = data
    .map(
      (s, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${s.shipNo}</td>
      <td>${s.soRef}</td>
      <td>${s.customer}</td>
      <td>${s.carrier}</td>
      <td>${s.tracking || "-"}</td>
      <td>${s.date}</td>
      <td>${getStatusBadge(s.status)}</td>
      <td>
        <div class="table-actions">
          <button class="btn-icon-sm" onclick="editShipment(${s.id})"><i data-lucide="pencil"></i></button>
          <button class="btn-icon-sm btn-danger" onclick="deleteShipment(${s.id})"><i data-lucide="trash-2"></i></button>
        </div>
      </td>
    </tr>
  `
    )
    .join("");
  lucide.createIcons();
  if (typeof refreshSortableHeaders === "function") refreshSortableHeaders();
}

// ============ Auto Generate Shipment Number ============
function generateShipmentNumber() {
  const maxNum = shipments.reduce((max, s) => {
    const num = parseInt(s.shipNo.split("-").pop(), 10);
    return num > max ? num : max;
  }, 0);
  return "SHP-2026-" + String(maxNum + 1).padStart(3, "0");
}

// ============ Add / Edit Modal ============
function openShipmentModal(title, s) {
  document.getElementById("modalTitle").textContent = title;
  document.getElementById("editId").value = s ? s.id : "";
  document.getElementById("inputShipmentNo").value = s ? s.shipNo : generateShipmentNumber();
  document.getElementById("inputSO").value = s ? s.soRef : "SO-2026-147";
  document.getElementById("inputCustomer").value = s ? s.customer : "";
  document.getElementById("inputCarrier").value = s ? s.carrier : "Kerry Express";
  document.getElementById("inputTracking").value = s ? s.tracking : "";
  document.getElementById("inputDate").value = s ? s.date : "";
  document.getElementById("inputStatus").value = s ? s.status : "pending";
  openModalById("shipmentModal", function () {
    document.getElementById("inputCustomer").focus();
  });
}

function saveShipment() {
  const id = document.getElementById("editId").value;
  const shipNo = document.getElementById("inputShipmentNo").value.trim();
  const soRef = document.getElementById("inputSO").value;
  const customer = document.getElementById("inputCustomer").value.trim();
  const carrier = document.getElementById("inputCarrier").value;
  const tracking = document.getElementById("inputTracking").value.trim();
  const date = document.getElementById("inputDate").value;
  const status = document.getElementById("inputStatus").value;
  if (!customer) return document.getElementById("inputCustomer").focus();
  if (!date) return document.getElementById("inputDate").focus();

  if (id) {
    const s = shipments.find((item) => item.id === Number(id));
    if (s) {
      s.shipNo = shipNo;
      s.soRef = soRef;
      s.customer = customer;
      s.carrier = carrier;
      s.tracking = tracking;
      s.date = date;
      s.status = status;
    }
  } else {
    const newId = shipments.length ? Math.max(...shipments.map((item) => item.id)) + 1 : 1;
    shipments.push({ id: newId, shipNo, soRef, customer, carrier, tracking, date, status });
  }
  closeModalById("shipmentModal");
  applyFilters();
}

function editShipment(id) {
  const s = shipments.find((item) => item.id === id);
  if (s) openShipmentModal("Edit Shipment", s);
}

// ============ Delete (ใช้ confirm.js) ============
function deleteShipment(id) {
  const s = shipments.find((item) => item.id === id);
  if (!s) return;
  showConfirm({
    title: "Confirm Delete",
    message: "ต้องการลบการจัดส่ง <strong>" + s.shipNo + "</strong> ใช่ไหม?",
    okText: "Delete",
    okColor: "#ef4444",
    onConfirm: function () {
      shipments = shipments.filter((item) => item.id !== id);
      applyFilters();
    },
  });
}

// ============ Filter & Sort ============
let currentFilter = "all";
let currentSort = "default";

function getFilteredData() {
  const keyword = document.querySelector(".filter-search-input").value.toLowerCase();
  let data = shipments;

  if (currentFilter !== "all") {
    data = data.filter((s) => s.status === currentFilter);
  }

  if (keyword) {
    data = data.filter(
      (s) =>
        s.shipNo.toLowerCase().includes(keyword) ||
        s.soRef.toLowerCase().includes(keyword) ||
        s.customer.toLowerCase().includes(keyword) ||
        s.carrier.toLowerCase().includes(keyword) ||
        s.tracking.toLowerCase().includes(keyword)
    );
  }

  switch (currentSort) {
    case "date-desc":
      data = [...data].sort((a, b) => b.date.localeCompare(a.date));
      break;
    case "date-asc":
      data = [...data].sort((a, b) => a.date.localeCompare(b.date));
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

  document.querySelectorAll(".filter-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
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

  renderTable(shipments);
});
