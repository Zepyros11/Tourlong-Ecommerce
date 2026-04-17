// ============================================================
// purchase-orders.js — logic เฉพาะหน้า Purchase Orders
// ------------------------------------------------------------
// ใช้ร่วมกับ: modal.js, confirm.js
// ============================================================

// ============ Mock Database ============
let purchaseOrders = [];

// ============ Update Stat Cards ============
function updateStats() {
  document.getElementById("statAll").textContent = purchaseOrders.length;
  document.getElementById("statApproved").textContent = purchaseOrders.filter((po) => po.status === "approved").length;
  document.getElementById("statPending").textContent = purchaseOrders.filter((po) => po.status === "pending").length;
  document.getElementById("statCancelled").textContent = purchaseOrders.filter((po) => po.status === "cancelled").length;
}

// ============ Status Badge ============
function getStatusBadge(status) {
  switch (status) {
    case "approved":
      return '<span class="badge badge-active">Approved</span>';
    case "pending":
      return '<span class="badge" style="background-color:#fef3c7;color:#f59e0b;">Pending</span>';
    case "cancelled":
      return '<span class="badge badge-inactive">Cancelled</span>';
    default:
      return '<span class="badge">' + status + '</span>';
  }
}

// ============ Render Table ============
function renderTable(data) {
  updateStats();
  const tbody = document.getElementById("poTableBody");
  tbody.innerHTML = data
    .map(
      (po, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${po.poNumber}</td>
      <td>${po.supplier}</td>
      <td>${po.date}</td>
      <td>${po.items}</td>
      <td>฿${po.amount.toLocaleString()}</td>
      <td>${getStatusBadge(po.status)}</td>
      <td>
        <div class="table-actions">
          <button class="btn-icon-sm" onclick="editPO(${po.id})"><i data-lucide="pencil"></i></button>
          <button class="btn-icon-sm btn-danger" onclick="deletePO(${po.id})"><i data-lucide="trash-2"></i></button>
        </div>
      </td>
    </tr>
  `
    )
    .join("");
  lucide.createIcons();
  if (typeof refreshSortableHeaders === "function") refreshSortableHeaders();
}

// ============ Auto Generate PO Number ============
function generatePONumber() {
  const maxNum = purchaseOrders.reduce((max, po) => {
    const num = parseInt(po.poNumber.split("-").pop(), 10);
    return num > max ? num : max;
  }, 0);
  return "PO-2026-" + String(maxNum + 1).padStart(3, "0");
}

// ============ Add / Edit Modal ============
function openPOModal(title, po) {
  document.getElementById("modalTitle").textContent = title;
  document.getElementById("editId").value = po ? po.id : "";
  document.getElementById("inputPONumber").value = po ? po.poNumber : generatePONumber();
  document.getElementById("inputSupplier").value = po ? po.supplier : "บ.สยามซัพพลาย";
  document.getElementById("inputDate").value = po ? po.date : "";
  document.getElementById("inputItems").value = po ? po.items : "";
  document.getElementById("inputAmount").value = po ? po.amount : "";
  document.getElementById("inputStatus").value = po ? po.status : "pending";
  openModalById("poModal", function () {
    document.getElementById("inputSupplier").focus();
  });
}

function savePO() {
  const id = document.getElementById("editId").value;
  const poNumber = document.getElementById("inputPONumber").value.trim();
  const supplier = document.getElementById("inputSupplier").value;
  const date = document.getElementById("inputDate").value;
  const items = parseInt(document.getElementById("inputItems").value, 10);
  const amount = parseFloat(document.getElementById("inputAmount").value);
  const status = document.getElementById("inputStatus").value;
  if (!date) return document.getElementById("inputDate").focus();
  if (!items) return document.getElementById("inputItems").focus();
  if (!amount) return document.getElementById("inputAmount").focus();

  if (id) {
    const po = purchaseOrders.find((item) => item.id === Number(id));
    if (po) {
      po.poNumber = poNumber;
      po.supplier = supplier;
      po.date = date;
      po.items = items;
      po.amount = amount;
      po.status = status;
    }
  } else {
    const newId = purchaseOrders.length ? Math.max(...purchaseOrders.map((item) => item.id)) + 1 : 1;
    purchaseOrders.push({ id: newId, poNumber, supplier, date, items, amount, status });
  }
  closeModalById("poModal");
  applyFilters();
}

function editPO(id) {
  const po = purchaseOrders.find((item) => item.id === id);
  if (po) openPOModal("Edit PO", po);
}

// ============ Delete (ใช้ confirm.js) ============
function deletePO(id) {
  const po = purchaseOrders.find((item) => item.id === id);
  if (!po) return;
  showConfirm({
    title: "Confirm Delete",
    message: "ต้องการลบใบสั่งซื้อ <strong>" + po.poNumber + "</strong> ใช่ไหม?",
    okText: "Delete",
    okColor: "#ef4444",
    onConfirm: function () {
      purchaseOrders = purchaseOrders.filter((item) => item.id !== id);
      applyFilters();
    },
  });
}

// ============ Filter & Sort ============
let currentFilter = "all";
let currentSort = "default";

function getFilteredData() {
  const keyword = document.querySelector(".filter-search-input").value.toLowerCase();
  let data = purchaseOrders;

  if (currentFilter !== "all") {
    data = data.filter((po) => po.status === currentFilter);
  }

  if (keyword) {
    data = data.filter(
      (po) =>
        po.poNumber.toLowerCase().includes(keyword) ||
        po.supplier.toLowerCase().includes(keyword)
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

  document.getElementById("addPOBtn").addEventListener("click", function () {
    openPOModal("Create PO", null);
  });

  renderTable(purchaseOrders);
});
