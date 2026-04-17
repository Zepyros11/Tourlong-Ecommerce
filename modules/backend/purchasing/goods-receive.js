// ============================================================
// goods-receive.js — logic เฉพาะหน้า Goods Receive
// ------------------------------------------------------------
// ใช้ร่วมกับ: modal.js, confirm.js
// ============================================================

// ============ Mock Database ============
let goodsReceives = [];

// ============ Auto Generate GR Number ============
function generateGRNumber() {
  const maxNum = goodsReceives.reduce(function (max, gr) {
    const num = parseInt(gr.grNumber.split("-").pop(), 10);
    return num > max ? num : max;
  }, 0);
  return "GR-2026-" + String(maxNum + 1).padStart(3, "0");
}

// ============ Update Stat Cards ============
function updateStats() {
  document.getElementById("statAll").textContent = goodsReceives.length;
  document.getElementById("statCompleted").textContent = goodsReceives.filter((gr) => gr.status === "completed").length;
  document.getElementById("statPending").textContent = goodsReceives.filter((gr) => gr.status === "pending").length;
}

// ============ Render Table ============
function renderTable(data) {
  updateStats();
  const tbody = document.getElementById("grTableBody");
  tbody.innerHTML = data
    .map(
      (gr, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${gr.grNumber}</td>
      <td>${gr.poRef}</td>
      <td>${gr.supplier}</td>
      <td>${gr.date}</td>
      <td>${gr.items}</td>
      <td><span class="${gr.status === "completed" ? "badge badge-active" : "badge"}" style="${gr.status === "pending" ? "background-color:#fef3c7;color:#f59e0b;" : ""}">${gr.status === "completed" ? "Completed" : "Pending"}</span></td>
      <td>
        <div class="table-actions">
          <button class="btn-icon-sm" onclick="editGR(${gr.id})"><i data-lucide="pencil"></i></button>
          <button class="btn-icon-sm btn-danger" onclick="deleteGR(${gr.id})"><i data-lucide="trash-2"></i></button>
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
function openGRModal(title, gr) {
  document.getElementById("modalTitle").textContent = title;
  document.getElementById("editId").value = gr ? gr.id : "";
  document.getElementById("inputGRNumber").value = gr ? gr.grNumber : generateGRNumber();
  document.getElementById("inputPO").value = gr ? gr.poRef : "";
  document.getElementById("inputSupplier").value = gr ? gr.supplier : "";
  document.getElementById("inputDate").value = gr ? gr.date : "";
  document.getElementById("inputItems").value = gr ? gr.items : "";
  document.getElementById("inputStatus").value = gr ? gr.status : "pending";
  openModalById("grModal", function () {
    document.getElementById("inputPO").focus();
  });
}

function saveGR() {
  const id = document.getElementById("editId").value;
  const grNumber = document.getElementById("inputGRNumber").value.trim();
  const poRef = document.getElementById("inputPO").value;
  const supplier = document.getElementById("inputSupplier").value.trim();
  const date = document.getElementById("inputDate").value;
  const items = parseInt(document.getElementById("inputItems").value, 10) || 0;
  const status = document.getElementById("inputStatus").value;
  if (!poRef) return document.getElementById("inputPO").focus();

  if (id) {
    const gr = goodsReceives.find((item) => item.id === Number(id));
    if (gr) {
      gr.grNumber = grNumber;
      gr.poRef = poRef;
      gr.supplier = supplier;
      gr.date = date;
      gr.items = items;
      gr.status = status;
    }
  } else {
    const newId = goodsReceives.length ? Math.max(...goodsReceives.map((item) => item.id)) + 1 : 1;
    goodsReceives.push({ id: newId, grNumber, poRef, supplier, date, items, status });
  }
  closeModalById("grModal");
  applyFilters();
}

function editGR(id) {
  const gr = goodsReceives.find((item) => item.id === id);
  if (gr) openGRModal("Edit GR", gr);
}

// ============ Delete (ใช้ confirm.js) ============
function deleteGR(id) {
  const gr = goodsReceives.find((item) => item.id === id);
  if (!gr) return;
  showConfirm({
    title: "Confirm Delete",
    message: "ต้องการลบใบรับสินค้า <strong>" + gr.grNumber + "</strong> ใช่ไหม?",
    okText: "Delete",
    okColor: "#ef4444",
    onConfirm: function () {
      goodsReceives = goodsReceives.filter((item) => item.id !== id);
      applyFilters();
    },
  });
}

// ============ Filter & Sort ============
let currentFilter = "all";
let currentSort = "default";

function getFilteredData() {
  const keyword = document.querySelector(".filter-search-input").value.toLowerCase();
  let data = goodsReceives;

  if (currentFilter !== "all") {
    data = data.filter((gr) => gr.status === currentFilter);
  }

  if (keyword) {
    data = data.filter(
      (gr) =>
        gr.grNumber.toLowerCase().includes(keyword) ||
        gr.poRef.toLowerCase().includes(keyword) ||
        gr.supplier.toLowerCase().includes(keyword)
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

  document.getElementById("addGRBtn").addEventListener("click", function () {
    openGRModal("Create GR", null);
  });

  renderTable(goodsReceives);
});
