// ============================================================
// coupons.js — Coupons (Supabase)
// ============================================================

var coupons = [];

function updateStats() {
  document.getElementById("statAll").textContent = coupons.length;
  document.getElementById("statActive").textContent = coupons.filter(function (c) { return c.status === "active"; }).length;
  document.getElementById("statExpired").textContent = coupons.filter(function (c) { return c.status === "expired"; }).length;
}

function renderTable(data) {
  updateStats();
  var tbody = document.getElementById("couponTableBody");
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:30px;color:#94a3b8;font-size:11px;">ยังไม่มีคูปอง</td></tr>';
    lucide.createIcons();
    return;
  }
  tbody.innerHTML = data.map(function (c, i) {
    return '<tr>' +
      '<td>' + (i + 1) + '</td>' +
      '<td><strong>' + (c.code || "") + '</strong></td>' +
      '<td>' + (c.type === "percent" ? c.discount + "%" : "฿" + Number(c.discount || 0).toLocaleString()) + '</td>' +
      '<td>' + (c.type === "percent" ? "Percent" : "Fixed") + '</td>' +
      '<td>฿' + Number(c.min_purchase || 0).toLocaleString() + '</td>' +
      '<td>' + c.used + "/" + c.usage_limit + '</td>' +
      '<td>' + (c.expiry || "—") + '</td>' +
      '<td><span class="badge badge-' + (c.status === "active" ? "active" : "inactive") + '">' + (c.status === "active" ? "Active" : c.status === "expired" ? "Expired" : "Inactive") + '</span></td>' +
      '<td><div class="table-actions">' +
        '<button class="btn-icon-sm" onclick="editCoupon(' + c.id + ')"><i data-lucide="pencil"></i></button>' +
        '<button class="btn-icon-sm btn-danger" onclick="deleteCoupon(' + c.id + ')"><i data-lucide="trash-2"></i></button>' +
      '</div></td>' +
    '</tr>';
  }).join("");
  lucide.createIcons();
  if (typeof refreshSortableHeaders === "function") refreshSortableHeaders();
}

function openCouponModal(title, c) {
  document.getElementById("modalTitle").textContent = title;
  document.getElementById("editId").value = c ? c.id : "";
  document.getElementById("inputCode").value = c ? (c.code || "") : "";
  document.getElementById("inputDiscount").value = c ? c.discount : "";
  document.getElementById("inputType").value = c ? c.type : "percent";
  document.getElementById("inputMinPurchase").value = c ? c.min_purchase : "";
  document.getElementById("inputLimit").value = c ? c.usage_limit : "";
  document.getElementById("inputExpiry").value = c ? (c.expiry || "") : "";
  var active = c ? c.status === "active" : true;
  document.getElementById("inputStatus").checked = active;
  var lbl = document.getElementById("inputStatusLabel");
  if (lbl) { lbl.textContent = active ? "Active" : "Expired"; lbl.classList.toggle("active-label", active); }
  openModalById("couponModal", function () { document.getElementById("inputCode").focus(); });
}

function saveCoupon() {
  var id = document.getElementById("editId").value;
  var code = document.getElementById("inputCode").value.trim();
  if (!code) return document.getElementById("inputCode").focus();

  var payload = {
    code: code,
    type: document.getElementById("inputType").value,
    discount: Number(document.getElementById("inputDiscount").value) || 0,
    min_purchase: Number(document.getElementById("inputMinPurchase").value) || 0,
    usage_limit: Number(document.getElementById("inputLimit").value) || 0,
    expiry: document.getElementById("inputExpiry").value || null,
    status: document.getElementById("inputStatus").checked ? "active" : "expired",
  };

  var op = id ? updateCouponDB(Number(id), payload) : createCouponDB(payload);
  op.then(function () { return reloadCoupons(); })
    .then(function () {
      closeModalById("couponModal");
      applyFilters();
    })
    .catch(function (err) { console.error(err); });
}

function editCoupon(id) {
  var c = coupons.find(function (x) { return x.id === id; });
  if (c) openCouponModal("Edit Coupon", c);
}

function deleteCoupon(id) {
  var c = coupons.find(function (x) { return x.id === id; });
  if (!c) return;
  showConfirm({
    title: "Confirm Delete",
    message: "ต้องการลบคูปอง <strong>" + c.code + "</strong> ใช่ไหม?",
    okText: "Delete", okColor: "#ef4444",
    onConfirm: function () {
      deleteCouponDB(id)
        .then(function () { return reloadCoupons(); })
        .then(function () { applyFilters(); })
        .catch(function (err) { console.error(err); });
    },
  });
}

var currentFilter = "all";
var currentSort = "default";

function getFilteredData() {
  var keyword = document.querySelector(".filter-search-input").value.toLowerCase();
  var data = coupons.slice();
  if (currentFilter !== "all") data = data.filter(function (c) { return c.status === currentFilter; });
  if (keyword) data = data.filter(function (c) { return (c.code || "").toLowerCase().includes(keyword); });
  switch (currentSort) {
    case "code-asc":  data = data.slice().sort(function (a, b) { return (a.code || "").localeCompare(b.code || ""); }); break;
    case "code-desc": data = data.slice().sort(function (a, b) { return (b.code || "").localeCompare(a.code || ""); }); break;
  }
  return data;
}

function applyFilters() { renderTable(getFilteredData()); }

function reloadCoupons() {
  return (typeof fetchCouponsDB === "function" ? fetchCouponsDB() : Promise.resolve([]))
    .then(function (rows) {
      coupons = (rows || []).map(function (r) {
        return {
          id: r.id,
          code: r.code || "",
          type: r.type || "percent",
          discount: Number(r.discount) || 0,
          min_purchase: Number(r.min_purchase) || 0,
          usage_limit: Number(r.usage_limit) || 0,
          used: Number(r.used) || 0,
          expiry: r.expiry || "",
          status: r.status || "active",
        };
      });
    });
}

if (typeof registerRandomFill === "function") {
  registerRandomFill({
    target: "#couponModal",
    fill: function () {
      setFieldValue("inputCode", randomCouponCode());
      var type = rdPick(["percent", "fixed"]);
      setFieldValue("inputType", type);
      setFieldValue("inputDiscount", type === "percent" ? rdInt(5, 50) : randomMoney(50, 500));
      setFieldValue("inputMinPurchase", randomMoney(100, 2000));
      setFieldValue("inputLimit", rdInt(10, 500));
      setFieldValue("inputExpiry", randomFutureDate(60));
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

  document.getElementById("addCouponBtn").addEventListener("click", function () {
    openCouponModal("Add Coupon", null);
  });

  var statusToggle = document.getElementById("inputStatus");
  if (statusToggle) {
    statusToggle.addEventListener("change", function () {
      var lbl = document.getElementById("inputStatusLabel");
      if (lbl) { lbl.textContent = this.checked ? "Active" : "Expired"; lbl.classList.toggle("active-label", this.checked); }
    });
  }

  reloadCoupons()
    .then(function () { applyFilters(); })
    .catch(function (err) { console.error(err); applyFilters(); });
});
