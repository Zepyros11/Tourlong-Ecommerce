// ============================================================
// toast.js — Toast Notification Component (ใช้ร่วมทุกหน้า)
// ------------------------------------------------------------
// หน้าที่: แสดงข้อความแจ้งเตือนแบบ slide-in มุมขวาบน auto-dismiss
// วิธีใช้: <script src="/modules/backend/assets/js/toast.js"></script>
//          showToast("เปลี่ยนรหัสผ่านสำเร็จ", "success");
//          showToast("บันทึกไม่สำเร็จ", "error");
//          showToast("รหัสผ่านไม่ตรงกัน", "warning");
//          showToast("กำลังโหลดข้อมูล", "info", 5000);
// ============================================================

(function () {
  // ============ Inject styles ============
  if (!document.getElementById("toast-styles")) {
    var style = document.createElement("style");
    style.id = "toast-styles";
    style.textContent =
      ".toast-container { position: fixed; top: 20px; right: 20px; z-index: 9999;" +
      "  display: flex; flex-direction: column; gap: 10px; pointer-events: none;" +
      "  font-family: 'Plus Jakarta Sans', sans-serif; }" +
      ".toast { display: flex; align-items: flex-start; gap: 12px; min-width: 280px;" +
      "  max-width: 380px; padding: 14px 16px; background: #fff; border-radius: 12px;" +
      "  box-shadow: 0 10px 30px rgba(0,0,0,0.12); border-left: 4px solid #94a3b8;" +
      "  pointer-events: auto; cursor: pointer; opacity: 0; transform: translateX(120%);" +
      "  transition: opacity .25s ease, transform .25s ease; }" +
      ".toast.show { opacity: 1; transform: translateX(0); }" +
      ".toast.hide { opacity: 0; transform: translateX(120%); }" +
      ".toast-icon { flex-shrink: 0; width: 20px; height: 20px; display: flex;" +
      "  align-items: center; justify-content: center; border-radius: 50%; }" +
      ".toast-icon i { width: 14px; height: 14px; color: #fff; }" +
      ".toast-body { flex: 1; min-width: 0; }" +
      ".toast-title { font-size: 12px; font-weight: 700; color: #1e293b; margin: 0 0 2px;" +
      "  line-height: 1.3; }" +
      ".toast-message { font-size: 11px; color: #475569; margin: 0; line-height: 1.4;" +
      "  word-wrap: break-word; }" +
      ".toast-close { flex-shrink: 0; background: none; border: none; padding: 0; cursor: pointer;" +
      "  color: #94a3b8; display: flex; align-items: center; justify-content: center; }" +
      ".toast-close i { width: 14px; height: 14px; }" +
      ".toast-close:hover { color: #475569; }" +
      ".toast.success { border-left-color: #10b981; }" +
      ".toast.success .toast-icon { background: #10b981; }" +
      ".toast.error   { border-left-color: #ef4444; }" +
      ".toast.error   .toast-icon { background: #ef4444; }" +
      ".toast.warning { border-left-color: #f59e0b; }" +
      ".toast.warning .toast-icon { background: #f59e0b; }" +
      ".toast.info    { border-left-color: #3b82f6; }" +
      ".toast.info    .toast-icon { background: #3b82f6; }";
    document.head.appendChild(style);
  }

  // ============ Ensure container ============
  function ensureContainer() {
    var c = document.getElementById("toastContainer");
    if (!c) {
      c = document.createElement("div");
      c.id = "toastContainer";
      c.className = "toast-container";
      document.body.appendChild(c);
    }
    return c;
  }

  // ============ Variant config ============
  var VARIANTS = {
    success: { icon: "check",     title: "สำเร็จ" },
    error:   { icon: "x",         title: "ผิดพลาด" },
    warning: { icon: "alert-triangle", title: "แจ้งเตือน" },
    info:    { icon: "info",      title: "ข้อมูล" },
  };

  /**
   * แสดง toast notification
   * @param {string} message - ข้อความที่จะแสดง
   * @param {string} [type=info] - ประเภท: success | error | warning | info
   * @param {number} [duration=3000] - ระยะเวลาแสดงผล (ms) — ใส่ 0 = ไม่ปิดอัตโนมัติ
   */
  window.showToast = function (message, type, duration) {
    type = VARIANTS[type] ? type : "info";
    duration = duration === undefined ? 3000 : duration;

    var variant = VARIANTS[type];
    var container = ensureContainer();

    var toast = document.createElement("div");
    toast.className = "toast " + type;
    toast.innerHTML =
      '<div class="toast-icon"><i data-lucide="' + variant.icon + '"></i></div>' +
      '<div class="toast-body">' +
      '  <p class="toast-title">' + variant.title + '</p>' +
      '  <p class="toast-message"></p>' +
      '</div>' +
      '<button class="toast-close" type="button" aria-label="Close">' +
      '  <i data-lucide="x"></i>' +
      '</button>';
    toast.querySelector(".toast-message").textContent = message;
    container.appendChild(toast);

    if (typeof lucide !== "undefined") lucide.createIcons();

    // Trigger enter animation on next frame
    requestAnimationFrame(function () { toast.classList.add("show"); });

    var timer = null;
    function dismiss() {
      if (timer) { clearTimeout(timer); timer = null; }
      toast.classList.add("hide");
      toast.classList.remove("show");
      setTimeout(function () { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 260);
    }

    toast.querySelector(".toast-close").addEventListener("click", function (e) {
      e.stopPropagation(); dismiss();
    });
    toast.addEventListener("click", dismiss);

    if (duration > 0) timer = setTimeout(dismiss, duration);

    return { dismiss: dismiss };
  };
})();
