// ============================================================
// esc-close.js — Esc Key Close Manager (ใช้ร่วมทุกหน้า)
// ------------------------------------------------------------
// หน้าที่: กด Esc ปิด popup/overlay ตัวบนสุด (LIFO)
// วิธีใช้: <script src="/assets/js/esc-close.js"></script>
//
// API:
//   escClose.register(element, closeFn)  — ลงทะเบียน element
//   escClose.unregister(element)         — ถอนออก
//
// ถ้าไม่ส่ง closeFn จะ element.remove() ให้อัตโนมัติ
// ปิดจากตัวบนสุด (ตัวล่าสุดที่ register) ทีละ 1 ต่อ 1 กด Esc
// ============================================================

var escClose = (function () {
  var stack = []; // [{ el, close }]

  function register(el, closeFn) {
    stack.push({ el: el, close: closeFn || function () { el.remove(); } });
  }

  function unregister(el) {
    stack = stack.filter(function (item) { return item.el !== el; });
  }

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape" || !stack.length) return;
    // ปิดตัวบนสุด
    var top = stack.pop();
    top.close();
  });

  return { register: register, unregister: unregister };
})();
