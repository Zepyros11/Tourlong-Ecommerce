// ============================================================
// payments.js — logic เฉพาะหน้า Payments
// ------------------------------------------------------------
// ใช้ร่วมกับ: modal.js, confirm.js
// ============================================================

// ============ Mock Database ============
let payments = [
  { id: 1, invoiceRef: "INV-2026-001", customer: "บ.เอบีซี จำกัด",       date: "2026-04-01", method: "โอนธนาคาร",  amount: 45000,  status: "completed" },
  { id: 2, invoiceRef: "INV-2026-002", customer: "คุณสมศรี จันทร์ดี",     date: "2026-04-02", method: "เงินสด",      amount: 5180,   status: "completed" },
  { id: 3, invoiceRef: "INV-2026-003", customer: "บ.XYZ เทรดดิ้ง",       date: "2026-04-03", method: "บัตรเครดิต",  amount: 92000,  status: "completed" },
  { id: 4, invoiceRef: "INV-2026-004", customer: "คุณธนา ใจงาม",         date: "2026-04-04", method: "เช็ค",        amount: 18750,  status: "completed" },
  { id: 5, invoiceRef: "INV-2026-005", customer: "คุณวิชัย สุขสม",       date: "2026-04-05", method: "โอนธนาคาร",  amount: 8900,   status: "pending" },
  { id: 6, invoiceRef: "INV-2026-006", customer: "บ.เอบีซี จำกัด",       date: "2026-04-06", method: "บัตรเครดิต",  amount: 45000,  status: "pending" },
  { id: 7, invoiceRef: "INV-2026-007", customer: "คุณสมศรี จันทร์ดี",     date: "2026-04-07", method: "เงินสด",      amount: 12500,  status: "pending" },
  { id: 8, invoiceRef: "INV-2026-008", customer: "คุณธนา ใจงาม",         date: "2026-04-08", method: "โอนธนาคาร",  amount: 31200,  status: "completed" },
];

// ============ Update Stat Cards ============
function updateStats() {
  document.getElementById("statAll").textContent = payments.length;
  document.getElementById("statCompleted").textContent = payments.filter((p) => p.status === "completed").length;
  document.getElementById("statPending").textContent = payments.filter((p) => p.status === "pending").length;
}

// ============ Status Badge ============
function getStatusBadge(status) {
  switch (status) {
    case "completed":
      return '<span class="badge badge-active">Completed</span>';
    case "pending":
      return '<span class="badge" style="background-color:#fef3c7;color:#f59e0b;">Pending</span>';
    default:
      return '<span class="badge">' + status + '</span>';
  }
}

// ============ Render Table ============
function renderTable(data) {
  updateStats();
  const tbody = document.getElementById("paymentTableBody");
  tbody.innerHTML = data
    .map(
      (p, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${p.date}</td>
      <td>${p.invoiceRef}</td>
      <td>${p.customer}</td>
      <td>${p.method}</td>
      <td>฿${p.amount.toLocaleString()}</td>
      <td>${getStatusBadge(p.status)}</td>
      <td>
        <div class="table-actions">
          <button class="btn-icon-sm" onclick="editPayment(${p.id})"><i data-lucide="pencil"></i></button>
          <button class="btn-icon-sm btn-danger" onclick="deletePayment(${p.id})"><i data-lucide="trash-2"></i></button>
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
function openPaymentModal(title, p) {
  document.getElementById("modalTitle").textContent = title;
  document.getElementById("editId").value = p ? p.id : "";
  document.getElementById("inputInvoice").value = p ? p.invoiceRef : "INV-2026-001";
  document.getElementById("inputCustomer").value = p ? p.customer : "";
  document.getElementById("inputDate").value = p ? p.date : "";
  document.getElementById("inputMethod").value = p ? p.method : "โอนธนาคาร";
  document.getElementById("inputAmount").value = p ? p.amount : "";
  document.getElementById("inputStatus").value = p ? p.status : "completed";
  openModalById("paymentModal", function () {
    document.getElementById("inputCustomer").focus();
  });
}

function savePayment() {
  const id = document.getElementById("editId").value;
  const invoiceRef = document.getElementById("inputInvoice").value;
  const customer = document.getElementById("inputCustomer").value.trim();
  const date = document.getElementById("inputDate").value;
  const method = document.getElementById("inputMethod").value;
  const amount = parseFloat(document.getElementById("inputAmount").value);
  const status = document.getElementById("inputStatus").value;
  if (!customer) return document.getElementById("inputCustomer").focus();
  if (!date) return document.getElementById("inputDate").focus();
  if (!amount) return document.getElementById("inputAmount").focus();

  if (id) {
    const p = payments.find((item) => item.id === Number(id));
    if (p) {
      p.invoiceRef = invoiceRef;
      p.customer = customer;
      p.date = date;
      p.method = method;
      p.amount = amount;
      p.status = status;
    }
  } else {
    const newId = payments.length ? Math.max(...payments.map((item) => item.id)) + 1 : 1;
    payments.push({ id: newId, invoiceRef, customer, date, method, amount, status });
  }
  closeModalById("paymentModal");
  applyFilters();
}

function editPayment(id) {
  const p = payments.find((item) => item.id === id);
  if (p) openPaymentModal("Edit Payment", p);
}

// ============ Delete (ใช้ confirm.js) ============
function deletePayment(id) {
  const p = payments.find((item) => item.id === id);
  if (!p) return;
  showConfirm({
    title: "Confirm Delete",
    message: "ต้องการลบรายการชำระ <strong>" + p.invoiceRef + "</strong> ใช่ไหม?",
    okText: "Delete",
    okColor: "#ef4444",
    onConfirm: function () {
      payments = payments.filter((item) => item.id !== id);
      applyFilters();
    },
  });
}

// ============ Filter & Sort ============
let currentFilter = "all";
let currentSort = "default";

function getFilteredData() {
  const keyword = document.querySelector(".filter-search-input").value.toLowerCase();
  let data = payments;

  if (currentFilter !== "all") {
    data = data.filter((p) => p.status === currentFilter);
  }

  if (keyword) {
    data = data.filter(
      (p) =>
        p.invoiceRef.toLowerCase().includes(keyword) ||
        p.customer.toLowerCase().includes(keyword) ||
        p.method.toLowerCase().includes(keyword)
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

  document.getElementById("addPaymentBtn").addEventListener("click", function () {
    openPaymentModal("Add Payment", null);
  });

  renderTable(payments);
});
