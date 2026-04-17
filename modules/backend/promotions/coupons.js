// ============================================================
// coupons.js — logic เฉพาะหน้า Coupons
// ------------------------------------------------------------
// ใช้ร่วมกับ: modal.js, confirm.js
// ============================================================

// ============ Mock Database ============
let coupons = [];

// ============ Update Stat Cards ============
function updateStats() {
  document.getElementById("statAll").textContent = coupons.length;
  document.getElementById("statActive").textContent = coupons.filter((c) => c.status === "active").length;
  document.getElementById("statExpired").textContent = coupons.filter((c) => c.status === "expired").length;
}

// ============ Render Table ============
function renderTable(data) {
  updateStats();
  const tbody = document.getElementById("couponTableBody");
  tbody.innerHTML = data
    .map(
      (c, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${c.code}</td>
      <td>${c.type === "percent" ? c.discount + "%" : "฿" + c.discount}</td>
      <td>${c.type === "percent" ? "Percent" : "Fixed"}</td>
      <td>฿${c.minPurchase.toLocaleString()}</td>
      <td>${c.used}/${c.limit}</td>
      <td>${c.expiry}</td>
      <td><span class="badge badge-${c.status === "active" ? "active" : "inactive"}">${c.status === "active" ? "Active" : "Expired"}</span></td>
      <td>
        <div class="table-actions">
          <button class="btn-icon-sm" onclick="editCoupon(${c.id})"><i data-lucide="pencil"></i></button>
          <button class="btn-icon-sm btn-danger" onclick="deleteCoupon(${c.id})"><i data-lucide="trash-2"></i></button>
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
function openCouponModal(title, c) {
  document.getElementById("modalTitle").textContent = title;
  document.getElementById("editId").value = c ? c.id : "";
  document.getElementById("inputCode").value = c ? c.code : "";
  document.getElementById("inputDiscount").value = c ? c.discount : "";
  document.getElementById("inputType").value = c ? c.type : "percent";
  document.getElementById("inputMinPurchase").value = c ? c.minPurchase : "";
  document.getElementById("inputLimit").value = c ? c.limit : "";
  document.getElementById("inputExpiry").value = c ? c.expiry : "";
  document.getElementById("inputStatus").checked = c ? c.status === "active" : true;
  var _lbl = document.getElementById("inputStatusLabel"); if(_lbl) { _lbl.textContent = (c ? c.status === "active" : true) ? "Active" : "Expired"; _lbl.classList.toggle("active-label", c ? c.status === "active" : true); }
  openModalById("couponModal", function () {
    document.getElementById("inputCode").focus();
  });
}

function saveCoupon() {
  const id = document.getElementById("editId").value;
  const code = document.getElementById("inputCode").value.trim();
  const discount = Number(document.getElementById("inputDiscount").value);
  const type = document.getElementById("inputType").value;
  const minPurchase = Number(document.getElementById("inputMinPurchase").value);
  const limit = Number(document.getElementById("inputLimit").value);
  const expiry = document.getElementById("inputExpiry").value;
  const status = document.getElementById("inputStatus").checked ? "active" : "expired";
  if (!code) return document.getElementById("inputCode").focus();

  if (id) {
    const c = coupons.find((item) => item.id === Number(id));
    if (c) {
      c.code = code;
      c.discount = discount;
      c.type = type;
      c.minPurchase = minPurchase;
      c.limit = limit;
      c.expiry = expiry;
      c.status = status;
    }
  } else {
    const newId = coupons.length ? Math.max(...coupons.map((item) => item.id)) + 1 : 1;
    coupons.push({ id: newId, code, discount, type, minPurchase, used: 0, limit, expiry, status });
  }
  closeModalById("couponModal");
  applyFilters();
}

function editCoupon(id) {
  const c = coupons.find((item) => item.id === id);
  if (c) openCouponModal("Edit Coupon", c);
}

// ============ Delete (ใช้ confirm.js) ============
function deleteCoupon(id) {
  const c = coupons.find((item) => item.id === id);
  if (!c) return;
  showConfirm({
    title: "Confirm Delete",
    message: "ต้องการลบคูปอง <strong>" + c.code + "</strong> ใช่ไหม?",
    okText: "Delete",
    okColor: "#ef4444",
    onConfirm: function () {
      coupons = coupons.filter((item) => item.id !== id);
      applyFilters();
    },
  });
}

// ============ Filter & Sort ============
let currentFilter = "all";
let currentSort = "default";

function getFilteredData() {
  const keyword = document.querySelector(".filter-search-input").value.toLowerCase();
  let data = coupons;

  if (currentFilter !== "all") {
    data = data.filter((c) => c.status === currentFilter);
  }

  if (keyword) {
    data = data.filter(
      (c) =>
        c.code.toLowerCase().includes(keyword)
    );
  }

  switch (currentSort) {
    case "name-asc":
      data = [...data].sort((a, b) => a.code.localeCompare(b.code));
      break;
    case "name-desc":
      data = [...data].sort((a, b) => b.code.localeCompare(a.code));
      break;
    case "discount-desc":
      data = [...data].sort((a, b) => b.discount - a.discount);
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

  document.getElementById("addCouponBtn").addEventListener("click", function () {
    openCouponModal("Add Coupon", null);
  });

  // Status toggle listener
  var statusToggle = document.getElementById("inputStatus");
  if (statusToggle) {
    statusToggle.addEventListener("change", function() {
      var lbl = document.getElementById("inputStatusLabel");
      if (lbl) { lbl.textContent = this.checked ? "Active" : "Expired"; lbl.classList.toggle("active-label", this.checked); }
    });
  }

  renderTable(coupons);
});
