// ============================================================
// random-data.js — Random Sample Data utility (dev/test helper)
// ------------------------------------------------------------
// ปิดการใช้งานปุ่มทั้งระบบ: แก้ RANDOM_DATA_ENABLED = false ด้านล่าง
// หรือ set window.RANDOM_DATA_ENABLED = false ก่อน DOMContentLoaded
//
// วิธีใช้:
// 1) include <script src="/modules/backend/assets/js/random-data.js"></script>
//    (ก่อน script หลักของหน้า)
// 2) ในไฟล์ JS ของหน้า เรียก:
//      registerRandomFill({
//        target: "page" | "#modalId",
//        fill: function () { ... ใช้ setFieldValue, randomXxx() ... }
//      });
//    เรียกได้หลายครั้งต่อหน้า (หลาย modal) ได้
// ============================================================

// ==== ปิด/เปิดใช้งานปุ่มสุ่มข้อมูลทั้งระบบ ====
var RANDOM_DATA_ENABLED = true;

// ============ Thai fake data pools ============
var RD_FIRST_NAMES = ["สมชาย", "สมศรี", "วิชัย", "มานี", "ปิยะ", "สุภาพร", "อนุชา", "ณัฐพล", "ธนพร", "กนกวรรณ", "ชัยวัฒน์", "พิมพ์ใจ", "รัชนีกร", "ศิริพร", "กฤษดา", "ภัทรพล", "ธัญญา", "กิตติ", "อรทัย", "ประภาส"];
var RD_LAST_NAMES = ["ใจดี", "สุขใจ", "วงศ์ไทย", "ศรีสุข", "จันทร์เพ็ญ", "ทองคำ", "บุญมี", "พิทักษ์พงศ์", "ธรรมชาติ", "นามดี", "แสงทอง", "รุ่งเรือง", "พัฒนาการ", "สวัสดิ์", "เจริญยิ่ง"];
var RD_COMPANY_PREFIX = ["บริษัท", "ห้างหุ้นส่วน", "ร้าน"];
var RD_COMPANY_CORE = ["ไทยพัฒนา", "เจริญชัย", "สุขสวัสดิ์", "ทรัพย์ทวี", "มั่งมี", "รุ่งเรืองทรัพย์", "แสงอรุณ", "เอกพรการค้า", "สามพี่น้อง", "ชัยพัฒน์", "กรุงทอง", "สยามเทรดดิ้ง", "พรพิพัฒน์"];
var RD_COMPANY_SUFFIX = ["จำกัด", "จำกัด (มหาชน)", ""];
var RD_BANKS = ["กสิกรไทย", "ไทยพาณิชย์", "กรุงเทพ", "กรุงไทย", "ทหารไทยธนชาต", "กรุงศรีอยุธยา", "ออมสิน", "CIMB Thai"];
var RD_PROVINCES = ["กรุงเทพฯ", "เชียงใหม่", "ภูเก็ต", "ชลบุรี", "นนทบุรี", "ปทุมธานี", "ขอนแก่น", "อุดรธานี", "นครราชสีมา", "สงขลา"];
var RD_STREETS = ["สุขุมวิท", "รัชดาภิเษก", "พหลโยธิน", "วิภาวดีรังสิต", "ลาดพร้าว", "รามคำแหง", "เพชรบุรี", "สาทร", "สีลม", "พระราม 9"];
var RD_PRODUCTS = ["เสื้อยืดคอกลม", "กางเกงยีนส์ขายาว", "รองเท้าผ้าใบ", "กระเป๋าสะพาย", "หมวกแก๊ป", "นาฬิกาข้อมือ", "แว่นกันแดด", "เข็มขัดหนัง", "ผ้าพันคอ", "ถุงเท้ากีฬา", "เสื้อแจ็คเก็ต", "กระเป๋าสตางค์", "กางเกงขาสั้น", "เสื้อเชิ้ต", "รองเท้าแตะ"];
var RD_CATEGORIES = ["เสื้อผ้า", "รองเท้า", "เครื่องประดับ", "อาหาร", "เครื่องใช้ไฟฟ้า", "ของใช้ในบ้าน", "หนังสือ", "กระเป๋า", "เครื่องเขียน"];
var RD_UNITS = [
  { name: "ชิ้น", abbr: "ชิ้น" },
  { name: "กล่อง", abbr: "กล่อง" },
  { name: "แพ็ค", abbr: "pk" },
  { name: "กิโลกรัม", abbr: "kg" },
  { name: "ลิตร", abbr: "L" },
  { name: "เมตร", abbr: "m" },
  { name: "โหล", abbr: "dz" },
];
var RD_COUPON_WORDS = ["SAVE", "DISCOUNT", "PROMO", "MEMBER", "NEW", "SUPER", "MEGA", "HOT", "VIP", "FLASH"];
var RD_NOTES = ["ตรวจสอบแล้ว", "รอการยืนยัน", "ลูกค้าประจำ", "ชำระครบถ้วน", "สินค้าคุณภาพดี", "ส่งด่วน", "โปรดติดต่อกลับ", "-"];
var RD_CARRIERS = ["ไทยโพสต์", "Kerry Express", "Flash Express", "J&T Express", "DHL", "Ninja Van", "SCG Express"];
var RD_ZONES = ["กรุงเทพ-ปริมณฑล", "ภาคเหนือ", "ภาคใต้", "ภาคอีสาน", "ภาคตะวันออก", "ภาคกลาง", "ภาคตะวันตก"];

