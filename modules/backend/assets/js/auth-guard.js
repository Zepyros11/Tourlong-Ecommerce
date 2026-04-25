// ============================================================
// auth-guard.js — Auth & Session Utility (ใช้ร่วมทุกหน้า)
// ------------------------------------------------------------
// ดูแล: session, logout, activity log, password policy,
//       login attempt limit, remember me
// วิธีใช้:
//   1) <script src="/modules/backend/assets/js/auth-guard.js"></script>
//   2) เรียก requireAuth() บนหน้า backend ที่ต้อง login
//   3) เรียก logActivity(action, module, description) เมื่อมี event
// ============================================================

var AUTH_KEYS = {
  ATTEMPTS: "pathara_login_attempts",
  POLICY: "pathara_password_policy",
  SESSION: "pathara_session",   // sessionStorage: full user object JSON
  REMEMBER: "pathara_remember"  // localStorage:   full user object JSON (remember me)
};

// ============ Field mapping (Supabase snake_case ↔ JS camelCase) ============
function normalizeUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    username: row.username,
    phone: row.phone || "",
    password: row.password,
    role: row.role,
    status: row.status,
    lastLogin: row.last_login || row.lastLogin || "",
    mustChangePassword: row.must_change_password === true || row.mustChangePassword === true
  };
}

function denormalizeUser(user) {
  var row = {};
  if (user.name !== undefined) row.name = user.name;
  if (user.email !== undefined) row.email = user.email;
  if (user.username !== undefined) row.username = user.username;
  if (user.phone !== undefined) row.phone = user.phone;
  if (user.password !== undefined) row.password = user.password;
  if (user.role !== undefined) row.role = user.role;
  if (user.status !== undefined) row.status = user.status;
  if (user.lastLogin !== undefined) row.last_login = user.lastLogin;
  if (user.mustChangePassword !== undefined) row.must_change_password = user.mustChangePassword;
  return row;
}

// ============ Session ============
function getCurrentUser() {
  var raw = sessionStorage.getItem(AUTH_KEYS.SESSION) || localStorage.getItem(AUTH_KEYS.REMEMBER);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (e) { return null; }
}

function setCurrentUser(user, remember) {
  var json = JSON.stringify(user);
  sessionStorage.setItem(AUTH_KEYS.SESSION, json);
  if (remember) {
    localStorage.setItem(AUTH_KEYS.REMEMBER, json);
  } else {
    localStorage.removeItem(AUTH_KEYS.REMEMBER);
  }
}

function logout(redirect) {
  var user = getCurrentUser();
  if (user) logActivity("logout", "Auth", "ออกจากระบบ: " + user.name);
  sessionStorage.removeItem(AUTH_KEYS.SESSION);
  localStorage.removeItem(AUTH_KEYS.REMEMBER);
  if (redirect !== false) {
    window.location.href = resolveAuthPath("login.html");
  }
}

function resolveAuthPath(file) {
  return "/modules/backend/auth/" + file;
}

function requireAuth() {
  var user = getCurrentUser();
  if (!user) {
    window.location.href = resolveAuthPath("login.html");
    return null;
  }
  if (user.status !== "active") {
    logout();
    return null;
  }
  return user;
}

// ============ Activity Log (Supabase) ============
function logActivity(action, moduleName, description) {
  if (typeof createActivityLogDB !== "function") return;
  var user = getCurrentUser();
  createActivityLogDB({
    datetime: new Date().toISOString(),
    user_name: user ? user.name : "Guest",
    action: action,
    module: moduleName,
    description: description
  }).catch(function () { /* silent: ไม่ขัดจังหวะการทำงานหลัก */ });
}

// ============ Login Attempt Limit ============
var LOCKOUT_MINUTES = 15;
var MAX_ATTEMPTS = 5;

function loadAttempts() {
  try {
    var data = localStorage.getItem(AUTH_KEYS.ATTEMPTS);
    if (data) return JSON.parse(data);
  } catch (e) {}
  return {};
}

function saveAttempts(map) {
  localStorage.setItem(AUTH_KEYS.ATTEMPTS, JSON.stringify(map));
}

function getLockInfo(identifier) {
  var key = (identifier || "").toLowerCase();
  var map = loadAttempts();
  var rec = map[key];
  if (!rec) return { locked: false, count: 0, remaining: 0 };
  if (rec.lockedUntil && rec.lockedUntil > Date.now()) {
    return { locked: true, count: rec.count, remaining: Math.ceil((rec.lockedUntil - Date.now()) / 60000) };
  }
  if (rec.lockedUntil && rec.lockedUntil <= Date.now()) {
    delete map[key];
    saveAttempts(map);
    return { locked: false, count: 0, remaining: 0 };
  }
  return { locked: false, count: rec.count || 0, remaining: 0 };
}

function recordLoginFailure(identifier) {
  var key = (identifier || "").toLowerCase();
  var map = loadAttempts();
  var rec = map[key] || { count: 0 };
  rec.count = (rec.count || 0) + 1;
  if (rec.count >= MAX_ATTEMPTS) {
    rec.lockedUntil = Date.now() + LOCKOUT_MINUTES * 60000;
  }
  map[key] = rec;
  saveAttempts(map);
  return rec;
}

function clearLoginFailures(identifier) {
  var key = (identifier || "").toLowerCase();
  var map = loadAttempts();
  delete map[key];
  saveAttempts(map);
}

// ============ Password Policy ============
function getPasswordPolicy() {
  var defaults = {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireDigit: true,
    requireSpecial: false
  };
  try {
    var data = localStorage.getItem(AUTH_KEYS.POLICY);
    if (data) return Object.assign(defaults, JSON.parse(data));
  } catch (e) {}
  return defaults;
}

function savePasswordPolicy(policy) {
  localStorage.setItem(AUTH_KEYS.POLICY, JSON.stringify(policy));
}

function validatePassword(pwd, policy) {
  policy = policy || getPasswordPolicy();
  if (!pwd) return "กรุณากรอกรหัสผ่าน";
  if (pwd.length < policy.minLength) return "รหัสผ่านต้องมีอย่างน้อย " + policy.minLength + " ตัวอักษร";
  if (policy.requireUppercase && !/[A-Z]/.test(pwd)) return "รหัสผ่านต้องมีตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว";
  if (policy.requireLowercase && !/[a-z]/.test(pwd)) return "รหัสผ่านต้องมีตัวพิมพ์เล็กอย่างน้อย 1 ตัว";
  if (policy.requireDigit && !/\d/.test(pwd)) return "รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว";
  if (policy.requireSpecial && !/[^A-Za-z0-9]/.test(pwd)) return "รหัสผ่านต้องมีสัญลักษณ์พิเศษอย่างน้อย 1 ตัว";
  return null;
}

function calcPasswordStrength(pwd) {
  if (!pwd) return 0;
  var score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
  if (/\d/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  return Math.min(4, score);
}

// ============ Generate temp password ============
function generateTempPassword(len) {
  len = len || 10;
  var chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  var out = "";
  for (var i = 0; i < len; i++) {
    out += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return out;
}

// ============ Wire sidebar + topbar logout (auto) ============
document.addEventListener("DOMContentLoaded", function() {
  var sidebarBtn = document.querySelector(".sidebar-logout");
  if (sidebarBtn) {
    sidebarBtn.addEventListener("click", function(e) {
      e.preventDefault();
      if (confirm("ต้องการออกจากระบบใช่ไหม?")) logout();
    });
  }
});
