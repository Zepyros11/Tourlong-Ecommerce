// ============================================================
// products-list.js — Products List (ตารางรายการสินค้า)
// form อยู่ที่ products-form.html / products-form.js
// ============================================================

// ============ Mock Database ============
let products = [
  { id: 1,  name: "Wireless Headphones",   sku: "WH-001",  category: "Electronics",     price: 2590,  status: "active", variants: [] },
  { id: 2,  name: "Running Shoes",         sku: "RS-001",  category: "Sports",          price: 3200,  status: "active", variants: [] },
  { id: 3,  name: "เสื้อลายหมี",            sku: "BEAR",    category: "Clothing",        price: 450,   status: "active", variants: [
    { variant: "S", sku: "BEAR-S", price: 450 },
    { variant: "M", sku: "BEAR-M", price: 450 },
    { variant: "L", sku: "BEAR-L", price: 490 },
    { variant: "XL", sku: "BEAR-XL", price: 520 },
  ]},
  { id: 4,  name: "Yoga Mat",              sku: "YM-001",  category: "Sports",          price: 890,   status: "inactive", variants: [] },
  { id: 5,  name: "Protein Powder",        sku: "PP-001",  category: "Food & Beverage", price: 1250,  status: "active", variants: [] },
  { id: 6,  name: "Smart Watch",           sku: "SW",      category: "Electronics",     price: 4500,  status: "active", variants: [
    { variant: "Black", sku: "SW-BLK", price: 4500 },
    { variant: "Silver", sku: "SW-SLV", price: 4500 },
    { variant: "Gold", sku: "SW-GLD", price: 4900 },
  ]},
  { id: 7,  name: "Leather Wallet",        sku: "LW-001",  category: "Accessories",     price: 750,   status: "inactive", variants: [] },
  { id: 8,  name: "Face Serum",            sku: "FS-001",  category: "Beauty",          price: 680,   status: "active", variants: [] },
  { id: 9,  name: "Desk Lamp",             sku: "DL-001",  category: "Home & Living",   price: 1100,  status: "active", variants: [] },
  { id: 10, name: "JavaScript Handbook",   sku: "BK-001",  category: "Books",           price: 350,   status: "active", variants: [] },
];

// ============ Stats ============
function updateStats() {
  document.getElementById("statAll").textContent = products.length;
  document.getElementById("statActive").textContent = products.filter(function(p) { return p.status === "active"; }).length;
  document.getElementById("statInactive").textContent = products.filter(function(p) { return p.status === "inactive"; }).length;
}

// ============ Render Table ============
function renderTable(data) {
  updateStats();
  var tbody = document.getElementById("productTableBody");
  tbody.innerHTML = data.map(function(p, i) {
    var variantBadge = p.variants && p.variants.length
      ? '<span class="badge" style="background-color:#eff6ff;color:#3b82f6;">' + p.variants.length + ' variants</span>'
      : '<span style="font-size:10px;color:#cbd5e1;">—</span>';
    var skuDisplay = p.variants && p.variants.length
      ? '<span style="font-size:10px;color:#8b5cf6;font-weight:600;">' + p.sku + '-*</span>'
      : '<span style="font-size:10px;color:#64748b;font-weight:600;">' + (p.sku || '—') + '</span>';
    return '<tr>' +
      '<td>' + (i + 1) + '</td>' +
      '<td>' + p.name + '</td>' +
      '<td>' + skuDisplay + '</td>' +
      '<td>' + p.category + '</td>' +
      '<td>฿' + p.price.toLocaleString() + '</td>' +
      '<td>' + variantBadge + '</td>' +
      '<td><span class="badge badge-' + (p.status === "active" ? "active" : "inactive") + '">' + (p.status === "active" ? "Active" : "Inactive") + '</span></td>' +
      '<td><div class="table-actions">' +
        '<button class="btn-icon-sm" onclick="editProduct(' + p.id + ')"><i data-lucide="pencil"></i></button>' +
        '<button class="btn-icon-sm btn-danger" onclick="deleteProduct(' + p.id + ')"><i data-lucide="trash-2"></i></button>' +
      '</div></td>' +
    '</tr>';
  }).join("");
  lucide.createIcons();
  if (typeof refreshSortableHeaders === "function") refreshSortableHeaders();
}

// ============ Edit → ไปหน้า form ============
function editProduct(id) {
  window.location.href = "products-form.html?id=" + id;
}

// ============ Delete ============
function deleteProduct(id) {
  var p = products.find(function(x) { return x.id === id; });
  if (!p) return;
  showConfirm({
    title: "Confirm Delete",
    message: "ต้องการลบสินค้า <strong>" + p.name + "</strong>" + (p.sku ? " (" + p.sku + ")" : "") + " ใช่ไหม?",
    okText: "Delete", okColor: "#ef4444",
    onConfirm: function() { products = products.filter(function(x) { return x.id !== id; }); applyFilters(); }
  });
}

// ============ Filter & Sort ============
var currentFilter = "all";
var currentSort = "default";

function getFilteredData() {
  var keyword = document.querySelector(".filter-search-input").value.toLowerCase();
  var data = products;
  if (currentFilter !== "all") data = data.filter(function(p) { return p.status === currentFilter; });
  if (keyword) data = data.filter(function(p) {
    return p.name.toLowerCase().includes(keyword) || p.category.toLowerCase().includes(keyword) || (p.sku || "").toLowerCase().includes(keyword);
  });
  switch (currentSort) {
    case "name-asc": data = data.slice().sort(function(a, b) { return a.name.localeCompare(b.name); }); break;
    case "name-desc": data = data.slice().sort(function(a, b) { return b.name.localeCompare(a.name); }); break;
    case "price-desc": data = data.slice().sort(function(a, b) { return b.price - a.price; }); break;
    case "price-asc": data = data.slice().sort(function(a, b) { return a.price - b.price; }); break;
  }
  return data;
}

function applyFilters() { renderTable(getFilteredData()); }

// ============ Init ============
document.addEventListener("DOMContentLoaded", function() {
  document.querySelector(".filter-search-input").addEventListener("input", applyFilters);

  document.querySelectorAll(".filter-btn").forEach(function(btn) {
    btn.addEventListener("click", function() {
      document.querySelectorAll(".filter-btn").forEach(function(b) { b.classList.remove("active"); });
      this.classList.add("active");
      currentFilter = this.dataset.status;
      applyFilters();
    });
  });

  document.getElementById("sortSelect").addEventListener("change", function() {
    currentSort = this.value;
    applyFilters();
  });

  renderTable(products);
});
