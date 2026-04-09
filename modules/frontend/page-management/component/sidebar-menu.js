// ============================================================
// sidebar-menu.js — Frontend Sidebar Menu
// ------------------------------------------------------------
// หน้าที่: เมนู sidebar เฉพาะ Frontend (แยกจาก Backend)
// แสดง pages จาก pagesData + ปุ่มเพิ่ม page
// ============================================================

var backendLink = {
  label: "Go to Backend",
  icon: "arrow-right-circle",
  href: "/modules/backend/sales/dashboard.html",
};

/**
 * Render sidebar menu (Frontend version)
 */
function renderSidebarMenu() {
  var nav = document.querySelector(".sidebar-nav");
  if (!nav) return;

  var html = '';

  // Go to Backend link
  html += '<a href="' + backendLink.href + '" class="sidebar-backend-link">';
  html += '<i data-lucide="' + backendLink.icon + '" class="sidebar-icon"></i>';
  html += '<span>' + backendLink.label + '</span>';
  html += '</a>';

  // Pages group header
  html += '<div class="sidebar-group">';
  html += '<div class="sidebar-group-label sidebar-group-label-static">';
  html += '<i data-lucide="file-text" class="sidebar-group-icon"></i>';
  html += '<span>Pages</span>';
  html += '</div>';

  // Page list (dynamic — render จาก pagesData)
  html += '<div class="sidebar-group-items open" id="sidebarPageList">';
  html += '<!-- render จาก updateSidebarPages() -->';
  html += '</div>';

  // Add page button
  html += '<button class="sidebar-add-page-btn" id="sidebarAddPageBtn">';
  html += '<i data-lucide="plus" style="width:12px;height:12px;"></i>';
  html += '<span>เพิ่ม Page</span>';
  html += '</button>';

  html += '</div>';

  nav.innerHTML = html;
  if (typeof lucide !== "undefined") lucide.createIcons();

  // Bind add page button
  var addBtn = document.getElementById("sidebarAddPageBtn");
  if (addBtn) {
    addBtn.addEventListener("click", function () {
      openModalById("newPageModal");
    });
  }
}

/**
 * Update page list ใน sidebar (เรียกหลังโหลด/สร้าง/ลบ page)
 */
function updateSidebarPages() {
  var container = document.getElementById("sidebarPageList");
  if (!container || typeof pagesData === "undefined") return;

  if (pagesData.length === 0) {
    container.innerHTML = '<div class="sidebar-no-pages">ยังไม่มีหน้าเว็บ</div>';
    return;
  }

  var html = '';
  pagesData.forEach(function (page) {
    var isActive = page.id === currentEditPageId;
    var isPub = page.status === "published";
    html += '<a href="#" class="sidebar-nav-item sidebar-page-item' + (isActive ? ' active' : '') + '" data-page-id="' + page.id + '">';
    html += '<i data-lucide="file" class="sidebar-icon"></i>';
    html += '<span>' + page.name + '</span>';
    html += '<span class="sidebar-page-badge ' + (isPub ? 'badge-pub' : 'badge-draft') + '">' + (isPub ? 'LIVE' : 'DRAFT') + '</span>';
    html += '</a>';
  });

  container.innerHTML = html;
  if (typeof lucide !== "undefined") lucide.createIcons();

  // Bind click to switch page
  container.querySelectorAll(".sidebar-page-item").forEach(function (item) {
    item.addEventListener("click", function (e) {
      e.preventDefault();
      var pageId = parseInt(this.dataset.pageId);
      openEditor(pageId);
      updateSidebarPages();
    });
  });
}
