// ============================================================
// promotion-package-form.js — Add/Edit Promotion Package (separate page)
// URL: promotion-package-form.html?id=<id> (edit mode), or no param (create)
// ============================================================

var editId = null;
var allProducts = [];
var latestCosts = {};
var loadedPkg = null;

function fmtMoney(n) { return "฿" + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function buildProductOptions(selectedId) {
  return '<option value="">— เลือกสินค้า —</option>' + allProducts.map(function (p) {
    var sel = selectedId && Number(selectedId) === p.id ? ' selected' : '';
    return '<option value="' + p.id + '" data-price="' + (p.price || 0) + '"' + sel + '>' + p.name + '</option>';
  }).join("");
}

function addPkgItemRow(data) {
  var tbody = document.getElementById("pkgItemsBody");
  var tr = document.createElement("tr");
  var d = data || {};
  tr.innerHTML =
    '<td><select class="form-select pkg-product" onchange="onPkgProductChange(this)" style="padding:8px 10px;font-size:10px;">' + buildProductOptions(d.product_id) + '</select></td>' +
    '<td><input type="number" class="form-input pkg-qty" value="' + (d.qty || "") + '" min="0" step="any" placeholder="0" oninput="recalcTotals()" style="padding:8px 10px;font-size:10px;text-align:right;" /></td>' +
    '<td style="text-align:right;color:#ef4444;font-weight:700;" class="pkg-cost-unit">฿0.00</td>' +
    '<td><input type="number" class="form-input pkg-price" value="' + (d.promo_price || "") + '" min="0" step="0.01" placeholder="0.00" oninput="recalcTotals()" style="padding:8px 10px;font-size:10px;text-align:right;" /></td>' +
    '<td style="text-align:right;color:#ef4444;" class="pkg-sub-cost">฿0.00</td>' +
    '<td style="text-align:right;color:#1e293b;" class="pkg-sub-revenue">฿0.00</td>' +
    '<td style="text-align:right;font-weight:700;" class="pkg-profit">฿0.00</td>' +
    '<td><button class="btn-icon-sm btn-danger" type="button" onclick="removePkgItemRow(this)" style="width:24px;height:24px;"><i data-lucide="x" style="width:11px;height:11px;"></i></button></td>';
  tbody.appendChild(tr);
  lucide.createIcons();
  updateRowCostUnit(tr);
  updateEmptyHint();
  recalcTotals();
}

function removePkgItemRow(btn) {
  btn.closest("tr").remove();
  updateEmptyHint();
  recalcTotals();
}

function updateEmptyHint() {
  var hasRows = document.querySelectorAll("#pkgItemsBody tr").length > 0;
  document.getElementById("emptyHint").style.display = hasRows ? "none" : "block";
}

function updateRowCostUnit(tr) {
  var pid = Number(tr.querySelector(".pkg-product").value);
  var cost = pid ? (Number(latestCosts[pid]) || 0) : 0;
  tr.querySelector(".pkg-cost-unit").textContent = fmtMoney(cost);
  tr.setAttribute("data-cost", cost);
}

function onPkgProductChange(select) {
  var tr = select.closest("tr");
  var opt = select.options[select.selectedIndex];
  var defaultPrice = opt ? Number(opt.getAttribute("data-price")) || 0 : 0;
  var priceInput = tr.querySelector(".pkg-price");
  if (defaultPrice && !priceInput.value) priceInput.value = defaultPrice;
  updateRowCostUnit(tr);
  recalcTotals();

  var pid = Number(select.value);
  if (pid && latestCosts[pid] == null && typeof showToast === "function") {
    showToast("สินค้านี้ยังไม่เคยรับเข้าคลัง — ต้นทุน = 0", "warning");
  }
}

function recalcTotals() {
  var revenue = 0, cost = 0;
  document.querySelectorAll("#pkgItemsBody tr").forEach(function (tr) {
    var qty = parseFloat(tr.querySelector(".pkg-qty").value) || 0;
    var price = parseFloat(tr.querySelector(".pkg-price").value) || 0;
    var unitCost = parseFloat(tr.getAttribute("data-cost")) || 0;
    var subRevenue = qty * price;
    var subCost = qty * unitCost;
    var profit = subRevenue - subCost;
    tr.querySelector(".pkg-sub-revenue").textContent = fmtMoney(subRevenue);
    tr.querySelector(".pkg-sub-cost").textContent = fmtMoney(subCost);
    var profitCell = tr.querySelector(".pkg-profit");
    profitCell.textContent = fmtMoney(profit);
    profitCell.style.color = profit >= 0 ? "#10b981" : "#ef4444";
    revenue += subRevenue;
    cost += subCost;
  });
  var profit = revenue - cost;
  var margin = revenue > 0 ? (profit / revenue) * 100 : 0;
  document.getElementById("sumRevenue").textContent = fmtMoney(revenue);
  document.getElementById("sumCost").textContent = fmtMoney(cost);
  var profitEl = document.getElementById("sumProfit");
  profitEl.textContent = fmtMoney(profit);
  profitEl.style.color = profit >= 0 ? "#10b981" : "#ef4444";
  document.getElementById("sumMargin").textContent = margin.toFixed(1) + "%";
}

function collectItems() {
  var items = [];
  document.querySelectorAll("#pkgItemsBody tr").forEach(function (tr) {
    var pid = Number(tr.querySelector(".pkg-product").value);
    var qty = parseFloat(tr.querySelector(".pkg-qty").value);
    var price = parseFloat(tr.querySelector(".pkg-price").value);
    if (pid && qty > 0 && price >= 0) items.push({ product_id: pid, qty: qty, promo_price: price });
  });
  return items;
}

function alertMsg(title, message) {
  if (typeof showConfirm === "function") {
    showConfirm({ title: title, message: message, okText: "OK", okColor: "#47b8b4", onConfirm: function () {} });
  }
}

function savePkg() {
  var name = document.getElementById("inputName").value.trim();
  var startDate = document.getElementById("inputStartDate").value || null;
  var endDate = document.getElementById("inputEndDate").value || null;
  var status = document.getElementById("inputStatus").checked ? "active" : "inactive";
  var note = document.getElementById("inputNote").value.trim();
  var items = collectItems();

  if (!name) { alertMsg("ไม่ครบถ้วน", "กรุณาระบุชื่อแพ็คเกจ"); document.getElementById("inputName").focus(); return; }
  if (!items.length) { alertMsg("ไม่ถูกต้อง", "กรุณาเพิ่มสินค้าอย่างน้อย 1 รายการ"); return; }

  var header = {
    name: name,
    start_date: startDate,
    end_date: endDate,
    status: status,
    note: note || null,
  };

  var overlay = document.getElementById("savingOverlay");
  if (overlay) overlay.style.display = "flex";

  var op = editId
    ? updatePromotionPackageDB(editId, header, items)
    : createPromotionPackageDB(header, items);

  op.then(function () {
      if (typeof showToast === "function") showToast("บันทึกแพ็คเกจสำเร็จ", "success");
      setTimeout(function () { window.location.href = "promotion-packages.html"; }, 400);
    })
    .catch(function (err) {
      if (overlay) overlay.style.display = "none";
      console.error(err);
      alertMsg("เกิดข้อผิดพลาด", err.message || "บันทึกไม่สำเร็จ");
    });
}

function populateForm(p) {
  document.getElementById("inputName").value = p.name || "";
  document.getElementById("inputStartDate").value = p.start_date || "";
  document.getElementById("inputEndDate").value = p.end_date || "";
  document.getElementById("inputStatus").checked = (p.status || "active") === "active";
  document.getElementById("inputNote").value = p.note || "";

  var tbody = document.getElementById("pkgItemsBody");
  tbody.innerHTML = "";
  var items = p.promotion_package_items || [];
  if (items.length) items.forEach(function (it) { addPkgItemRow({ product_id: it.product_id, qty: it.qty, promo_price: it.promo_price }); });
  updateEmptyHint();
  recalcTotals();
}

function loadPackageById(id) {
  return fetchPromotionPackagesDB().then(function (rows) {
    var p = (rows || []).find(function (x) { return Number(x.id) === Number(id); });
    return p || null;
  });
}

// ============ Random fill (dev) ============
if (typeof registerRandomFill === "function") {
  registerRandomFill({
    target: "page",
    fill: function () {
      if (!allProducts.length) {
        if (typeof showToast === "function") showToast("ยังไม่มีสินค้า", "warning");
        return;
      }
      setFieldValue("inputName", "แพ็คเกจ" + randomCategoryName() + "รวม " + rdInt(2, 5) + " ชิ้น");
      setFieldValue("inputStartDate", randomPastDate(15));
      setFieldValue("inputEndDate", randomFutureDate(60));
      setFieldValue("inputNote", randomNote());
      setCheckboxValue("inputStatus", rdBool(0.85));
      document.getElementById("pkgItemsBody").innerHTML = "";
      var n = rdInt(2, 4);
      for (var i = 0; i < n; i++) {
        var p = rdPick(allProducts);
        addPkgItemRow({ product_id: p.id, qty: rdInt(1, 5), promo_price: rdFloat(50, p.price || 500, 2) });
      }
    },
  });
}

document.addEventListener("DOMContentLoaded", function () {
  var params = new URLSearchParams(window.location.search);
  var id = params.get("id");

  Promise.all([
    typeof fetchProducts === "function" ? fetchProducts() : Promise.resolve([]),
    typeof fetchLatestProductCosts === "function" ? fetchLatestProductCosts() : Promise.resolve({}),
  ]).then(function (res) {
    allProducts = (res[0] || []).map(function (p) { return { id: p.id, name: p.name || "", price: Number(p.price) || 0 }; });
    latestCosts = res[1] || {};

    if (id) {
      editId = Number(id);
      document.getElementById("pageTitle").textContent = "Edit Package";
      document.getElementById("pageSubtitle").textContent = "แก้ไขแพ็คเกจโปรโมชั่น";
      return loadPackageById(editId).then(function (p) {
        if (!p) { alertMsg("ไม่พบข้อมูล", "ไม่พบแพ็คเกจที่ต้องการแก้ไข"); return; }
        loadedPkg = p;
        populateForm(p);
      });
    } else {
      // create mode: start with one empty row
      addPkgItemRow();
    }
  }).catch(function (err) { console.error(err); });
});
