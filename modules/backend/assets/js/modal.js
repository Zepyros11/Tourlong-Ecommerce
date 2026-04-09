// ============================================================
// modal.js — Modal Component (ใช้ร่วมทุกหน้า)
// ------------------------------------------------------------
// หน้าที่: เปิด/ปิด modal, กด Esc ปิด, คลิก overlay ปิด
// วิธีใช้: <script src="../../assets/js/modal.js"></script>
//
// โครงสร้าง JS Components:
//   assets/js/modal.js   — จัดการ modal (เปิด/ปิด/Esc/overlay)
//   assets/js/table.js   — render ตาราง, search, filter
//   assets/js/confirm.js — confirm dialog ก่อน action (ลบ ฯลฯ)
// ============================================================

/**
 * เปิด modal โดยระบุ id
 * @param {string} modalId - id ของ .modal-overlay
 * @param {Function} [onOpen] - callback หลังเปิด
 */
function openModalById(modalId, onOpen) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.add("active");
  if (onOpen) onOpen(modal);
}

/**
 * ปิด modal โดยระบุ id
 * @param {string} modalId - id ของ .modal-overlay
 */
function closeModalById(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.remove("active");
}

/**
 * ปิด modal ทั้งหมดที่เปิดอยู่
 */
function closeAllModals() {
  document.querySelectorAll(".modal-overlay.active").forEach(function (modal) {
    modal.classList.remove("active");
  });
}

// ============ Auto Setup ============
document.addEventListener("DOMContentLoaded", function () {
  // กด Esc ปิด modal
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeAllModals();
  });

  // คลิก overlay ปิด modal
  document.querySelectorAll(".modal-overlay").forEach(function (overlay) {
    overlay.addEventListener("click", function (e) {
      if (e.target === this) this.classList.remove("active");
    });
  });

  // ปุ่ม .modal-close ปิด modal
  document.querySelectorAll(".modal-close").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var overlay = this.closest(".modal-overlay");
      if (overlay) overlay.classList.remove("active");
    });
  });
});
