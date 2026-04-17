// ============================================================
// invoices.js — logic เฉพาะหน้า Invoices
// ------------------------------------------------------------
// ใช้ร่วมกับ: modal.js, confirm.js
// ============================================================

// ============ Mock Database ============
let invoices = [];

// ============ Update Stat Cards ============
function updateStats() {
  document.getElementById("statAll").textContent = invoices.length;
  document.getElementById("statPaid").textContent = invoices.filter((inv) => inv.status === "paid").length;
  document.getElementById("statUnpaid").textContent = invoices.filter((inv) => inv.status === "unpaid").length;
  document.getElementById("statOverdue").textContent = invoices.filter((inv) => inv.status === "overdue").length;
}

// ============ Status Badge ============
function getStatusBadge(status) {
  switch (status) {
    case "paid":
      return '<span class="badge badge-active">Paid</span>';
    case "unpaid":
      return '<span class="badge" style="background-color:#fef3c7;color:#f59e0b;">Unpaid</span>';
    case "overdue":
      return '<span class="badge badge-inactive">Overdue</span>';
    default:
      return '<span class="badge">' + status + '</span>';
  }
}

// ============ Render Table ============
function renderTable(data) {
  updateStats();
  const tbody = document.getElementById("invoiceTableBody");
  tbody.innerHTML = data
    .map(
      (inv, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${inv.invNumber}</td>
      <td>${inv.soRef}</td>
      <td>${inv.customer}</td>
      <td>${inv.date}</td>
      <td>${inv.dueDate}</td>
      <td>฿${inv.amount.toLocaleString()}</td>
      <td>${getStatusBadge(inv.status)}</td>
      <td>
        <div class="table-actions">
          <button class="btn-icon-sm" onclick="editInvoice(${inv.id})"><i data-lucide="pencil"></i></button>
          <button class="btn-icon-sm btn-danger" onclick="deleteInvoice(${inv.id})"><i data-lucide="trash-2"></i></button>
        </div>
      </td>
    </tr>
  `
    )
    .join("");
  lucide.createIcons();
  if (typeof refreshSortableHeaders === "function") refreshSortableHeaders();
}

// ============ Auto Generate Invoice Number ============
function generateInvoiceNumber() {
  const maxNum = invoices.reduce((max, inv) => {
    const num = parseInt(inv.invNumber.split("-").pop(), 10);
    return num > max ? num : max;
  }, 0);
  return "INV-2026-" + String(maxNum + 1).padStart(3, "0");
}

// ============ Add / Edit Modal ============
function openInvoiceModal(title, inv) {
  document.getElementById("modalTitle").textContent = title;
  document.getElementById("editId").value = inv ? inv.id : "";
  document.getElementById("inputInvoiceNumber").value = inv ? inv.invNumber : generateInvoiceNumber();
  document.getElementById("inputSO").value = inv ? inv.soRef : "SO-2026-147";
  document.getElementById("inputCustomer").value = inv ? inv.customer : "";
  document.getElementById("inputDate").value = inv ? inv.date : "";
  document.getElementById("inputDueDate").value = inv ? inv.dueDate : "";
  document.getElementById("inputAmount").value = inv ? inv.amount : "";
  document.getElementById("inputStatus").value = inv ? inv.status : "unpaid";
  openModalById("invoiceModal", function () {
    document.getElementById("inputCustomer").focus();
  });
}

function saveInvoice() {
  const id = document.getElementById("editId").value;
  const invNumber = document.getElementById("inputInvoiceNumber").value.trim();
  const soRef = document.getElementById("inputSO").value;
  const customer = document.getElementById("inputCustomer").value.trim();
  const date = document.getElementById("inputDate").value;
  const dueDate = document.getElementById("inputDueDate").value;
  const amount = parseFloat(document.getElementById("inputAmount").value);
  const status = document.getElementById("inputStatus").value;
  if (!customer) return document.getElementById("inputCustomer").focus();
  if (!date) return document.getElementById("inputDate").focus();
  if (!dueDate) return document.getElementById("inputDueDate").focus();
  if (!amount) return document.getElementById("inputAmount").focus();

  if (id) {
    const inv = invoices.find((item) => item.id === Number(id));
    if (inv) {
      inv.invNumber = invNumber;
      inv.soRef = soRef;
      inv.customer = customer;
      inv.date = date;
      inv.dueDate = dueDate;
      inv.amount = amount;
      inv.status = status;
    }
  } else {
    const newId = invoices.length ? Math.max(...invoices.map((item) => item.id)) + 1 : 1;
    invoices.push({ id: newId, invNumber, soRef, customer, date, dueDate, amount, status });
  }
  closeModalById("invoiceModal");
  applyFilters();
}

function editInvoice(id) {
  const inv = invoices.find((item) => item.id === id);
  if (inv) openInvoiceModal("Edit Invoice", inv);
}

// ============ Delete (ใช้ confirm.js) ============
function deleteInvoice(id) {
  const inv = invoices.find((item) => item.id === id);
  if (!inv) return;
  showConfirm({
    title: "Confirm Delete",
    message: "ต้องการลบใบแจ้งหนี้ <strong>" + inv.invNumber + "</strong> ใช่ไหม?",
    okText: "Delete",
    okColor: "#ef4444",
    onConfirm: function () {
      invoices = invoices.filter((item) => item.id !== id);
      applyFilters();
    },
  });
}

// ============ Filter & Sort ============
let currentFilter = "all";
let currentSort = "default";

function getFilteredData() {
  const keyword = document.querySelector(".filter-search-input").value.toLowerCase();
  let data = invoices;

  if (currentFilter !== "all") {
    data = data.filter((inv) => inv.status === currentFilter);
  }

  if (keyword) {
    data = data.filter(
      (inv) =>
        inv.invNumber.toLowerCase().includes(keyword) ||
        inv.soRef.toLowerCase().includes(keyword) ||
        inv.customer.toLowerCase().includes(keyword)
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

  document.getElementById("addInvoiceBtn").addEventListener("click", function () {
    openInvoiceModal("Create Invoice", null);
  });

  renderTable(invoices);
});
