// ============================================================
// sidebar-menu.js — Sidebar Menu Data (ใช้ร่วมทุกหน้า)
// ------------------------------------------------------------
// หน้าที่: เก็บข้อมูลเมนู sidebar, render เมนูอัตโนมัติ
// รองรับ: เปิด/ปิด sub menu ด้วยลูกศร
// วิธีใช้: <script src="../../assets/js/sidebar-menu.js"></script>
//
// Icon Reference (Lucide):
//   flag         — Community
//   zap          — Sport
//   calendar     — Plan
//   layout-grid  — Category
//   shopping-bag — Store
// ============================================================

var frontendLink = {
  label: "ไปหน้าร้าน",
  icon: "arrow-right-circle",
  href: "/modules/frontend/page-management/main-page.html",
};

var sidebarMenu = [
  {
    group: "คลังสินค้า",
    icon: "package",
    basePath: "/modules/backend/inventory/product-management/",
    items: [
      { name: "แดชบอร์ด",         icon: "bar-chart-3",    href: "dashboard.html" },
      { name: "รายการสินค้า",     icon: "shopping-bag",   href: "products-list.html" },
      { name: "สต็อกเริ่มต้น",     icon: "clipboard-list", href: "products-initial.html" },
      { name: "เคลื่อนไหวสินค้า",  icon: "repeat",         href: "stock-movement.html" },
      { name: "หน่วยนับ",          icon: "ruler",          href: "unit-of-measure.html" },
      { name: "คลังสินค้า",        icon: "warehouse",      href: "warehouses.html" },
      { name: "หมวดหมู่สินค้า",    icon: "layout-grid",    href: "products-category-list.html" },
    ],
  },
  {
    group: "โปรโมชั่น",
    icon: "tag",
    basePath: "/modules/backend/promotions/",
    items: [
      { name: "แพ็คเกจโปรโมชั่น", icon: "package-plus", href: "promotion-packages.html" },
      { name: "คูปองส่วนลด",     icon: "ticket",       href: "coupons.html" },
      { name: "โปรโมชั่นลดราคา",  icon: "percent",      href: "discounts.html" },
    ],
  },
  {
    group: "การขาย",
    icon: "credit-card",
    basePath: "/modules/backend/sales/",
    items: [
      { name: "แดชบอร์ด",        icon: "bar-chart-3",    href: "dashboard.html" },
      { name: "ลูกค้า",           icon: "users",          href: "customers.html" },
      { name: "คำสั่งซื้อ (SO)",  icon: "shopping-cart",  href: "sales-orders.html" },
      { name: "ใบแจ้งหนี้",       icon: "receipt",        href: "invoices.html" },
      { name: "รับคืนสินค้า",     icon: "undo-2",         href: "sales-returns.html" },
    ],
  },
  {
    group: "การจัดซื้อ",
    icon: "shopping-cart",
    basePath: "/modules/backend/purchasing/",
    items: [
      { name: "แดชบอร์ด",         icon: "bar-chart-3",   href: "dashboard.html" },
      { name: "ผู้ขาย",            icon: "store",         href: "suppliers.html" },
      { name: "ใบสั่งซื้อ (PO)",  icon: "file-text",     href: "purchase-orders.html" },
      { name: "รับสินค้า (GR)",   icon: "package-check", href: "goods-receive.html" },
      { name: "ส่งคืนสินค้า",     icon: "undo-2",        href: "purchase-returns.html" },
    ],
  },
  {
    group: "การจัดส่ง",
    icon: "truck",
    basePath: "/modules/backend/shipping/",
    items: [
      { name: "การจัดส่ง",     icon: "package",    href: "shipments.html" },
      { name: "อัตราค่าขนส่ง", icon: "calculator", href: "shipping-rates.html" },
    ],
  },
  {
    group: "รายงาน",
    icon: "bar-chart-2",
    basePath: "/modules/backend/reports/",
    items: [
      { name: "รายงานยอดขาย",       icon: "trending-up",   href: "sales-report.html" },
      { name: "รายงานสินค้าคงเหลือ", icon: "package",       href: "inventory-report.html" },
      { name: "รายงานการจัดซื้อ",    icon: "shopping-cart", href: "purchase-report.html" },
      { name: "กำไร-ขาดทุน",        icon: "calculator",    href: "profit-loss.html" },
    ],
  },
  {
    group: "การเงิน",
    icon: "wallet",
    basePath: "/modules/backend/finance/",
    items: [
      { name: "แดชบอร์ด",     icon: "bar-chart-3",  href: "dashboard.html" },
      { name: "รายรับ",       icon: "credit-card",  href: "payments.html" },
      { name: "รายจ่าย",      icon: "receipt",      href: "expenses.html" },
      { name: "บัญชีธนาคาร",  icon: "landmark",     href: "bank-accounts.html" },
    ],
  },
  {
    group: "ตั้งค่า",
    icon: "settings",
    basePath: "/modules/backend/settings/",
    items: [
      { name: "ข้อมูลบริษัท",     icon: "building-2", href: "company-info.html" },
      { name: "ผู้ใช้งาน",         icon: "users",      href: "users.html" },
      { name: "สิทธิ์การใช้งาน",   icon: "shield",     href: "roles-permissions.html" },
      { name: "ประวัติการใช้งาน", icon: "file-text",  href: "activity-log.html" },
      { name: "ตั้งค่าขั้นสูง",     icon: "sliders",    href: "advance-settings.html" },
    ],
  },
];

