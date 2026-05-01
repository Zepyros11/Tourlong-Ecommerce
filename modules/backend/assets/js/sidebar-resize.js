// ============================================================
// sidebar-resize.js — ลากปรับขนาด + ปุ่ม toggle ย่อ/ขยาย sidebar
// ------------------------------------------------------------
// - ลาก edge ขวาเพื่อปรับขนาด (140-360px CSS)
// - ปุ่ม toggle ที่ top-right ย่อเหลือ icon-only (50px)
// - จำขนาด + collapsed state ใน localStorage
// - ใช้ร่วมทุกหน้า backend (load หลัง sidebar-menu.js)
// ============================================================

(function () {
  var WIDTH_KEY = "pathara_sidebar_width";
  var COLLAPSED_KEY = "pathara_sidebar_collapsed";
  var MIN_WIDTH = 140;
  var MAX_WIDTH = 360;

  function init() {
    var sidebar = document.querySelector(".sidebar");
    if (!sidebar) return;

    // restore saved width
    var saved = parseInt(localStorage.getItem(WIDTH_KEY), 10);
    if (saved && saved >= MIN_WIDTH && saved <= MAX_WIDTH) {
      sidebar.style.width = saved + "px";
    }
    // restore collapsed state
    if (localStorage.getItem(COLLAPSED_KEY) === "1") {
      sidebar.classList.add("collapsed");
    }

    addResizeHandle(sidebar);
    addToggleButton(sidebar);

    // render icons ของปุ่มที่เพิ่งใส่
    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons();
    }
  }

  function addResizeHandle(sidebar) {
    if (sidebar.querySelector(".sidebar-resize-handle")) return;
    var handle = document.createElement("div");
    handle.className = "sidebar-resize-handle";
    handle.setAttribute("title", "ลากเพื่อปรับขนาด");
    sidebar.appendChild(handle);
    bindDrag(handle, sidebar);
  }

  function addToggleButton(sidebar) {
    if (sidebar.querySelector(".sidebar-toggle-btn")) return;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "sidebar-toggle-btn";
    btn.setAttribute("aria-label", "ย่อ/ขยาย sidebar");
    btn.setAttribute("title", "ย่อ/ขยาย sidebar");
    btn.innerHTML = '<i data-lucide="chevrons-left"></i>';
    sidebar.appendChild(btn);

    btn.addEventListener("click", function () {
      sidebar.classList.toggle("collapsed");
      var isCollapsed = sidebar.classList.contains("collapsed");
      try { localStorage.setItem(COLLAPSED_KEY, isCollapsed ? "1" : "0"); } catch (e) {}
    });
  }

  function bindDrag(handle, sidebar) {
    var dragging = false;
    var startX = 0;
    var startWidth = 0;

    handle.addEventListener("mousedown", function (e) {
      // ห้าม drag เมื่อ collapsed
      if (sidebar.classList.contains("collapsed")) return;
      dragging = true;
      startX = e.clientX;
      startWidth = parseFloat(sidebar.style.width) ||
        parseFloat(getComputedStyle(sidebar).width) || 210;
      document.body.style.userSelect = "none";
      document.body.style.cursor = "ew-resize";
      handle.classList.add("dragging");
      e.preventDefault();
    });

    document.addEventListener("mousemove", function (e) {
      if (!dragging) return;
      var delta = e.clientX - startX;
      var newWidth = startWidth + delta;
      if (newWidth < MIN_WIDTH) newWidth = MIN_WIDTH;
      if (newWidth > MAX_WIDTH) newWidth = MAX_WIDTH;
      sidebar.style.width = newWidth + "px";
    });

    document.addEventListener("mouseup", function () {
      if (!dragging) return;
      dragging = false;
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      handle.classList.remove("dragging");
      var w = parseInt(sidebar.style.width, 10);
      if (w) {
        try { localStorage.setItem(WIDTH_KEY, w); } catch (e) {}
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