// ============ Random helpers ============
function rdPick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function rdInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function rdFloat(min, max, decimals) {
  var p = Math.pow(10, decimals == null ? 2 : decimals);
  return Math.round((Math.random() * (max - min) + min) * p) / p;
}
function rdBool(trueRatio) { return Math.random() < (trueRatio == null ? 0.5 : trueRatio); }

function randomPersonName() { return rdPick(RD_FIRST_NAMES) + " " + rdPick(RD_LAST_NAMES); }
function randomFirstName() { return rdPick(RD_FIRST_NAMES); }
function randomLastName() { return rdPick(RD_LAST_NAMES); }

function randomCompanyName() {
  var pre = rdPick(RD_COMPANY_PREFIX);
  var core = rdPick(RD_COMPANY_CORE);
  var suf = rdPick(RD_COMPANY_SUFFIX);
  return (pre + " " + core + (suf ? " " + suf : "")).trim();
}

function randomUsername() {
  var base = rdPick(["user", "admin", "staff", "manager", "demo", "test"]);
  return base + rdInt(100, 9999);
}

function randomPhone() {
  var prefixes = ["08", "09", "06"];
  var p = rdPick(prefixes);
  return p + String(rdInt(10000000, 99999999));
}

function randomEmail(seed) {
  var domains = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "mail.com"];
  var local = (seed || rdPick(["john", "mary", "mike", "ann", "eve", "bob", "alex"])) + rdInt(10, 9999);
  return local.toLowerCase() + "@" + rdPick(domains);
}

function randomAddress() {
  return rdInt(1, 999) + "/" + rdInt(1, 99) + " ถ." + rdPick(RD_STREETS) +
    " " + rdPick(RD_PROVINCES) + " " + rdInt(10000, 99999);
}

function randomDate(offsetDays) {
  var d = new Date();
  d.setDate(d.getDate() + (offsetDays || 0));
  return d.toISOString().slice(0, 10);
}
function randomPastDate(maxBack) { return randomDate(-rdInt(0, maxBack || 30)); }
function randomFutureDate(maxAhead) { return randomDate(rdInt(1, maxAhead || 60)); }

function randomMoney(min, max) { return rdFloat(min == null ? 100 : min, max == null ? 10000 : max, 2); }
function randomQty(min, max) { return rdInt(min == null ? 1 : min, max == null ? 50 : max); }

function randomAccountNumber() {
  return String(rdInt(100, 999)) + "-" + rdInt(1, 9) + "-" + String(rdInt(10000, 99999));
}

function randomCouponCode() {
  return rdPick(RD_COUPON_WORDS) + rdInt(10, 99);
}

function randomSKU(prefix) {
  return (prefix || "SKU") + "-" + rdInt(1000, 9999);
}

function randomProductName() { return rdPick(RD_PRODUCTS); }
function randomCategoryName() { return rdPick(RD_CATEGORIES); }
function randomBankName() { return "ธนาคาร" + rdPick(RD_BANKS); }
function randomNote() { return rdPick(RD_NOTES); }
function randomCarrier() { return rdPick(RD_CARRIERS); }
function randomZone() { return rdPick(RD_ZONES); }
function randomUnit() { return rdPick(RD_UNITS); }