/**
 * Render sidebar menu
 * @param {string} activeHref - ชื่อไฟล์ปัจจุบัน เช่น "products-list.html"
 */
function renderSidebarMenu() {
  var nav = document.querySelector(".sidebar-nav");
  if (!nav) return;
  // ใช้ current path ตรวจ active เพื่อแก้ปัญหาชื่อไฟล์ซ้ำข้าม group
  var currentPath = window.location.pathname;

  // Render "Go to Frontend" link at the top
  var html = '';
  if (typeof frontendLink !== 'undefined') {
    html += '<a href="' + frontendLink.href + '" class="sidebar-frontend-link">';
    html += '<i data-lucide="' + frontendLink.icon + '" class="sidebar-icon"></i>';
    html += '<span>' + frontendLink.label + '</span>';
    html += '</a>';
  }

  sidebarMenu.forEach(function (group, idx) {
    var hasActive = group.items.some(function (item) {
      if (item.type === "divider") return false;
      var fullPath = (group.basePath || "") + item.href;
      return currentPath.indexOf(fullPath) !== -1;
    });

    html += '<div class="sidebar-group">';
    html += '<div class="sidebar-group-label" data-group="' + idx + '">';
    html += '<i data-lucide="' + group.icon + '" class="sidebar-group-icon"></i>';
    html += "<span>" + group.group + "</span>";
    html += '<i data-lucide="chevron-down" class="sidebar-chevron' + (hasActive ? " open" : "") + '"></i>';
    html += "</div>";
    html += '<div class="sidebar-group-items' + (hasActive ? " open" : "") + '" data-group-items="' + idx + '">';
    group.items.forEach(function (item) {
      if (item.type === "divider") {
        html += '<div class="sidebar-subgroup-label" style="font-size:9px;font-weight:800;color:rgba(255,255,255,0.55);text-transform:uppercase;letter-spacing:0.6px;padding:10px 16px 4px;margin-top:4px;border-top:1px solid rgba(255,255,255,0.12);">' + item.label + '</div>';
        return;
      }
      var fullHref = (group.basePath || "") + item.href;
      var isActive = currentPath.indexOf(fullHref) !== -1;
      html += '<a href="' + fullHref + '" class="sidebar-nav-item' + (isActive ? " active" : "") + '">';
      html += '<i data-lucide="' + item.icon + '" class="sidebar-icon"></i>';
      html += "<span>" + item.name + "</span>";
      if (isActive) html += '<div class="sidebar-nav-dot"></div>';
      html += "</a>";
    });
    html += "</div>";
    html += "</div>";
  });

  nav.innerHTML = html;
  if (typeof lucide !== "undefined") lucide.createIcons();

  // Toggle เปิด/ปิด
  nav.querySelectorAll(".sidebar-group-label").forEach(function (label) {
    label.addEventListener("click", function () {
      var idx = this.dataset.group;
      var items = nav.querySelector('[data-group-items="' + idx + '"]');
      var chevron = this.querySelector(".sidebar-chevron");
      if (items) items.classList.toggle("open");
      if (chevron) chevron.classList.toggle("open");
    });
  });
}
