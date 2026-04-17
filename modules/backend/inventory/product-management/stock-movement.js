// ============================================================
// stock-movement.js — logic เฉพาะหน้า Stock Movement
// ------------------------------------------------------------
// ใช้ร่วมกับ: modal.js, confirm.js
// ============================================================

// ============ Mock Database ============
let movements = [];

// ============ Update Stat Cards ============
function updateStats() {
  document.getElementById("statAll").textContent = movements.length;
  document.getElementById("statIn").textContent = movements.filter((m) => m.type === "in").length;
  document.getElementById("statOut").textContent = movements.filter((m) => m.type === "out").length;
}

// ============ Render Table ============
function renderTable(data) {
  updateStats();
  const tbody = document.getElementById("movementTableBody");
  tbody.innerHTML = data
    .map(
      (m, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${m.date}</td>
      <td>${m.product}</td>
      <td>${
        m.type === "in"
          ? '<span class="badge badge-active">Stock In</span>'
          : m.type === "out"
            ? '<span class="badge badge-inactive">Stock Out</span>'
            : '<span class="badge" style="background-color:#fef3c7;color:#f59e0b">Transfer</span>'
      }</td>
      <td>${m.warehouse}</td>
      <td>${m.qty}</td>
      <td>${m.note}</td>
      <td>
        <div class="table-actions">
          <button class="btn-icon-sm" onclick="editMovement(${m.id})"><i data-lucide="pencil"></i></button>
          <button class="btn-icon-sm btn-danger" onclick="deleteMovement(${m.id})"><i data-lucide="trash-2"></i></button>
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
function openMovementModal(title, m) {
  document.getElementById("modalTitle").textContent = title;
  document.getElementById("editId").value = m ? m.id : "";
  document.getElementById("inputType").value = m ? m.type : "in";
  document.getElementById("inputProduct").value = m ? m.product : "Wireless Headphones";
  document.getElementById("inputWarehouse").value = m ? m.warehouse : "คลังกลาง กรุงเทพ";
  document.getElementById("inputQty").value = m ? m.qty : "";
  document.getElementById("inputNote").value = m ? m.note : "";
  openModalById("movementModal", function () {
    document.getElementById("inputType").focus();
  });
}

function saveMovement() {
  const id = document.getElementById("editId").value;
  const type = document.getElementById("inputType").value;
  const product = document.getElementById("inputProduct").value;
  const warehouse = document.getElementById("inputWarehouse").value;
  const qty = parseInt(document.getElementById("inputQty").value) || 0;
  const note = document.getElementById("inputNote").value.trim();
  if (!qty) return document.getElementById("inputQty").focus();

  if (id) {
    const m = movements.find((item) => item.id === Number(id));
    if (m) {
      m.type = type;
      m.product = product;
      m.warehouse = warehouse;
      m.qty = qty;
      m.note = note;
    }
  } else {
    const newId = movements.length ? Math.max(...movements.map((item) => item.id)) + 1 : 1;
    const today = new Date().toISOString().slice(0, 10);
    movements.push({ id: newId, date: today, type, product, warehouse, qty, note });
  }
  closeModalById("movementModal");
  applyFilters();
}

function editMovement(id) {
  const m = movements.find((item) => item.id === id);
  if (m) openMovementModal("Edit Movement", m);
}

// ============ Delete (ใช้ confirm.js) ============
function deleteMovement(id) {
  const m = movements.find((item) => item.id === id);
  if (!m) return;
  showConfirm({
    title: "Confirm Delete",
    message: "ต้องการลบรายการ <strong>" + m.product + "</strong> (" + m.date + ") ใช่ไหม?",
    okText: "Delete",
    okColor: "#ef4444",
    onConfirm: function () {
      movements = movements.filter((item) => item.id !== id);
      applyFilters();
    },
  });
}

// ============ Filter & Sort ============
let currentFilter = "all";
let currentSort = "default";

function getFilteredData() {
  const keyword = document.querySelector(".filter-search-input").value.toLowerCase();
  let data = movements;

  // Filter by type
  if (currentFilter !== "all") {
    data = data.filter((m) => m.type === currentFilter);
  }

  // Filter by search
  if (keyword) {
    data = data.filter(
      (m) =>
        m.product.toLowerCase().includes(keyword) ||
        m.warehouse.toLowerCase().includes(keyword) ||
        m.note.toLowerCase().includes(keyword)
    );
  }

  // Sort
  switch (currentSort) {
    case "date-desc":
      data = [...data].sort((a, b) => b.date.localeCompare(a.date));
      break;
    case "date-asc":
      data = [...data].sort((a, b) => a.date.localeCompare(b.date));
      break;
    case "qty-desc":
      data = [...data].sort((a, b) => b.qty - a.qty);
      break;
    case "qty-asc":
      data = [...data].sort((a, b) => a.qty - b.qty);
      break;
  }

  return data;
}

function applyFilters() {
  renderTable(getFilteredData());
}

// ============ Init ============
document.addEventListener("DOMContentLoaded", function () {
  // Search
  document.querySelector(".filter-search-input").addEventListener("input", applyFilters);

  // Filter buttons
  document.querySelectorAll(".filter-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
      this.classList.add("active");
      currentFilter = this.dataset.status;
      applyFilters();
    });
  });

  // Sort select
  document.getElementById("sortSelect").addEventListener("change", function () {
    currentSort = this.value;
    applyFilters();
  });

  // Add button
  document.getElementById("addMovementBtn").addEventListener("click", function () {
    openMovementModal("Add Movement", null);
  });

  // Render
  renderTable(movements);
});
