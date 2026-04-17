// ============================================================
// products-initial.js — logic เฉพาะหน้า Initial Stock
// ------------------------------------------------------------
// ใช้ร่วมกับ: modal.js, confirm.js
// ============================================================

// ============ Mock Database ============
let initialStocks = [];

// ============ Update Stat Cards ============
function updateStats() {
  document.getElementById("statAll").textContent = initialStocks.length;
  document.getElementById("statTotalUnits").textContent = initialStocks.reduce((sum, s) => sum + s.qty, 0).toLocaleString();
  var uniqueWarehouses = [...new Set(initialStocks.map((s) => s.warehouse))];
  document.getElementById("statWarehouses").textContent = uniqueWarehouses.length;
}

// ============ Render Table ============
function renderTable(data) {
  updateStats();
  const tbody = document.getElementById("initialTableBody");
  tbody.innerHTML = data
    .map(
      (s, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${s.product}</td>
      <td>${s.warehouse}</td>
      <td>${s.qty.toLocaleString()}</td>
      <td>฿${s.cost.toLocaleString()}</td>
      <td>฿${(s.qty * s.cost).toLocaleString()}</td>
      <td>${s.date}</td>
      <td>
        <div class="table-actions">
          <button class="btn-icon-sm" onclick="editInitial(${s.id})"><i data-lucide="pencil"></i></button>
          <button class="btn-icon-sm btn-danger" onclick="deleteInitial(${s.id})"><i data-lucide="trash-2"></i></button>
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
function openInitialModal(title, s) {
  document.getElementById("modalTitle").textContent = title;
  document.getElementById("editId").value = s ? s.id : "";
  document.getElementById("inputProduct").value = s ? s.product : "Wireless Headphones";
  document.getElementById("inputWarehouse").value = s ? s.warehouse : "คลังกลาง กรุงเทพ";
  document.getElementById("inputQty").value = s ? s.qty : "";
  document.getElementById("inputCost").value = s ? s.cost : "";
  openModalById("initialModal", function () {
    document.getElementById("inputQty").focus();
  });
}

function saveInitial() {
  const id = document.getElementById("editId").value;
  const product = document.getElementById("inputProduct").value;
  const warehouse = document.getElementById("inputWarehouse").value;
  const qty = parseInt(document.getElementById("inputQty").value) || 0;
  const cost = parseFloat(document.getElementById("inputCost").value) || 0;
  if (!qty) return document.getElementById("inputQty").focus();

  const today = new Date().toISOString().split("T")[0];

  if (id) {
    const s = initialStocks.find((item) => item.id === Number(id));
    if (s) {
      s.product = product;
      s.warehouse = warehouse;
      s.qty = qty;
      s.cost = cost;
    }
  } else {
    const newId = initialStocks.length ? Math.max(...initialStocks.map((item) => item.id)) + 1 : 1;
    initialStocks.push({ id: newId, product, warehouse, qty, cost, date: today });
  }
  closeModalById("initialModal");
  applyFilters();
}

function editInitial(id) {
  const s = initialStocks.find((item) => item.id === id);
  if (s) openInitialModal("Edit Initial Stock", s);
}

// ============ Delete (ใช้ confirm.js) ============
function deleteInitial(id) {
  const s = initialStocks.find((item) => item.id === id);
  if (!s) return;
  showConfirm({
    title: "Confirm Delete",
    message: "ต้องการลบรายการ <strong>" + s.product + "</strong> (" + s.warehouse + ") ใช่ไหม?",
    okText: "Delete",
    okColor: "#ef4444",
    onConfirm: function () {
      initialStocks = initialStocks.filter((item) => item.id !== id);
      applyFilters();
    },
  });
}

// ============ Filter & Sort ============
let currentWarehouse = "all";
let currentSort = "default";

function getFilteredData() {
  const keyword = document.querySelector(".filter-search-input").value.toLowerCase();
  let data = initialStocks;

  if (currentWarehouse !== "all") {
    data = data.filter((s) => s.warehouse === currentWarehouse);
  }

  if (keyword) {
    data = data.filter(
      (s) => s.product.toLowerCase().includes(keyword) || s.warehouse.toLowerCase().includes(keyword)
    );
  }

  switch (currentSort) {
    case "product-asc":
      data = [...data].sort((a, b) => a.product.localeCompare(b.product));
      break;
    case "product-desc":
      data = [...data].sort((a, b) => b.product.localeCompare(a.product));
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
  document.querySelector(".filter-search-input").addEventListener("input", applyFilters);

  document.getElementById("filterWarehouse").addEventListener("change", function () {
    currentWarehouse = this.value;
    applyFilters();
  });

  document.getElementById("sortSelect").addEventListener("change", function () {
    currentSort = this.value;
    applyFilters();
  });

  document.getElementById("addInitialBtn").addEventListener("click", function () {
    openInitialModal("Add Initial Stock", null);
  });

  renderTable(initialStocks);
});
