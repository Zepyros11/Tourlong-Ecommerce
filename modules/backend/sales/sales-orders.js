// ============================================================
// sales-orders.js — logic เฉพาะหน้า Sales Orders
// ------------------------------------------------------------
// ใช้ร่วมกับ: modal.js, confirm.js
// ============================================================

// ============ Mock Database ============
let salesOrders = [
  { id: 1,  soNumber: "SO-2026-147", customer: "บ.เอบีซี จำกัด",       date: "2026-04-01", items: 5,  amount: 45000,  status: "completed" },
  { id: 2,  soNumber: "SO-2026-148", customer: "คุณสมศรี จันทร์ดี",     date: "2026-04-02", items: 2,  amount: 5180,   status: "completed" },
  { id: 3,  soNumber: "SO-2026-149", customer: "บ.XYZ เทรดดิ้ง",       date: "2026-04-03", items: 8,  amount: 92000,  status: "completed" },
  { id: 4,  soNumber: "SO-2026-150", customer: "คุณธนา ใจงาม",         date: "2026-04-04", items: 3,  amount: 18750,  status: "completed" },
  { id: 5,  soNumber: "SO-2026-151", customer: "คุณนภา รักดี",          date: "2026-04-05", items: 1,  amount: 3200,   status: "cancelled" },
  { id: 6,  soNumber: "SO-2026-152", customer: "คุณธนา ใจงาม",         date: "2026-04-06", items: 4,  amount: 18750,  status: "completed" },
  { id: 7,  soNumber: "SO-2026-153", customer: "คุณนภา รักดี",          date: "2026-04-07", items: 2,  amount: 3200,   status: "processing" },
  { id: 8,  soNumber: "SO-2026-154", customer: "บ.เอบีซี จำกัด",       date: "2026-04-07", items: 10, amount: 45000,  status: "completed" },
  { id: 9,  soNumber: "SO-2026-155", customer: "คุณวิชัย สุขสม",        date: "2026-04-08", items: 3,  amount: 8900,   status: "processing" },
  { id: 10, soNumber: "SO-2026-156", customer: "คุณสมศรี จันทร์ดี",     date: "2026-04-08", items: 6,  amount: 12500,  status: "completed" },
];

// ============ Update Stat Cards ============
function updateStats() {
  document.getElementById("statAll").textContent = salesOrders.length;
  document.getElementById("statCompleted").textContent = salesOrders.filter((so) => so.status === "completed").length;
  document.getElementById("statProcessing").textContent = salesOrders.filter((so) => so.status === "processing").length;
  document.getElementById("statCancelled").textContent = salesOrders.filter((so) => so.status === "cancelled").length;
}

// ============ Status Badge ============
function getStatusBadge(status) {
  switch (status) {
    case "completed":
      return '<span class="badge badge-active">Completed</span>';
    case "processing":
      return '<span class="badge" style="background-color:#fef3c7;color:#f59e0b;">Processing</span>';
    case "cancelled":
      return '<span class="badge badge-inactive">Cancelled</span>';
    default:
      return '<span class="badge">' + status + '</span>';
  }
}

