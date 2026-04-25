// ============================================================
// promotion-packages.js — Promotion Packages list page (Supabase)
// ต้นทุน = GR ล่าสุดต่อสินค้า, กำไร = Revenue - Cost
// Create/Edit → promotion-package-form.html
// ============================================================

var packages = [];
var latestCosts = {}; // { product_id: cost }
var currentAppMode = "test";

function fmtMoney(n) { return "฿" + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtMoneyShort(n) { return "฿" + Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 }); }

function pkgTotals(p) {
  var revenue = 0, cost = 0;
  (p.promotion_package_items || []).forEach(function (it) {
    var qty = Number(it.qty) || 0;
    revenue += qty * (Number(it.promo_price) || 0);
    cost += qty * (Number(latestCosts[it.product_id]) || 0);
  });
  return { revenue: revenue, cost: cost, profit: revenue - cost };
}

function updateStats() {
  document.getElementById("statAll").textContent = packages.length;
  document.getElementById("statActive").textContent = packages.filter(function (p) { return p.status === "active"; }).length;
  document.getElementById("statInactive").textContent = packages.filter(function (p) { return p.status === "inactive"; }).length;
  var totalProfit = packages.reduce(function (s, p) { return s + pkgTotals(p).profit; }, 0);
  document.getElementById("statProfit").textContent = fmtMoneyShort(totalProfit);
}

function getStatusBadge(status) {
  return status === "active"
    ? '<span class="badge badge-active">Active</span>'
    : '<span class="badge badge-inactive">Inactive</span>';
}

function renderTable(data) {
  updateStats();
  var tbody = document.getElementById("pkgTableBody");
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:30px;color:#94a3b8;font-size:11px;">ยังไม่มีแพ็คเกจโปรโมชั่น</td></tr>';
    lucide.createIcons();
    return;
  }
  var showDelete = currentAppMode === "test";
  tbody.innerHTML = data.map(function (p, i) {
    var t = pkgTotals(p);
    var itemCount = (p.promotion_package_items || []).length;
    var profitColor = t.profit >= 0 ? "#10b981" : "#ef4444";
    var isActive = p.status === "active";
    var statusToggle =
      '<label class="toggle" title="' + (isActive ? "Active" : "Inactive") + '">' +
        '<input type="checkbox" ' + (isActive ? "checked" : "") + ' onchange="togglePkgStatus(' + p.id + ', this.checked)" />' +
        '<span class="toggle-slider"></span>' +
      '</label>';
    var deleteBtn = showDelete
      ? '<button class="btn-icon-sm btn-danger" onclick="deletePkg(' + p.id + ')"><i data-lucide="trash-2"></i></button>'
      : '';
    return '<tr>' +
      '<td>' + (i + 1) + '</td>' +
      '<td><strong>' + (p.name || "") + '</strong></td>' +
      '<td>' + itemCount + '</td>' +
      '<td>' + (p.start_date || "—") + '</td>' +
      '<td>' + (p.end_date || "—") + '</td>' +
      '<td style="text-align:right;">' + fmtMoney(t.revenue) + '</td>' +
      '<td style="text-align:right;color:#ef4444;">' + fmtMoney(t.cost) + '</td>' +
      '<td style="text-align:right;color:' + profitColor + ';font-weight:700;">' + fmtMoney(t.profit) + '</td>' +
      '<td>' + statusToggle + '</td>' +
      '<td><div class="table-actions">' +
        '<button class="btn-icon-sm" onclick="editPkg(' + p.id + ')"><i data-lucide="pencil"></i></button>' +
        deleteBtn +
      '</div></td>' +
    '</tr>';
  }).join("");
  lucide.createIcons();
  if (typeof refreshSortableHeaders === "function") refreshSortableHeaders();
}

function editPkg(id) {
  window.location.href = "promotion-package-form.html?id=" + id;
}

function togglePkgStatus(id, isActive) {
  var newStatus = isActive ? "active" : "inactive";
  fetch(SUPABASE_URL + "/rest/v1/promotion_packages?id=eq." + id, {
    method: "PATCH",
    headers: supabaseHeaders,
    body: JSON.stringify({ status: newStatus }),
  })
    .then(function () { return reloadPackages(); })
    .then(function () { applyFilters(); })
    .catch(function (err) {
      console.error(err);
      if (typeof showToast === "function") showToast("ผิดพลาด", "เปลี่ยนสถานะไม่สำเร็จ", "error");
    });
}

function deletePkg(id) {
  var p = packages.find(function (x) { return x.id === id; });
  if (!p) return;
  showConfirm({
    title: "Confirm Delete",
    message: "ต้องการลบแพ็คเกจ <strong>" + p.name + "</strong> ใช่ไหม?",
    okText: "Delete",
    okColor: "#ef4444",
    onConfirm: function () {
      deletePromotionPackageDB(id)
        .then(function () { return reloadPackages(); })
        .then(function () { applyFilters(); if (typeof showToast === "function") showToast("ลบแพ็คเกจสำเร็จ", "success"); })
        .catch(function (err) { console.error(err); });
    },
  });
}

// ============ Filter & Sort ============
var currentFilter = "all";
var currentSort = "default";

function getFilteredData() {
  var keyword = document.querySelector(".filter-search-input").value.toLowerCase();
  var data = packages.slice();
  if (currentFilter !== "all") data = data.filter(function (p) { return p.status === currentFilter; });
  if (keyword) data = data.filter(function (p) { return (p.name || "").toLowerCase().includes(keyword); });
  switch (currentSort) {
    case "name-asc":    data = data.slice().sort(function (a, b) { return (a.name || "").localeCompare(b.name || ""); }); break;
    case "name-desc":   data = data.slice().sort(function (a, b) { return (b.name || "").localeCompare(a.name || ""); }); break;
    case "profit-desc": data = data.slice().sort(function (a, b) { return pkgTotals(b).profit - pkgTotals(a).profit; }); break;
    case "profit-asc":  data = data.slice().sort(function (a, b) { return pkgTotals(a).profit - pkgTotals(b).profit; }); break;
  }
  return data;
}

function applyFilters() { renderTable(getFilteredData()); }

function reloadPackages() {
  return Promise.all([
    typeof fetchLatestProductCosts === "function" ? fetchLatestProductCosts() : Promise.resolve({}),
    typeof fetchPromotionPackagesDB === "function" ? fetchPromotionPackagesDB() : Promise.resolve([]),
  ]).then(function (res) {
    latestCosts = res[0] || {};
    packages = (res[1] || []).map(normalizePkg);
  });
}

function normalizePkg(p) {
  return {
    id: p.id,
    name: p.name || "",
    start_date: p.start_date || "",
    end_date: p.end_date || "",
    status: p.status || "active",
    note: p.note || "",
    promotion_package_items: p.promotion_package_items || [],
  };
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

  var modeP = (typeof getAppMode === "function") ? getAppMode() : Promise.resolve("test");
  Promise.all([modeP, reloadPackages()])
    .then(function (results) {
      currentAppMode = results[0] || "test";
      applyFilters();
    })
    .catch(function (err) { console.error(err); applyFilters(); });
});
