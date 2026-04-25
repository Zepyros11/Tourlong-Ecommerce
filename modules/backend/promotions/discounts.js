// ============================================================
// discounts.js — Discounts (Supabase)
// ============================================================

var discounts = [];
var currentAppMode = "test";

function updateStats() {
  document.getElementById("statAll").textContent = discounts.length;
  document.getElementById("statActive").textContent = discounts.filter(function (d) { return d.status === "active"; }).length;
  document.getElementById("statInactive").textContent = discounts.filter(function (d) { return d.status === "inactive"; }).length;
}

function formatDiscount(d) {
  if (d.type === "percent") return d.discount + "%";
  return "฿" + Number(d.discount || 0).toLocaleString();
}

function applyToBadge(applyTo) {
  switch (applyTo) {
    case "all":      return '<span class="badge badge-active">ทั้งหมด</span>';
    case "category": return '<span class="badge" style="background-color:#eff6ff;color:#3b82f6;">หมวดหมู่</span>';
    case "product":  return '<span class="badge" style="background-color:#fffbeb;color:#f59e0b;">เฉพาะสินค้า</span>';
    default:         return '<span class="badge">' + applyTo + "</span>";
  }
}

function renderTable(data) {
  updateStats();
  var tbody = document.getElementById("discountTableBody");
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:30px;color:#94a3b8;font-size:11px;">ยังไม่มีส่วนลด</td></tr>';
    lucide.createIcons();
    return;
  }
  var showDelete = currentAppMode === "test";
  tbody.innerHTML = data.map(function (d, i) {
    var isActive = d.status === "active";
    var statusToggle =
      '<label class="toggle" title="' + (isActive ? "Active" : "Inactive") + '">' +
        '<input type="checkbox" ' + (isActive ? "checked" : "") + ' onchange="toggleDiscountStatus(' + d.id + ', this.checked)" />' +
        '<span class="toggle-slider"></span>' +
      '</label>';
    var deleteBtn = showDelete
      ? '<button class="btn-icon-sm btn-danger" onclick="deleteDiscount(' + d.id + ')"><i data-lucide="trash-2"></i></button>'
      : '';
    return '<tr>' +
      '<td>' + (i + 1) + '</td>' +
      '<td>' + (d.name || "") + '</td>' +
      '<td>' + formatDiscount(d) + '</td>' +
      '<td>' + applyToBadge(d.apply_to) + '</td>' +
      '<td>' + (d.start_date || "—") + '</td>' +
      '<td>' + (d.end_date || "—") + '</td>' +
      '<td>' + statusToggle + '</td>' +
      '<td><div class="table-actions">' +
        '<button class="btn-icon-sm" onclick="editDiscount(' + d.id + ')"><i data-lucide="pencil"></i></button>' +
        deleteBtn +
      '</div></td>' +
    '</tr>';
  }).join("");
  lucide.createIcons();
  if (typeof refreshSortableHeaders === "function") refreshSortableHeaders();
}

function openDiscountModal(title, d) {
  document.getElementById("modalTitle").textContent = title;
  document.getElementById("editId").value = d ? d.id : "";
  document.getElementById("inputName").value = d ? (d.name || "") : "";
  document.getElementById("inputDiscount").value = d ? d.discount : "";
  document.getElementById("inputType").value = d ? d.type : "percent";
  document.getElementById("inputApplyTo").value = d ? d.apply_to : "all";
  document.getElementById("inputStartDate").value = d ? (d.start_date || "") : "";
  document.getElementById("inputEndDate").value = d ? (d.end_date || "") : "";
  var active = d ? d.status === "active" : true;
  document.getElementById("inputStatus").checked = active;
  var lbl = document.getElementById("inputStatusLabel");
  if (lbl) { lbl.textContent = active ? "Active" : "Inactive"; lbl.classList.toggle("active-label", active); }
  openModalById("discountModal", function () { document.getElementById("inputName").focus(); });
}

function saveDiscount() {
  var id = document.getElementById("editId").value;
  var name = document.getElementById("inputName").value.trim();
  var discount = document.getElementById("inputDiscount").value.trim();
  var startDate = document.getElementById("inputStartDate").value;
  var endDate = document.getElementById("inputEndDate").value;

  if (!name) return document.getElementById("inputName").focus();
  if (!discount) return document.getElementById("inputDiscount").focus();
  if (!startDate) return document.getElementById("inputStartDate").focus();
  if (!endDate) return document.getElementById("inputEndDate").focus();

  var payload = {
    name: name,
    type: document.getElementById("inputType").value,
    discount: Number(discount),
    apply_to: document.getElementById("inputApplyTo").value,
    start_date: startDate,
    end_date: endDate,
    status: document.getElementById("inputStatus").checked ? "active" : "inactive",
  };

  var op = id ? updateDiscountDB(Number(id), payload) : createDiscountDB(payload);
  op.then(function () { return reloadDiscounts(); })
    .then(function () {
      closeModalById("discountModal");
      applyFilters();
    })
    .catch(function (err) { console.error(err); });
}