// ============ Render Table ============
function renderTable(data) {
  updateStats();
  const tbody = document.getElementById("soTableBody");
  tbody.innerHTML = data
    .map(
      (so, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${so.soNumber}</td>
      <td>${so.customer}</td>
      <td>${so.date}</td>
      <td>${so.items}</td>
      <td>฿${so.amount.toLocaleString()}</td>
      <td>${getStatusBadge(so.status)}</td>
      <td>
        <div class="table-actions">
          <button class="btn-icon-sm" onclick="editSO(${so.id})"><i data-lucide="pencil"></i></button>
          <button class="btn-icon-sm btn-danger" onclick="deleteSO(${so.id})"><i data-lucide="trash-2"></i></button>
        </div>
      </td>
    </tr>
  `
    )
    .join("");
  lucide.createIcons();
  if (typeof refreshSortableHeaders === "function") refreshSortableHeaders();
}

// ============ Auto Generate SO Number ============
function generateSONumber() {
  const maxNum = salesOrders.reduce((max, so) => {
    const num = parseInt(so.soNumber.split("-").pop(), 10);
    return num > max ? num : max;
  }, 0);
  return "SO-2026-" + String(maxNum + 1);
}

// ============ Add / Edit Modal ============
function openSOModal(title, so) {
  document.getElementById("modalTitle").textContent = title;
  document.getElementById("editId").value = so ? so.id : "";
  document.getElementById("inputSONumber").value = so ? so.soNumber : generateSONumber();
  document.getElementById("inputCustomer").value = so ? so.customer : "บ.เอบีซี จำกัด";
  document.getElementById("inputDate").value = so ? so.date : "";
  document.getElementById("inputItems").value = so ? so.items : "";
  document.getElementById("inputAmount").value = so ? so.amount : "";
  document.getElementById("inputStatus").value = so ? so.status : "processing";
  openModalById("soModal", function () {
    document.getElementById("inputCustomer").focus();
  });
}

function saveSO() {
  const id = document.getElementById("editId").value;
  const soNumber = document.getElementById("inputSONumber").value.trim();
  const customer = document.getElementById("inputCustomer").value;
  const date = document.getElementById("inputDate").value;
  const items = parseInt(document.getElementById("inputItems").value, 10);
  const amount = parseFloat(document.getElementById("inputAmount").value);
  const status = document.getElementById("inputStatus").value;
  if (!date) return document.getElementById("inputDate").focus();
  if (!items) return document.getElementById("inputItems").focus();
  if (!amount) return document.getElementById("inputAmount").focus();

  if (id) {
    const so = salesOrders.find((item) => item.id === Number(id));
    if (so) {
      so.soNumber = soNumber;
      so.customer = customer;
      so.date = date;
      so.items = items;
      so.amount = amount;
      so.status = status;
    }
  } else {
    const newId = salesOrders.length ? Math.max(...salesOrders.map((item) => item.id)) + 1 : 1;
    salesOrders.push({ id: newId, soNumber, customer, date, items, amount, status });
  }
  closeModalById("soModal");
  applyFilters();
}

function editSO(id) {
  const so = salesOrders.find((item) => item.id === id);
  if (so) openSOModal("Edit Order", so);
}

// ============ Delete (ใช้ confirm.js) ============
function deleteSO(id) {
  const so = salesOrders.find((item) => item.id === id);
  if (!so) return;
  showConfirm({
    title: "Confirm Delete",
    message: "ต้องการลบคำสั่งซื้อ <strong>" + so.soNumber + "</strong> ใช่ไหม?",
    okText: "Delete",
    okColor: "#ef4444",
    onConfirm: function () {
      salesOrders = salesOrders.filter((item) => item.id !== id);
      applyFilters();
    },
  });
}

// ============ Filter & Sort ============
let currentFilter = "all";
let currentSort = "default";

function getFilteredData() {
  const keyword = document.querySelector(".filter-search-input").value.toLowerCase();
  let data = salesOrders;

  if (currentFilter !== "all") {
    data = data.filter((so) => so.status === currentFilter);
  }

  if (keyword) {
    data = data.filter(
      (so) =>
        so.soNumber.toLowerCase().includes(keyword) ||
        so.customer.toLowerCase().includes(keyword)
    );
  }

  switch (currentSort) {
    case "date-desc":
      data = [...data].sort((a, b) => b.date.localeCompare(a.date));
      break;
    case "date-asc":
      data = [...data].sort((a, b) => a.date.localeCompare(b.date));
      break;
    case "amount-desc":
      data = [...data].sort((a, b) => b.amount - a.amount);
      break;
    case "amount-asc":
      data = [...data].sort((a, b) => a.amount - b.amount);
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

  document.getElementById("addSOBtn").addEventListener("click", function () {
    openSOModal("Create Order", null);
  });

  renderTable(salesOrders);
});
