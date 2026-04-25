// ============================================================
// manager-password.js — Manager Password (break-glass) helper
// ------------------------------------------------------------
// ใช้ยืนยันก่อนการกระทำ destructive (reset, cancel in production)
// เก็บ SHA-256 hash + salt ใน app_settings['manager_password_hash']
//
// API:
//   hasManagerPassword()           → Promise<boolean>
//   setManagerPassword(new, old?)  → Promise (ถ้ามี old ต้องตรง)
//   verifyManagerPassword(pwd)     → Promise<boolean>
//   requireManagerPassword(desc)   → Promise (resolve=ผ่าน, reject=ยกเลิก/ผิด)
// ============================================================

var MGR_PWD_SALT = "pathara-mgr-v1-";

function sha256Hex(str) {
  var enc = new TextEncoder();
  var data = enc.encode(str);
  return crypto.subtle.digest("SHA-256", data).then(function (buf) {
    var arr = Array.from(new Uint8Array(buf));
    return arr.map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
  });
}

function hashManagerPassword(pwd) {
  return sha256Hex(MGR_PWD_SALT + pwd);
}

function hasManagerPassword() {
  return fetchAppSetting("manager_password_hash").then(function (val) {
    return typeof val === "string" && val.length === 64; // 64 = SHA-256 hex length
  });
}

function setManagerPassword(newPassword, oldPassword) {
  if (!newPassword || newPassword.length < 6) {
    return Promise.reject(new Error("รหัสผ่านต้องยาวอย่างน้อย 6 ตัว"));
  }
  return hasManagerPassword().then(function (exists) {
    var verifyPromise = exists
      ? verifyManagerPassword(oldPassword).then(function (ok) {
          if (!ok) throw new Error("รหัสเดิมไม่ถูกต้อง");
        })
      : Promise.resolve();
    return verifyPromise
      .then(function () { return hashManagerPassword(newPassword); })
      .then(function (hash) { return updateAppSetting("manager_password_hash", hash); });
  });
}

function verifyManagerPassword(pwd) {
  if (!pwd) return Promise.resolve(false);
  return Promise.all([
    fetchAppSetting("manager_password_hash"),
    hashManagerPassword(pwd),
  ]).then(function (r) {
    var stored = r[0];
    var input = r[1];
    if (!stored || typeof stored !== "string") return false;
    return stored === input;
  });
}

// Show modal, require password, resolve on correct or reject on wrong/cancel
function requireManagerPassword(actionDescription) {
  return new Promise(function (resolve, reject) {
    // สร้าง modal overlay dynamic (ไม่ต้อง hard-code HTML ทุกหน้า)
    var overlay = document.createElement("div");
    overlay.className = "modal-overlay active";
    overlay.style.cssText = "position:fixed;inset:0;background:rgba(15,23,42,0.5);backdrop-filter:blur(3px);z-index:10050;display:flex;align-items:center;justify-content:center;";

    // ใช้ id/name สุ่มเพื่อหลอก browser autofill
    var uniqId = "mgrPwdInput_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);

    overlay.innerHTML =
      '<div class="modal" style="max-width:440px;width:94vw;opacity:1;transform:none;">' +
        '<div class="modal-header">' +
          '<h3 class="modal-title">🔒 ต้องการรหัส Manager</h3>' +
          '<button class="modal-close" data-mgr-cancel><i data-lucide="x"></i></button>' +
        '</div>' +
        '<div class="modal-body">' +
          '<p style="margin:0 0 12px;font-size:11px;color:#64748b;line-height:1.6;">' +
            'การกระทำนี้ต้องยืนยันโดย Manager Password:<br/>' +
            '<strong style="color:#0f172a;">' + (actionDescription || "") + '</strong>' +
          '</p>' +
          // dummy field กัน autofill
          '<input type="text" style="position:absolute;left:-9999px;top:-9999px;" tabindex="-1" autocomplete="username" />' +
          '<input type="password" style="position:absolute;left:-9999px;top:-9999px;" tabindex="-1" autocomplete="new-password" />' +
          '<div class="form-group">' +
            '<label class="form-label">Manager Password</label>' +
            '<input type="password" class="form-input" id="' + uniqId + '" name="' + uniqId + '" autocomplete="new-password" placeholder="••••••••" readonly />' +
          '</div>' +
          '<p id="mgrPwdError" style="display:none;margin:6px 0 0;font-size:10px;color:#ef4444;font-weight:700;"></p>' +
        '</div>' +
        '<div class="modal-footer">' +
          '<button class="btn-secondary" data-mgr-cancel>ยกเลิก</button>' +
          '<button class="btn-primary" style="background:#ef4444;" data-mgr-confirm>ยืนยัน</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);
    if (typeof lucide !== "undefined") lucide.createIcons();

    var input = overlay.querySelector("#" + uniqId);
    var errEl = overlay.querySelector("#mgrPwdError");
    // เคลียร์ค่า + เอา readonly ออกตอน focus (trick กัน autofill)
    input.value = "";
    setTimeout(function () {
      input.removeAttribute("readonly");
      input.value = "";
      input.focus();
    }, 50);

    function cleanup() { overlay.remove(); }
    function fail(msg) {
      errEl.textContent = msg;
      errEl.style.display = "block";
      input.value = "";
      input.focus();
    }

    overlay.querySelectorAll("[data-mgr-cancel]").forEach(function (el) {
      el.addEventListener("click", function () { cleanup(); reject(new Error("cancelled")); });
    });

    overlay.querySelector("[data-mgr-confirm]").addEventListener("click", submit);
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") submit();
      if (e.key === "Escape") { cleanup(); reject(new Error("cancelled")); }
    });

    function submit() {
      var pwd = input.value;
      if (!pwd) { fail("กรุณากรอกรหัส"); return; }
      verifyManagerPassword(pwd).then(function (ok) {
        if (ok) {
          cleanup();
          // Log activity
          if (typeof createActivityLogDB === "function") {
            createActivityLogDB({
              datetime: new Date().toISOString(),
              user_name: (typeof getCurrentUser === "function" ? (getCurrentUser() || {}).name : "") || "unknown",
              action: "manager_auth",
              module: "Developer",
              description: actionDescription || "Manager password used",
            }).catch(function () {});
          }
          resolve();
        } else {
          fail("รหัสไม่ถูกต้อง");
        }
      }).catch(function (e) {
        fail("เกิดข้อผิดพลาด: " + (e.message || "verify failed"));
      });
    }
  });
}
