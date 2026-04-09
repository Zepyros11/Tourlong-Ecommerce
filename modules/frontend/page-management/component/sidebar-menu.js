// ============================================================
// sidebar-menu.js — Frontend Sidebar Menu
// ------------------------------------------------------------
// หน้าที่: เมนู sidebar เฉพาะ Frontend (แยกจาก Backend)
// ============================================================

var backendLink = {
  label: "Go to Backend",
  icon: "arrow-right-circle",
  href: "/modules/backend/sales/dashboard.html",
};

var sidebarMenu = [
  {
    group: "Page Builder",
    icon: "layout-dashboard",
    basePath: "/modules/frontend/page-management/",
    items: [
      { name: "Page Management", icon: "file-edit",     href: "main-page.html" },
    ],
  },
  {
    group: "Frontend Pages",
    icon: "globe",
    basePath: "/modules/frontend/",
    items: [
      { name: "Home Page",         icon: "home",          href: "home-page/home-page.html" },
      { name: "สินค้า",             icon: "shopping-bag",  href: "pages/products.html" },
      { name: "รายละเอียดสินค้า",   icon: "package",       href: "pages/product-detail.html" },
      { name: "ตะกร้าสินค้า",       icon: "shopping-cart", href: "pages/cart.html" },
      { name: "ชำระเงิน",           icon: "credit-card",   href: "pages/checkout.html" },
      { name: "ติดตามคำสั่งซื้อ",    icon: "map-pin",       href: "pages/order-tracking.html" },
      { name: "ประวัติสั่งซื้อ",      icon: "clock",         href: "pages/order-history.html" },
      { name: "โปรไฟล์",           icon: "user",          href: "pages/profile.html" },
      { name: "สินค้าที่ถูกใจ",      icon: "heart",         href: "pages/wishlist.html" },
      { name: "โปรโมชั่น",          icon: "tag",           href: "pages/promotions.html" },
      { name: "เกี่ยวกับเรา",       icon: "info",          href: "pages/about.html" },
      { name: "ติดต่อเรา",          icon: "phone",         href: "pages/contact.html" },
    ],
  },
];

/**
 * Render sidebar menu (Frontend version)
 */
function renderSidebarMenu() {
  var nav = document.querySelector(".sidebar-nav");
  if (!nav) return;

  var currentPath = window.location.pathname;

  // Render "Go to Backend" link at the top
  var html = '';
  html += '<a href="' + backendLink.href + '" class="sidebar-backend-link">';
  html += '<i data-lucide="' + backendLink.icon + '" class="sidebar-icon"></i>';
  html += '<span>' + backendLink.label + '</span>';
  html += '</a>';

  sidebarMenu.forEach(function (group, idx) {
    var hasActive = group.items.some(function (item) {
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

  // Toggle open/close
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
