// ============================================================
// confirm.js — Confirm Dialog Component (ใช้ร่วมทุกหน้า)
// ------------------------------------------------------------
// หน้าที่: แสดง confirm modal ก่อนทำ action (ลบ, เปลี่ยนสถานะ ฯลฯ)
// ต้องใช้ร่วมกับ: modal.js (openModalById, closeModalById)
// วิธีใช้: <script src="../../assets/js/confirm.js"></script>
//
// HTML ที่ต้องมี:
// <div class="modal-overlay" id="confirmModal">
//   <div class="modal">
//     <div class="modal-header">
//       <h3 class="modal-title" id="confirmTitle">Confirm</h3>
//       <button class="modal-close"><i data-lucide="x"></i></button>
//     </div>
//     <div class="modal-body">
//       <p id="confirmMessage"></p>
//     </div>
//     <div class="modal-footer">
//       <button class="btn-secondary" id="confirmCancelBtn">Cancel</button>
//       <button class="btn-primary" id="confirmOkBtn">OK</button>
//     </div>
//   </div>
// </div>
// ============================================================

var _confirmCallback = null;

/**
 * แสดง confirm dialog
 * @param {Object} options
 * @param {string} [options.title] - หัวข้อ (default: "Confirm")
 * @param {string} options.message - ข้อความที่จะแสดง (รองรับ HTML)
 * @param {string} [options.okText] - ข้อความปุ่ม OK (default: "OK")
 * @param {string} [options.okColor] - สีปุ่ม OK เช่น "#ef4444" สำหรับ delete
 * @param {Function} options.onConfirm - callback เมื่อกด OK
 */
function showConfirm(options) {
  var titleEl = document.getElementById("confirmTitle");
  var msgEl = document.getElementById("confirmMessage");
  var okBtn = document.getElementById("confirmOkBtn");

  if (titleEl) titleEl.textContent = options.title || "Confirm";
  if (msgEl) msgEl.innerHTML = options.message || "";
  if (okBtn) {
    okBtn.textContent = options.okText || "OK";
    okBtn.style.backgroundColor = options.okColor || "#47b8b4";
  }

  _confirmCallback = options.onConfirm || null;
  openModalById("confirmModal");
}

/**
 * ปิด confirm dialog
 */
function closeConfirm() {
  closeModalById("confirmModal");
  _confirmCallback = null;
}

// ============ Auto Setup ============
document.addEventListener("DOMContentLoaded", function () {
  // กด OK
  var okBtn = document.getElementById("confirmOkBtn");
  if (okBtn) {
    okBtn.addEventListener("click", function () {
      if (_confirmCallback) _confirmCallback();
      closeConfirm();
    });
  }

  // กด Cancel
  var cancelBtn = document.getElementById("confirmCancelBtn");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", function () {
      closeConfirm();
    });
  }
});
