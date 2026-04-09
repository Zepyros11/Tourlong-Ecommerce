// ============================================================
// stock-movement.js — logic เฉพาะหน้า Stock Movement
// ------------------------------------------------------------
// ใช้ร่วมกับ: modal.js, confirm.js
// ============================================================

// ============ Mock Database ============
let movements = [
  { id: 1,  date: "2026-04-01", product: "Wireless Headphones", type: "in",       warehouse: "คลังกลาง กรุงเทพ",  qty: 50,  note: "รับสินค้าจาก supplier" },
  { id: 2,  date: "2026-04-01", product: "Running Shoes",       type: "out",      warehouse: "คลังภาคเหนือ",       qty: 10,  note: "จ่ายออกตามออเดอร์" },
  { id: 3,  date: "2026-04-02", product: "Cotton T-Shirt",      type: "in",       warehouse: "คลังออนไลน์",        qty: 100, note: "รับเข้าล็อตใหม่" },
  { id: 4,  date: "2026-04-02", product: "Yoga Mat",            type: "transfer", warehouse: "คลังภาคใต้",         qty: 20,  note: "โอนจากคลังกลาง" },
  { id: 5,  date: "2026-04-03", product: "Protein Powder",      type: "out",      warehouse: "คลังกลาง กรุงเทพ",  qty: 15,  note: "จัดส่งลูกค้า" },
  { id: 6,  date: "2026-04-03", product: "Smart Watch",         type: "in",       warehouse: "คลังภาคเหนือ",       qty: 30,  note: "รับสินค้าใหม่" },
  { id: 7,  date: "2026-04-04", product: "Leather Wallet",      type: "out",      warehouse: "คลังออนไลน์",        qty: 8,   note: "ส่งออเดอร์ออนไลน์" },
  { id: 8,  date: "2026-04-05", product: "Face Serum",          type: "transfer", warehouse: "คลังกลาง กรุงเทพ",  qty: 25,  note: "โอนไปคลังภาคใต้" },
  { id: 9,  date: "2026-04-06", product: "Desk Lamp",           type: "in",       warehouse: "คลังภาคใต้",         qty: 40,  note: "เติมสต็อก" },
  { id: 10, date: "2026-04-07", product: "JavaScript Handbook", type: "out",      warehouse: "คลังออนไลน์",        qty: 5,   note: "จัดส่ง pre-order" },
];

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