// ============ DOM helpers ============
function setFieldValue(id, value) {
  var el = document.getElementById(id);
  if (!el) return false;
  el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

function setCheckboxValue(id, checked) {
  var el = document.getElementById(id);
  if (!el) return false;
  el.checked = !!checked;
  el.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

function pickRandomSelectOption(selectId, opts) {
  var sel = document.getElementById(selectId);
  if (!sel || !sel.options || !sel.options.length) return null;
  var arr = Array.prototype.slice.call(sel.options);
  if (!opts || opts.includeEmpty !== true) {
    arr = arr.filter(function (o) { return o.value !== ""; });
  }
  if (!arr.length) return null;
  var picked = rdPick(arr);
  sel.value = picked.value;
  sel.dispatchEvent(new Event("change", { bubbles: true }));
  return picked.value;
}

// ============ Button (UI) ============
(function injectStyles() {
  if (document.getElementById("rd-styles")) return;
  var s = document.createElement("style");
  s.id = "rd-styles";
  s.textContent =
    ".btn-random-data { display:inline-flex; align-items:center; gap:6px; padding:6px 12px; " +
    "  background:linear-gradient(135deg,#f59e0b,#f97316); color:#fff; border:none; border-radius:10px; " +
    "  font-size:11px; font-weight:700; cursor:pointer; box-shadow:0 4px 12px rgba(245,158,11,0.25); " +
    "  transition:transform 0.15s ease, box-shadow 0.15s ease; text-decoration:none; }" +
    ".btn-random-data:hover { transform:translateY(-1px); box-shadow:0 8px 18px rgba(245,158,11,0.35); }" +
    ".btn-random-data:active { transform:translateY(0); }" +
    ".btn-random-data i { width:12px; height:12px; }" +
    /* placement: modal header puts button on the left of close */
    ".modal-header .btn-random-data { margin-right:auto; }";
  document.head.appendChild(s);
})();

function buildRandomButton(onClick) {
  var btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn-random-data";
  btn.innerHTML = '<i data-lucide="dice-5"></i><span>สุ่มข้อมูล</span>';
  btn.title = "สร้างข้อมูลตัวอย่างแบบสุ่ม (dev only)";
  btn.addEventListener("click", function (e) {
    e.preventDefault();
    try { onClick(); } catch (err) { console.error("random fill error:", err); }
  });
  return btn;
}

// ============ Registration ============
var _rdRegistry = [];

/**
 * registerRandomFill({ target, fill })
 *   target: "page" → ปุ่มแทรกใน .content-header (ถัดจาก title)
 *           "#modalId" → ปุ่มแทรกใน .modal-header ของ modal นั้น
 *   fill:  function() — โค้ดที่เติมค่าลง input (ใช้ setFieldValue, randomXxx)
 */
function registerRandomFill(opts) {
  if (!opts || typeof opts.fill !== "function") return;
  _rdRegistry.push(opts);
  // ถ้า DOM โหลดแล้ว install ทันที
  if (document.readyState !== "loading") _installOne(opts);
}

function _flagEnabled() {
  // รองรับทั้ง window.RANDOM_DATA_ENABLED override และ const ในไฟล์นี้
  if (typeof window.RANDOM_DATA_ENABLED !== "undefined") return !!window.RANDOM_DATA_ENABLED;
  return !!RANDOM_DATA_ENABLED;
}

function _installOne(entry) {
  if (!_flagEnabled()) return;
  var container = null;
  if (entry.target === "page") {
    container = document.querySelector(".content-header");
  } else if (typeof entry.target === "string") {
    container = document.querySelector(entry.target + " .modal-header");
  }
  if (!container) return;
  if (container.querySelector(".btn-random-data")) return;
  var btn = buildRandomButton(entry.fill);
  if (entry.target === "page") {
    // ให้อยู่ขวาสุดของ content-header โดย append (มี back button อยู่แล้ว)
    container.appendChild(btn);
  } else {
    // modal-header: แทรกก่อน .modal-close เพื่อให้อยู่ติดซ้ายของปุ่ม X
    var closeBtn = container.querySelector(".modal-close");
    if (closeBtn) container.insertBefore(btn, closeBtn);
    else container.appendChild(btn);
  }
  if (typeof lucide !== "undefined") lucide.createIcons();
}

function installAllRandomButtons() {
  if (!_flagEnabled()) return;
  _rdRegistry.forEach(_installOne);
}

document.addEventListener("DOMContentLoaded", installAllRandomButtons);
