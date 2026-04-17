// ============================================================
// expenses.js — logic เฉพาะหน้า Expenses
// ------------------------------------------------------------
// ใช้ร่วมกับ: modal.js, confirm.js
// ============================================================

// ============ Mock Database ============
let expenses = [];

// ============ Update Stat Cards ============
function updateStats() {
  document.getElementById("statAll").textContent = expenses.length;
  document.getElementById("statPaid").textContent = expenses.filter((exp) => exp.status === "paid").length;
  document.getElementById("statUnpaid").textContent = expenses.filter((exp) => exp.status === "unpaid").length;
}

// ============ Status Badge ============
function getStatusBadge(status) {
  switch (status) {
    case "paid":
      return '<span class="badge badge-active">Paid</span>';
    case "unpaid":
      return '<span class="badge" style="background-color:#fef3c7;color:#f59e0b;">Unpaid</span>';
    default:
      return '<span class="badge">' + status + '</span>';
  }
}

// ============ Render Table ============
function renderTable(data) {
  updateStats();
  const tbody = document.getElementById("expenseTableBody");
  tbody.innerHTML = data
    .map(
      (exp, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${exp.date}</td>
      <td>${exp.description}</td>
      <td>${exp.category}</td>
      <td>฿${exp.amount.toLocaleString()}</td>
      <td>${getStatusBadge(exp.status)}</td>
      <td>
        <div class="table-actions">
          <button class="btn-icon-sm" onclick="editExpense(${exp.id})"><i data-lucide="pencil"></i></button>
          <button class="btn-icon-sm btn-danger" onclick="deleteExpense(${exp.id})"><i data-lucide="trash-2"></i></button>
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
function openExpenseModal(title, exp) {
  document.getElementById("modalTitle").textContent = title;
  document.getElementById("editId").value = exp ? exp.id : "";
  document.getElementById("inputDate").value = exp ? exp.date : "";
  document.getElementById("inputDesc").value = exp ? exp.description : "";
  document.getElementById("inputCategory").value = exp ? exp.category : "จัดซื้อ";
  document.getElementById("inputAmount").value = exp ? exp.amount : "";
  document.getElementById("inputStatus").value = exp ? exp.status : "unpaid";
  openModalById("expenseModal", function () {
    document.getElementById("inputDesc").focus();
  });
}

function saveExpense() {
  const id = document.getElementById("editId").value;
  const date = document.getElementById("inputDate").value;
  const description = document.getElementById("inputDesc").value.trim();
  const category = document.getElementById("inputCategory").value;
  const amount = parseFloat(document.getElementById("inputAmount").value);
  const status = document.getElementById("inputStatus").value;
  if (!date) return document.getElementById("inputDate").focus();
  if (!description) return document.getElementById("inputDesc").focus();
  if (!amount) return document.getElementById("inputAmount").focus();

  if (id) {
    const exp = expenses.find((item) => item.id === Number(id));
    if (exp) {
      exp.date = date;
      exp.description = description;
      exp.category = category;
      exp.amount = amount;
      exp.status = status;
    }
  } else {
    const newId = expenses.length ? Math.max(...expenses.map((item) => item.id)) + 1 : 1;
    expenses.push({ id: newId, date, description, category, amount, status });
  }
  closeModalById("expenseModal");
  applyFilters();
}

function editExpense(id) {
  const exp = expenses.find((item) => item.id === id);
  if (exp) openExpenseModal("Edit Expense", exp);
}

// ============ Delete (ใช้ confirm.js) ============
function deleteExpense(id) {
  const exp = expenses.find((item) => item.id === id);
  if (!exp) return;
  showConfirm({
    title: "Confirm Delete",
    message: "ต้องการลบรายจ่าย <strong>" + exp.description + "</strong> ใช่ไหม?",
    okText: "Delete",
    okColor: "#ef4444",
    onConfirm: function () {
      expenses = expenses.filter((item) => item.id !== id);
      applyFilters();
    },
  });
}

// ============ Filter & Sort ============
let currentFilter = "all";
let currentSort = "default";

function getFilteredData() {
  const keyword = document.querySelector(".filter-search-input").value.toLowerCase();
  let data = expenses;

  if (currentFilter !== "all") {
    data = data.filter((exp) => exp.status === currentFilter);
  }

  if (keyword) {
    data = data.filter(
      (exp) =>
        exp.description.toLowerCase().includes(keyword) ||
        exp.category.toLowerCase().includes(keyword)
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

  document.getElementById("addExpenseBtn").addEventListener("click", function () {
    openExpenseModal("Add Expense", null);
  });

  renderTable(expenses);
});
