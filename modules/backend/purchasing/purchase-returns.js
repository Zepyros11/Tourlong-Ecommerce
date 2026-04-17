// ============================================================
// purchase-returns.js — logic เฉพาะหน้า Purchase Returns
// ------------------------------------------------------------
// ใช้ร่วมกับ: modal.js, confirm.js
// ============================================================

// ============ Mock Database ============
let returns = [];

// ============ Auto Generate Return Number ============
function generateReturnNumber() {
  const nums = returns.map((r) => parseInt(r.returnNumber.split("-").pop()));
  const next = nums.length ? Math.max(...nums) + 1 : 1;
  return "PR-2026-" + String(next).padStart(3, "0");
}

// ============ Update Stat Cards ============
function updateStats() {
  document.getElementById("statAll").textContent = returns.length;
  document.getElementById("statApproved").textContent = returns.filter((r) => r.status === "approved").length;
  document.getElementById("statPending").textContent = returns.filter((r) => r.status === "pending").length;
}

// ============ Render Table ============
function renderTable(data) {
  updateStats();
  const tbody = document.getElementById("returnTableBody");
  tbody.innerHTML = data
    .map(
      (r, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${r.returnNumber}</td>
      <td>${r.poRef}</td>
      <td>${r.supplier}</td>
      <td>${r.date}</td>
      <td>${r.reason}</td>
      <td><span class="${r.status === "approved" ? "badge badge-active" : "badge"}" style="${r.status === "pending" ? "background-color:#fef3c7;color:#f59e0b;" : ""}">${r.status === "approved" ? "Approved" : "Pending"}</span></td>
      <td>
        <div class="table-actions">
          <button class="btn-icon-sm" onclick="editReturn(${r.id})"><i data-lucide="pencil"></i></button>
          <button class="btn-icon-sm btn-danger" onclick="deleteReturn(${r.id})"><i data-lucide="trash-2"></i></button>
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
function openReturnModal(title, r) {
  document.getElementById("modalTitle").textContent = title;
  document.getElementById("editId").value = r ? r.id : "";
  document.getElementById("inputReturnNumber").value = r ? r.returnNumber : generateReturnNumber();
  document.getElementById("inputPO").value = r ? r.poRef : "PO-2026-001";
  document.getElementById("inputSupplier").value = r ? r.supplier : "";
  document.getElementById("inputDate").value = r ? r.date : "";
  document.getElementById("inputReason").value = r ? r.reason : "";
  document.getElementById("inputStatus").value = r ? r.status : "pending";
  openModalById("returnModal", function () {
    document.getElementById("inputSupplier").focus();
  });
}

function saveReturn() {
  const id = document.getElementById("editId").value;
  const returnNumber = document.getElementById("inputReturnNumber").value.trim();
  const poRef = document.getElementById("inputPO").value;
  const supplier = document.getElementById("inputSupplier").value.trim();
  const date = document.getElementById("inputDate").value;
  const reason = document.getElementById("inputReason").value.trim();
  const status = document.getElementById("inputStatus").value;
  if (!supplier) return document.getElementById("inputSupplier").focus();

  if (id) {
    const r = returns.find((item) => item.id === Number(id));
    if (r) {
      r.returnNumber = returnNumber;
      r.poRef = poRef;
      r.supplier = supplier;
      r.date = date;
      r.reason = reason;
      r.status = status;
    }
  } else {
    const newId = returns.length ? Math.max(...returns.map((item) => item.id)) + 1 : 1;
    returns.push({ id: newId, returnNumber, poRef, supplier, date, reason, status });
  }
  closeModalById("returnModal");
  applyFilters();
}

function editReturn(id) {
  const r = returns.find((item) => item.id === id);
  if (r) openReturnModal("Edit Return", r);
}

// ============ Delete (ใช้ confirm.js) ============
function deleteReturn(id) {
  const r = returns.find((item) => item.id === id);
  if (!r) return;
  showConfirm({
    title: "Confirm Delete",
    message: "ต้องการลบรายการส่งคืน <strong>" + r.returnNumber + "</strong> ใช่ไหม?",
    okText: "Delete",
    okColor: "#ef4444",
    onConfirm: function () {
      returns = returns.filter((item) => item.id !== id);
      applyFilters();
    },
  });
}

// ============ Filter & Sort ============
let currentFilter = "all";
let currentSort = "default";

function getFilteredData() {
  const keyword = document.querySelector(".filter-search-input").value.toLowerCase();
  let data = returns;

  if (currentFilter !== "all") {
    data = data.filter((r) => r.status === currentFilter);
  }

  if (keyword) {
    data = data.filter(
      (r) =>
        r.returnNumber.toLowerCase().includes(keyword) ||
        r.poRef.toLowerCase().includes(keyword) ||
        r.supplier.toLowerCase().includes(keyword) ||
        r.reason.toLowerCase().includes(keyword)
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

  document.getElementById("addReturnBtn").addEventListener("click", function () {
    openReturnModal("Create Return", null);
  });

  renderTable(returns);
});
