// ============================================================
// topbar.js — Topbar Component (ใช้ร่วมทั้ง Frontend & Backend)
// ------------------------------------------------------------
// หน้าที่: Breadcrumb, Global Search, Notifications, User Menu
// วิธีใช้: <script src="/assets/js/topbar.js"></script>
//          renderTopbar({ group: "Settings", page: "Users" });
// Dependencies (optional แต่ recommend): auth-guard.js, confirm.js, toast.js
// ============================================================

var topbarNotifications = [
  { text: "สินค้า <b>Yoga Mat</b> หมดสต็อก", time: "5 นาทีที่แล้ว", dot: "#ef4444" },
  { text: "PO-2026-007 รอ<b>อนุมัติ</b>", time: "30 นาทีที่แล้ว", dot: "#f59e0b" },
  { text: "<b>คุณวิภา</b> สร้าง GR-2026-006", time: "1 ชั่วโมงที่แล้ว", dot: "#3b82f6" },
  { text: "Invoice INV-2026-008 <b>เกินกำหนด</b>", time: "2 ชั่วโมงที่แล้ว", dot: "#ef4444" },
  { text: "<b>คุณธนา</b> เพิ่มสินค้าใหม่", time: "3 ชั่วโมงที่แล้ว", dot: "#10b981" },
];

function getTopbarUser() {
  if (typeof getCurrentUser === "function") {
    var u = getCurrentUser();
    if (u) {
      var displayName = u.name || u.username || "User";
      return {
        name: displayName,
        initials: displayName.charAt(0).toUpperCase(),
        role: u.role || ""
      };
    }
  }
  return { name: "Guest", initials: "?", role: "" };
}

/**
 * Render topbar
 * @param {Object} options
 * @param {string} options.group - ชื่อ group เช่น "Settings"
 * @param {string} options.page - ชื่อหน้าปัจจุบัน เช่น "Users"
 */
function renderTopbar(options) {
  var topbar = document.querySelector(".topbar");
  if (!topbar) return;

  var group = options.group || "";
  var page = options.page || "";
  var topbarUser = getTopbarUser();

  topbar.innerHTML = `
    <div class="topbar-left">
      <div class="topbar-breadcrumb">
        <a href="#">${group}</a>
        <span class="topbar-breadcrumb-sep">›</span>
        <span class="topbar-breadcrumb-current">${page}</span>
      </div>
    </div>

    <div class="topbar-actions">
      <div class="topbar-search">
        <i data-lucide="search" class="topbar-search-icon"></i>
        <input type="text" placeholder="Search..." class="topbar-search-input" id="globalSearch" />
      </div>

      <a href="/modules/note.html" class="topbar-bell" title="Dev Notes" style="position:relative;text-decoration:none;">
        <i data-lucide="notebook-pen" class="topbar-bell-icon"></i>
        <span class="topbar-bell-badge" style="background-color:#f59e0b;"></span>
      </a>

      <div class="topbar-bell" id="notifBtn" style="position:relative;">
        <i data-lucide="bell" class="topbar-bell-icon"></i>
        <span class="topbar-bell-badge"></span>
        <div class="topbar-dropdown" id="notifDropdown">
          <div class="topbar-dropdown-header">
            <p class="topbar-dropdown-title">Notifications</p>
            <span class="topbar-dropdown-link" id="topbarMarkAllReadBtn">Mark all read</span>
          </div>
          <div class="topbar-dropdown-body">
            ${topbarNotifications.map(function (n) {
              return '<div class="topbar-notif-item">' +
                '<div class="topbar-notif-dot" style="background-color:' + n.dot + ';"></div>' +
                '<div>' +
                '<p class="topbar-notif-text">' + n.text + '</p>' +
                '<p class="topbar-notif-time">' + n.time + '</p>' +
                '</div></div>';
            }).join("")}
          </div>
        </div>
      </div>

      <div class="topbar-user" id="userBtn">
        <div class="topbar-user-avatar">${topbarUser.initials}</div>
        <div class="topbar-user-info">
          <span class="topbar-user-name">${topbarUser.name}</span>
          <span class="topbar-user-role">${topbarUser.role}</span>
        </div>
        <i data-lucide="chevron-down" class="topbar-user-chevron"></i>
        <div class="topbar-user-dropdown" id="userDropdown">
          <a href="#" class="topbar-user-menu-item" id="topbarProfileBtn">
            <i data-lucide="user"></i> Profile
          </a>
          <a href="/modules/backend/auth/self-change-password.html" class="topbar-user-menu-item">
            <i data-lucide="lock"></i> Change Password
          </a>
          <div class="topbar-user-menu-divider"></div>
          <a href="#" class="topbar-user-menu-item danger" id="topbarLogoutBtn">
            <i data-lucide="log-out"></i> Logout
          </a>
        </div>
      </div>
    </div>
  `;

  if (typeof lucide !== "undefined") lucide.createIcons();

  // Toggle notifications dropdown
  var notifBtn = document.getElementById("notifBtn");
  var notifDropdown = document.getElementById("notifDropdown");
  notifBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    notifDropdown.classList.toggle("open");
    document.getElementById("userDropdown").classList.remove("open");
    document.getElementById("userBtn").classList.remove("open");
  });

  // Toggle user dropdown
  var userBtn = document.getElementById("userBtn");
  var userDropdown = document.getElementById("userDropdown");
  userBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    userDropdown.classList.toggle("open");
    userBtn.classList.toggle("open");
    notifDropdown.classList.remove("open");
  });

  // Close dropdowns on outside click
  document.addEventListener("click", function () {
    notifDropdown.classList.remove("open");
    userDropdown.classList.remove("open");
    userBtn.classList.remove("open");
  });

  // Prevent dropdown close when clicking inside
  notifDropdown.addEventListener("click", function (e) { e.stopPropagation(); });
  userDropdown.addEventListener("click", function (e) { e.stopPropagation(); });

  // Wire placeholder actions (toast แทน native alert)
  var profileBtn = document.getElementById("topbarProfileBtn");
  if (profileBtn) {
    profileBtn.addEventListener("click", function(e) {
      e.preventDefault();
      if (typeof showToast === "function") showToast("หน้า Profile กำลังพัฒนา", "info");
    });
  }
  var markAllBtn = document.getElementById("topbarMarkAllReadBtn");
  if (markAllBtn) {
    markAllBtn.addEventListener("click", function(e) {
      e.stopPropagation();
      if (typeof showToast === "function") showToast("ทำเครื่องหมายอ่านทั้งหมดแล้ว", "success");
    });
  }

  // Wire logout
  var logoutBtn = document.getElementById("topbarLogoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", function(e) {
      e.preventDefault();
      if (typeof logout !== "function") return;

      if (typeof showConfirm === "function") {
        showConfirm({
          title: "ออกจากระบบ",
          message: "ต้องการออกจากระบบใช่ไหม?",
          okText: "Logout",
          okColor: "#ef4444",
          onConfirm: function() { logout(); }
        });
      } else {
        logout();
      }
    });
  }
}
