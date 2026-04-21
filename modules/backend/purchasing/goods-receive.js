// ============================================================
// goods-receive.js — Goods Receipts List (ตาราง GR)
// form อยู่ที่ goods-receive-form.html / goods-receive-form.js
// ============================================================

var goodsReceipts = [];

// ============ Helpers ============
function fmtMoney(n) { return "฿" + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function getStatusBadge(status) {
  switch (status) {
    case "completed": return '<span class="badge badge-active">สำเร็จ</span>';
    case "partial":   return '<span class="badge" style="background-color:#ffedd5;color:#ea580c;">รับบางส่วน</span>';
    case "pending":   return '<span class="badge" style="background-color:#fef3c7;color:#f59e0b;">รอดำเนินการ</span>';
    case "cancelled": return '<span class="badge badge-inactive">ยกเลิก</span>';
    default: return '<span class="badge">' + status + '</span>';
  }
}

// ============ Stats ============
function updateStats() {
  document.getElementById("statAll").textContent = goodsReceipts.length;
  document.getElementById("statCompleted").textContent = goodsReceipts.filter(function (g) { return g.status === "completed"; }).length;
  document.getElementById("statPartial").textContent = goodsReceipts.filter(function (g) { return g.status === "partial"; }).length;
  document.getElementById("statPending").textContent = goodsReceipts.filter(function (g) { return g.status === "pending"; }).length;
}

// ============ Render ============
function renderTable(data) {
  updateStats();
  var tbody = document.getElementById("grTableBody");
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:30px;color:#94a3b8;font-size:11px;">ยังไม่มีใบรับสินค้า</td></tr>';
    lucide.createIcons();
    return;
  }
  tbody.innerHTML = data.map(function (g, i) {
    var poRef = g.purchase_orders ? g.purchase_orders.po_number : "—";
    var supplier = g.suppliers ? g.suppliers.name : "—";
    var itemCount = g.goods_receipt_items ? g.goods_receipt_items.length : 0;
    return '<tr>' +
      '<td>' + (i + 1) + '</td>' +
      '<td><strong>' + g.gr_number + '</strong></td>' +
      '<td>' + poRef + '</td>' +
      '<td>' + supplier + '</td>' +
      '<td>' + (g.date || "—") + '</td>' +
      '<td>' + itemCount + '</td>' +
      '<td>' + getStatusBadge(g.status) + '</td>' +
      '<td><div class="table-actions">' +
        '<button class="btn-icon-sm" onclick="editGR(' + g.id + ')" title="แก้ไข"><i data-lucide="pencil"></i></button>' +
        '<button class="btn-icon-sm btn-danger" onclick="deleteGR(' + g.id + ')" title="ลบ"><i data-lucide="trash-2"></i></button>' +
      '</div></td>' +
    '</tr>';
  }).join("");
  lucide.createIcons();
  if (typeof refreshSortableHeaders === "function") refreshSortableHeaders();
}

// ============ Edit → ไปหน้า form ============
function editGR(id) {
  window.location.href = "goods-receive-form.html?id=" + id;
}

// ============ Delete ============
function deleteGR(id) {
  var g = goodsReceipts.find(function (x) { return x.id === id; });
  if (!g) return;
  var msg = "ต้องการลบใบรับสินค้า <strong>" + g.gr_number + "</strong> ใช่ไหม?";
  if (g.status === "completed") msg += "<br><br><span style='color:#ef4444;font-size:10px;'>⚠️ GR นี้เคย update stock แล้ว — ระบบจะสร้าง movement reverse อัตโนมัติ</span>";
  showConfirm({
    title: "Confirm Delete",
    message: msg,
    okText: "Delete",
    okColor: "#ef4444",
    onConfirm: function () {
      deleteGoodsReceiptDB(id)
        .then(function () { return reloadGRs(); })
        .then(function () { applyFilters(); })
        .catch(function (err) { console.error(err); });
    },
  });
}

// ============ Filter & Sort ============
var currentFilter = "all";
var currentSort = "default";

function getFilteredData() {
  var keyword = document.querySelector(".filter-search-input").value.toLowerCase();
  var data = goodsReceipts.slice();

  if (currentFilter !== "all") data = data.filter(function (g) { return g.status === currentFilter; });

  if (keyword) {
    data = data.filter(function (g) {
      var poRef = g.purchase_orders ? g.purchase_orders.po_number.toLowerCase() : "";
      var sName = g.suppliers ? g.suppliers.name.toLowerCase() : "";
      return (g.gr_number || "").toLowerCase().includes(keyword) || poRef.includes(keyword) || sName.includes(keyword);
    });
  }

  switch (currentSort) {
    case "date-desc": data = data.slice().sort(function (a, b) { return (b.date || "").localeCompare(a.date || ""); }); break;
    case "date-asc":  data = data.slice().sort(function (a, b) { return (a.date || "").localeCompare(b.date || ""); }); break;
  }
  return data;
}

function applyFilters() { renderTable(getFilteredData()); }

// ============ Load ============
function reloadGRs() {
  return (typeof fetchGoodsReceiptsDB === "function" ? fetchGoodsReceiptsDB() : Promise.resolve([]))
    .then(function (rows) { goodsReceipts = (rows || []).map(normalizeGR); });
}

function normalizeGR(g) {
  return {
    id: g.id,
    gr_number: g.gr_number || "",
    po_id: g.po_id,
    supplier_id: g.supplier_id,
    warehouse_id: g.warehouse_id,
    date: g.date || "",
    status: g.status || "completed",
    note: g.note || "",
    purchase_orders: g.purchase_orders || null,
    suppliers: g.suppliers || null,
    warehouses: g.warehouses || null,
    goods_receipt_items: g.goods_receipt_items || [],
  };
}

// ============ Init ============
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

  reloadGRs()
    .then(function () { applyFilters(); })
    .catch(function (err) { console.error(err); applyFilters(); });
});
