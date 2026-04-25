// ============================================================
// enter-save.js — Enter Key Save (ใช้ร่วมทุกหน้า)
// ------------------------------------------------------------
// หน้าที่: กด Enter ใน modal ที่เปิดอยู่ → trigger ปุ่ม Save (.btn-primary)
//          ข้าม textarea, select, [data-no-enter-save]
// วิธีใช้: <script src="../../assets/js/enter-save.js"></script>
//          (แค่ include ไฟล์ — ทำงานอัตโนมัติ ไม่ต้องเรียก function)
// ============================================================

(function () {
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Enter") return;

    var active = document.activeElement;

    // ข้าม textarea (Enter = ขึ้นบรรทัดใหม่) และ select (Enter = เปิด dropdown)
    if (active && (active.tagName === "TEXTAREA" || active.tagName === "SELECT")) return;

    // ข้าม element ที่มี data-no-enter-save
    if (active && active.closest("[data-no-enter-save]")) return;

    // หา modal ที่เปิดอยู่ — prefer modal ที่ contain focus (top-most ใน stacked modals)
    // fallback: เอา .modal-overlay.active ตัวสุดท้ายใน DOM (modals ที่สร้าง dynamic ต่อท้าย body)
    var modal = active && active.closest(".modal-overlay.active");
    if (!modal) {
      var modals = document.querySelectorAll(".modal-overlay.active");
      if (!modals.length) return;
      modal = modals[modals.length - 1];
    }

    // หาปุ่ม Save (.btn-primary) ใน modal นั้น
    var saveBtn = modal.querySelector(".btn-primary");
    if (!saveBtn || saveBtn.disabled) return;

    e.preventDefault();
    saveBtn.click();
  });
})();
