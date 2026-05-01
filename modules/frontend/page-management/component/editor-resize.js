// ============================================================
// editor-resize.js — ลากปรับขนาด Blocks panel + Settings panel
// ------------------------------------------------------------
// - ลาก edge ขวาของ .editor-sidebar-left → ปรับ width 160-400px
// - ลาก edge ซ้ายของ .editor-sidebar-right → ปรับ width 200-480px
// - จำขนาดผ่าน localStorage
// ============================================================

(function () {
  var LEFT_KEY = "pathara_editor_panel_left";
  var RIGHT_KEY = "pathara_editor_panel_right";
  var LEFT_MIN = 160, LEFT_MAX = 400;
  var RIGHT_MIN = 200, RIGHT_MAX = 480;

  function init() {
    var left = document.querySelector(".editor-sidebar-left");
    var right = document.querySelector(".editor-sidebar-right");

    if (left) {
      restoreWidth(left, LEFT_KEY, LEFT_MIN, LEFT_MAX);
      addHandle(left, "right", LEFT_KEY, LEFT_MIN, LEFT_MAX, +1);
    }
    if (right) {
      restoreWidth(right, RIGHT_KEY, RIGHT_MIN, RIGHT_MAX);
      addHandle(right, "left", RIGHT_KEY, RIGHT_MIN, RIGHT_MAX, -1);
    }
  }

  function restoreWidth(el, key, min, max) {
    var saved = parseInt(localStorage.getItem(key), 10);
    if (saved && saved >= min && saved <= max) {
      el.style.width = saved + "px";
    }
  }

  function addHandle(panel, side, key, min, max, dir) {
    if (panel.querySelector(".editor-panel-resize-handle")) return;
    var handle = document.createElement("div");
    handle.className = "editor-panel-resize-handle editor-panel-resize-handle-" + side;
    handle.setAttribute("title", "ลากเพื่อปรับขนาด");
    panel.appendChild(handle);

    var dragging = false;
    var startX = 0;
    var startWidth = 0;

    handle.addEventListener("mousedown", function (e) {
      dragging = true;
      startX = e.clientX;
      startWidth = parseFloat(panel.style.width) ||
        parseFloat(getComputedStyle(panel).width) || 220;
      document.body.style.userSelect = "none";
      document.body.classList.add("dragging-resize");
      handle.classList.add("dragging");
      e.preventDefault();
    });

    document.addEventListener("mousemove", function (e) {
      if (!dragging) return;
      // dir: +1 = ลากขวา = กว้างขึ้น (left panel), -1 = ลากซ้าย = กว้างขึ้น (right panel)
      var newWidth = startWidth + dir * (e.clientX - startX);
      if (newWidth < min) newWidth = min;
      if (newWidth > max) newWidth = max;
      panel.style.width = newWidth + "px";
    });

    document.addEventListener("mouseup", function () {
      if (!dragging) return;
      dragging = false;
      document.body.style.userSelect = "";
      document.body.classList.remove("dragging-resize");
      handle.classList.remove("dragging");
      var w = parseInt(panel.style.width, 10);
      if (w) {
        try { localStorage.setItem(key, w); } catch (e) {}
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