function editDiscount(id) {
  var d = discounts.find(function (x) { return x.id === id; });
  if (d) openDiscountModal("Edit Discount", d);
}

function toggleDiscountStatus(id, isActive) {
  var newStatus = isActive ? "active" : "inactive";
  updateDiscountDB(id, { status: newStatus })
    .then(function () { return reloadDiscounts(); })
    .then(function () { applyFilters(); })
    .catch(function (err) {
      console.error(err);
      if (typeof showToast === "function") showToast("ผิดพลาด", "เปลี่ยนสถานะไม่สำเร็จ", "error");
    });
}

function deleteDiscount(id) {
  var d = discounts.find(function (x) { return x.id === id; });
  if (!d) return;
  showConfirm({
    title: "Confirm Delete",
    message: "ต้องการลบส่วนลด <strong>" + d.name + "</strong> ใช่ไหม?",
    okText: "Delete", okColor: "#ef4444",
    onConfirm: function () {
      deleteDiscountDB(id)
        .then(function () { return reloadDiscounts(); })
        .then(function () { applyFilters(); })
        .catch(function (err) { console.error(err); });
    },
  });
}

var currentFilter = "all";
var currentSort = "default";

function getFilteredData() {
  var keyword = document.querySelector(".filter-search-input").value.toLowerCase();
  var data = discounts.slice();
  if (currentFilter !== "all") data = data.filter(function (d) { return d.status === currentFilter; });
  if (keyword) data = data.filter(function (d) { return (d.name || "").toLowerCase().includes(keyword); });
  switch (currentSort) {
    case "name-asc":  data = data.slice().sort(function (a, b) { return (a.name || "").localeCompare(b.name || ""); }); break;
    case "name-desc": data = data.slice().sort(function (a, b) { return (b.name || "").localeCompare(a.name || ""); }); break;
  }
  return data;
}

function applyFilters() { renderTable(getFilteredData()); }

function reloadDiscounts() {
  return (typeof fetchDiscountsDB === "function" ? fetchDiscountsDB() : Promise.resolve([]))
    .then(function (rows) {
      discounts = (rows || []).map(function (r) {
        return {
          id: r.id,
          name: r.name || "",
          type: r.type || "percent",
          discount: Number(r.discount) || 0,
          apply_to: r.apply_to || "all",
          start_date: r.start_date || "",
          end_date: r.end_date || "",
          status: r.status || "active",
        };
      });
    });
}

if (typeof registerRandomFill === "function") {
  registerRandomFill({
    target: "#discountModal",
    fill: function () {
      setFieldValue("inputName", "โปรโมชั่น " + randomProductName());
      var type = rdPick(["percent", "fixed"]);
      setFieldValue("inputType", type);
      setFieldValue("inputDiscount", type === "percent" ? rdInt(5, 50) : randomMoney(50, 500));
      setFieldValue("inputApplyTo", rdPick(["all", "category", "product"]));
      setFieldValue("inputStartDate", randomPastDate(30));
      setFieldValue("inputEndDate", randomFutureDate(60));
      var sw = document.getElementById("inputStatus");
      if (sw) { sw.checked = rdBool(0.85); sw.dispatchEvent(new Event("change", { bubbles: true })); }
    },
  });
}

document.addEventListener("DOMContentLoaded", function () {
  document.querySelector(".filter-search-input").addEventListener("input", applyFilters);

  document.querySelectorAll(".filter-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".filter-btn").forEach(function (b) { b.classList.remove("active"); });
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

  var statusToggle = document.getElementById("inputStatus");
  if (statusToggle) {
    statusToggle.addEventListener("change", function () {
      var lbl = document.getElementById("inputStatusLabel");
      if (lbl) { lbl.textContent = this.checked ? "Active" : "Inactive"; lbl.classList.toggle("active-label", this.checked); }
    });
  }

  var modeP = (typeof getAppMode === "function") ? getAppMode() : Promise.resolve("test");
  Promise.all([modeP, reloadDiscounts()])
    .then(function (results) {
      currentAppMode = results[0] || "test";
      applyFilters();
    })
    .catch(function (err) { console.error(err); applyFilters(); });
});
