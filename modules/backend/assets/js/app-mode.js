// ============================================================
// app-mode.js — App-wide mode toggle (test / production)
// ------------------------------------------------------------
// ดึง app_mode จากตาราง app_settings, แสดง banner แดงถ้า test mode
// วิธีใช้: โหลดใน <script src="..."> ของทุกหน้า backend
//   ใช้ cache ใน sessionStorage เพื่อไม่ต้อง fetch ทุกหน้า
// ============================================================

var APP_MODE_KEY = "pathara_app_mode_cache";
var APP_MODE_TTL = 5 * 1000; // cache 5 วินาที เท่านั้น (ลด stale state เวลาสลับ mode)

function fetchAppSetting(key) {
  return fetch(SUPABASE_URL + "/rest/v1/app_settings?key=eq." + encodeURIComponent(key) + "&select=value&limit=1", {
    headers: supabaseHeaders,
  }).then(function (res) { return res.json(); })
    .then(function (rows) { return rows && rows.length ? rows[0].value : null; });
}

function updateAppSetting(key, value) {
  return fetch(SUPABASE_URL + "/rest/v1/app_settings?key=eq." + encodeURIComponent(key), {
    method: "PATCH",
    headers: supabaseHeaders,
    body: JSON.stringify({ value: value, updated_at: new Date().toISOString() }),
  });
}

function getCachedAppMode() {
  try {
    var raw = sessionStorage.getItem(APP_MODE_KEY);
    if (!raw) return null;
    var obj = JSON.parse(raw);
    if (Date.now() - obj.ts > APP_MODE_TTL) return null;
    return obj.mode;
  } catch (e) { return null; }
}

function setCachedAppMode(mode) {
  try {
    sessionStorage.setItem(APP_MODE_KEY, JSON.stringify({ mode: mode, ts: Date.now() }));
  } catch (e) {}
}

function clearAppModeCache() {
  try { sessionStorage.removeItem(APP_MODE_KEY); } catch (e) {}
}

function getAppMode() {
  var cached = getCachedAppMode();
  if (cached) return Promise.resolve(cached);
  return fetchAppSetting("app_mode").then(function (val) {
    var mode = (typeof val === "string") ? val : "test";
    setCachedAppMode(mode);
    return mode;
  }).catch(function () { return "test"; });
}

// Force-refresh mode (ignore cache) — ใช้ก่อน destructive action
function getAppModeFresh() {
  clearAppModeCache();
  return getAppMode();
}

// Assert mode ก่อน action — reject ถ้า mode ไม่ตรง
function assertTestMode(actionName) {
  return getAppModeFresh().then(function (mode) {
    if (mode !== "test") {
      showModeBlockedModal(actionName);
      throw new Error("not_test_mode");
    }
    return mode;
  });
}

// Styled modal แทน browser alert — แจ้งเตือนว่าอยู่ production mode
function showModeBlockedModal(actionName) {
  var overlay = document.createElement("div");
  overlay.className = "modal-overlay active";
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(15,23,42,0.55);backdrop-filter:blur(3px);z-index:10060;display:flex;align-items:center;justify-content:center;";
  overlay.innerHTML =
    '<div class="modal" style="max-width:420px;width:94vw;opacity:1;transform:none;">' +
      '<div style="text-align:center;padding:26px 24px 16px;">' +
        '<div style="width:56px;height:56px;border-radius:50%;background:#fef2f2;color:#dc2626;display:flex;align-items:center;justify-content:center;margin:0 auto 12px;font-size:28px;">🚫</div>' +
        '<h3 style="margin:0 0 6px;font-size:15px;font-weight:800;color:#0f172a;">ทำรายการไม่ได้ใน Production Mode</h3>' +
        '<p style="margin:0 0 4px;font-size:12px;color:#334155;line-height:1.55;">' +
          '<strong style="color:#dc2626;">' + (actionName || "การลบ") + '</strong> ทำได้เฉพาะ <strong>TEST MODE</strong> เท่านั้น' +
        '</p>' +
        '<p style="margin:0;font-size:11px;color:#64748b;line-height:1.55;">' +
          'กรุณาสลับเป็น TEST MODE ที่ <strong>เครื่องมือผู้พัฒนา</strong> ก่อน<br/>' +
          'หรือใช้ปุ่ม <strong>ยกเลิก</strong> แทน (จะสร้าง audit trail ถูกต้อง)' +
        '</p>' +
      '</div>' +
      '<div style="padding:12px 18px 16px;display:flex;justify-content:center;gap:8px;">' +
        '<button class="btn-primary" id="mbmOK" style="background:#dc2626;padding:8px 28px;">เข้าใจแล้ว</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);
  var btn = overlay.querySelector("#mbmOK");
  function close() { overlay.remove(); }
  btn.addEventListener("click", close);
  overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
  document.addEventListener("keydown", function esc(e) {
    if (e.key === "Escape") { close(); document.removeEventListener("keydown", esc); }
  });
  btn.focus();
}

function renderTestModeBanner() {
  if (document.getElementById("testModeBanner")) return;
  var banner = document.createElement("div");
  banner.id = "testModeBanner";
  banner.style.cssText =
    "position:fixed;top:0;left:0;right:0;z-index:10000;" +
    "background:linear-gradient(90deg,#dc2626,#ef4444,#dc2626);" +
    "color:#fff;padding:8px 16px;" +
    "font-size:12px;font-weight:800;letter-spacing:0.3px;" +
    "text-align:center;box-shadow:0 2px 8px rgba(220,38,38,0.35);" +
    "display:flex;align-items:center;justify-content:center;gap:10px;";
  banner.innerHTML =
    '<span style="font-size:14px;">⚠️</span>' +
    '<span>TEST MODE — ข้อมูลทั้งหมดไม่ใช่ production, สามารถลบ/รีเซ็ตข้อมูลได้</span>' +
    '<span style="font-size:14px;">⚠️</span>';
  document.body.insertBefore(banner, document.body.firstChild);
  // ดันเนื้อหาหลักลงมา
  var layout = document.querySelector(".layout");
  if (layout) layout.style.paddingTop = "34px";
}

function removeTestModeBanner() {
  var b = document.getElementById("testModeBanner");
  if (b) b.remove();
  var layout = document.querySelector(".layout");
  if (layout) layout.style.paddingTop = "";
}

function applyAppModeUI() {
  getAppMode().then(function (mode) {
    if (mode === "test") renderTestModeBanner();
    else removeTestModeBanner();
  });
}

// auto-apply on DOMContentLoaded
document.addEventListener("DOMContentLoaded", applyAppModeUI);
