// ============================================================
// discounts.js — logic เฉพาะหน้า Discounts
// ------------------------------------------------------------
// ใช้ร่วมกับ: modal.js, confirm.js
// ============================================================

// ============ Mock Database ============
let discounts = [];

// ============ Update Stat Cards ============
function updateStats() {
  document.getElementById("statAll").textContent = discounts.length;
  document.getElementById("statActive").textContent = discounts.filter((d) => d.status === "active").length;
  document.getElementById("statInactive").textContent = discounts.filter((d) => d.status === "inactive").length;
}

// ============ Discount Display ============
function formatDiscount(d) {
  if (d.type === "percent") return d.discount + "%";
  return "฿" + d.discount;
}

// ============ ApplyTo Badge ============
function applyToBadge(applyTo) {
  switch (applyTo) {
    case "all":      return '<span class="badge badge-active">ทั้งหมด</span>';
    case "category": return '<span class="badge" style="background-color: #eff6ff; color: #3b82f6;">หมวดหมู่</span>';
    case "product":  return '<span class="badge" style="background-color: #fffbeb; color: #f59e0b;">เฉพาะสินค้า</span>';
    default:         return '<span class="badge">' + applyTo + "</span>";
  }
}

// ============ Render Table ============
function renderTable(data) {
  updateStats();
  const tbody = document.getElementById("discountTableBody");
  tbody.innerHTML = data
    .map(
      (d, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${d.name}</td>
      <td>${formatDiscount(d)}</td>
      <td>${applyToBadge(d.applyTo)}</td>
      <td>${d.startDate}</td>
      <td>${d.endDate}</td>
      <td><span class="badge badge-${d.status === "active" ? "active" : "inactive"}">${d.status === "active" ? "Active" : "Inactive"}</span></td>
      <td>
        <div class="table-actions">
          <button class="btn-icon-sm" onclick="editDiscount(${d.id})"><i data-lucide="pencil"></i></button>
          <button class="btn-icon-sm btn-danger" onclick="deleteDiscount(${d.id})"><i data-lucide="trash-2"></i></button>
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
function openDiscountModal(title, d) {
  document.getElementById("modalTitle").textContent = title;
  document.getElementById("editId").value = d ? d.id : "";
  document.getElementById("inputName").value = d ? d.name : "";
  document.getElementById("inputDiscount").value = d ? d.discount : "";
  document.getElementById("inputType").value = d ? d.type : "percent";
  document.getElementById("inputApplyTo").value = d ? d.applyTo : "all";
  document.getElementById("inputStartDate").value = d ? d.startDate : "";
  document.getElementById("inputEndDate").value = d ? d.endDate : "";
  document.getElementById("inputStatus").checked = d ? d.status === "active" : true;
  var _lbl = document.getElementById("inputStatusLabel"); if(_lbl) { _lbl.textContent = (d ? d.status === "active" : true) ? "Active" : "Inactive"; _lbl.classList.toggle("active-label", d ? d.status === "active" : true); }
  openModalById("discountModal", function () {
    document.getElementById("inputName").focus();
  });
}

function saveDiscount() {
  const id = document.getElementById("editId").value;
  const name = document.getElementById("inputName").value.trim();
  const discount = document.getElementById("inputDiscount").value.trim();
  const type = document.getElementById("inputType").value;
  const applyTo = document.getElementById("inputApplyTo").value;
  const startDate = document.getElementById("inputStartDate").value;
  const endDate = document.getElementById("inputEndDate").value;
  const status = document.getElementById("inputStatus").checked ? "active" : "inactive";
  if (!name) return document.getElementById("inputName").focus();
  if (!discount) return document.getElementById("inputDiscount").focus();
  if (!startDate) return document.getElementById("inputStartDate").focus();
  if (!endDate) return document.getElementById("inputEndDate").focus();

  if (id) {
    const d = discounts.find((item) => item.id === Number(id));
    if (d) {
      d.name = name;
      d.discount = Number(discount);
      d.type = type;
      d.applyTo = applyTo;
      d.startDate = startDate;
      d.endDate = endDate;
      d.status = status;
    }
  } else {
    const newId = discounts.length ? Math.max(...discounts.map((item) => item.id)) + 1 : 1;
    discounts.push({ id: newId, name, discount: Number(discount), type, applyTo, startDate, endDate, status });
  }
  closeModalById("discountModal");
  applyFilters();
}

function editDiscount(id) {
  const d = discounts.find((item) => item.id === id);
  if (d) openDiscountModal("Edit Discount", d);
}

// ============ Delete (ใช้ confirm.js) ============
function deleteDiscount(id) {
  const d = discounts.find((item) => item.id === id);
  if (!d) return;
  showConfirm({
    title: "Confirm Delete",
    message: "ต้องการลบโปรโมชั่น <strong>" + d.name + "</strong> ใช่ไหม?",
    okText: "Delete",
    okColor: "#ef4444",
    onConfirm: function () {
      discounts = discounts.filter((item) => item.id !== id);
      applyFilters();
    },
  });
}

// ============ Filter & Sort ============
let currentFilter = "all";
let currentSort = "default";

function getFilteredData() {
  const keyword = document.querySelector(".filter-search-input").value.toLowerCase();
  let data = discounts;

  if (currentFilter !== "all") {
    data = data.filter((d) => d.status === currentFilter);
  }

  if (keyword) {
    data = data.filter(
      (d) =>
        d.name.toLowerCase().includes(keyword)
    );
  }

  switch (currentSort) {
    case "name-asc":
      data = [...data].sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "name-desc":
      data = [...data].sort((a, b) => b.name.localeCompare(a.name));
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

  document.getElementById("addDiscountBtn").addEventListener("click", function () {
    openDiscountModal("Add Discount", null);
  });

  // Status toggle listener
  var statusToggle = document.getElementById("inputStatus");
  if (statusToggle) {
    statusToggle.addEventListener("change", function() {
      var lbl = document.getElementById("inputStatusLabel");
      if (lbl) { lbl.textContent = this.checked ? "Active" : "Inactive"; lbl.classList.toggle("active-label", this.checked); }
    });
  }

  renderTable(discounts);
});
