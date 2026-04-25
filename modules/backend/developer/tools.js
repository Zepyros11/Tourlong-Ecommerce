// ============================================================
// tools.js — Developer Tools page
// ============================================================

// Tables ที่ถือว่าเป็น "transactional" (ลบแบบ reset ได้)
// เรียงลำดับลบจากลูก → พ่อ (เพื่อไม่ชน FK)
var TRANSACTIONAL_TABLES = [
  // Stock movements อ้างหลายตัว ลบก่อน
  "stock_movements",
  // Returns
  "purchase_return_items", "purchase_returns",
  "sales_return_items", "sales_returns",
  // GR
  "goods_receipt_items", "goods_receipts",
  // PO
  "purchase_order_items", "purchase_orders",
  // SO
  "sales_order_items", "sales_orders",
  // Finance / Shipping
  "payments", "invoices",
  "expenses",
  "shipments",
  "initial_stock",
];

// Master data ที่ลบด้วยตอน "Reset All" (เว้น users, company_info, app_settings, roles)
var MASTER_DATA_TABLES = [
  "product_unit_conversions",
  "products",
  "categories",
  "suppliers",
  "customers",
  "warehouses",
  "units",
  "shipping_rates",
  "bank_accounts",
  "coupons",
  "discounts",
  "promotion_package_items",
  "promotion_packages",
  "blocks",
  "pages",
  "activity_log",
];

// ทั้งหมดที่ดู stat ใน DB Statistics
var ALL_TABLES = TRANSACTIONAL_TABLES.concat(MASTER_DATA_TABLES).concat(["users", "roles", "company_info", "app_settings"]);

// ============ Toast ============
function showToast(title, msg) {
  var toast = document.getElementById("toast");
  document.getElementById("toastTitle").textContent = title;
  document.getElementById("toastMsg").textContent = msg || "";
  toast.style.opacity = "1";
  toast.style.transform = "translateX(-50%) translateY(0)";
  setTimeout(function () {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(-50%) translateY(-120px)";
  }, 2400);
}

// ============ Mode Toggle ============
function renderModeUI(mode) {
  var box = document.getElementById("modeSwitchBox");
  var label = document.getElementById("modeCurrentLabel");
  box.classList.remove("test", "prod");
  if (mode === "production") {
    box.classList.add("prod");
    label.innerHTML = '<span style="color:#10b981;">🟢 PRODUCTION</span>';
  } else {
    box.classList.add("test");
    label.innerHTML = '<span style="color:#ef4444;">🔴 TEST MODE</span>';
  }
}

function handleModeToggle() {
  getAppMode().then(function (currentMode) {
    var newMode = currentMode === "production" ? "test" : "production";
    var actionText = "สลับโหมดจาก " + currentMode + " → " + newMode;

    hasManagerPassword().then(function (hasPwd) {
      if (!hasPwd) {
        alert("กรุณาตั้ง Manager Password ก่อน สลับโหมดได้");
        return;
      }
      requireManagerPassword(actionText).then(function () {
        updateAppSetting("app_mode", newMode).then(function () {
          clearAppModeCache();
          logDevActivity("mode_toggle", actionText);
          renderModeUI(newMode);
          // Re-render banner
          if (typeof removeTestModeBanner === "function") removeTestModeBanner();
          if (newMode === "test" && typeof renderTestModeBanner === "function") renderTestModeBanner();
          showToast("สลับโหมดแล้ว", "โหมดปัจจุบัน: " + newMode);
        }).catch(function (err) {
          console.error(err);
          showToast("ผิดพลาด", "สลับโหมดไม่สำเร็จ");
        });
      }).catch(function () { /* cancelled */ });
    });
  });
}

// ============ Manager Password ============
function refreshPasswordStatus() {
  hasManagerPassword().then(function (has) {
    var el = document.getElementById("pwdStatusLabel");
    var btnLabel = document.getElementById("setPwdBtnLabel");
    if (has) {
      el.innerHTML = '<span style="color:#10b981;">✓ ตั้งค่าแล้ว</span>';
      btnLabel.textContent = "เปลี่ยน Manager Password";
    } else {
      el.innerHTML = '<span style="color:#ef4444;">⚠️ ยังไม่ได้ตั้งค่า — ปุ่ม destructive ใช้ไม่ได้</span>';
      btnLabel.textContent = "ตั้งค่า Manager Password";
    }
  });
}

function openSetPasswordModal() {
  hasManagerPassword().then(function (has) {
    document.getElementById("setPwdModalTitle").textContent = has ? "เปลี่ยน Manager Password" : "ตั้ง Manager Password";
    document.getElementById("oldPwdGroup").style.display = has ? "block" : "none";
    document.getElementById("pwdFormError").style.display = "none";

    // กัน autofill: set readonly → เคลียร์ → เอา readonly ออกตอน focus
    ["oldPwdInput", "newPwdInput", "newPwdConfirmInput"].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.setAttribute("readonly", "readonly");
      el.value = "";
    });

    openModalById("setPwdModal", function () {
      setTimeout(function () {
        ["oldPwdInput", "newPwdInput", "newPwdConfirmInput"].forEach(function (id) {
          var el = document.getElementById(id);
          if (!el) return;
          el.removeAttribute("readonly");
          el.value = "";
        });
        var focusId = has ? "oldPwdInput" : "newPwdInput";
        var focusEl = document.getElementById(focusId);
        if (focusEl) focusEl.focus();
      }, 50);
    });
  });
}

function submitSetPassword() {
  var oldPwd = document.getElementById("oldPwdInput").value;
  var newPwd = document.getElementById("newPwdInput").value;
  var confirmPwd = document.getElementById("newPwdConfirmInput").value;
  var err = document.getElementById("pwdFormError");

  function fail(msg) { err.textContent = msg; err.style.display = "block"; }

  if (newPwd.length < 6) return fail("รหัสใหม่ต้องยาวอย่างน้อย 6 ตัว");
  if (newPwd !== confirmPwd) return fail("รหัสยืนยันไม่ตรงกับรหัสใหม่");

  setManagerPassword(newPwd, oldPwd)
    .then(function () {
      logDevActivity("manager_password_set", "ตั้ง/เปลี่ยน Manager Password");
      closeModalById("setPwdModal");
      refreshPasswordStatus();
      showToast("บันทึกสำเร็จ", "Manager Password ถูกอัพเดท");
    })
    .catch(function (e) { fail(e.message || "บันทึกไม่สำเร็จ"); });
}

// ============ Reset Transactional ============
function handleResetTransactional() {
  hasManagerPassword().then(function (has) {
    if (!has) {
      alert("กรุณาตั้ง Manager Password ก่อน");
      return;
    }
    showConfirm({
      title: "⚠️ รีเซ็ตข้อมูล Transactional",
      message:
        "ต้องการลบข้อมูลทั้งหมดใน " + TRANSACTIONAL_TABLES.length + " ตาราง:<br/>" +
        '<code style="font-size:10px;color:#64748b;">' + TRANSACTIONAL_TABLES.join(", ") + '</code><br/><br/>' +
        '<strong style="color:#ef4444;">⚠️ ไม่สามารถกู้คืนได้</strong>',
      okText: "Reset Data",
      okColor: "#ef4444",
      onConfirm: function () {
        requireManagerPassword("Reset Transactional Data — ลบ " + TRANSACTIONAL_TABLES.length + " ตาราง")
          .then(doResetTransactional)
          .catch(function () { /* cancelled */ });
      },
    });
  });
}

function doResetTables(tables, actionLabel) {
  showToast("กำลังรีเซ็ต...", "อย่าปิดหน้าจนกว่าจะเสร็จ");
  var errors = [];
  var chain = tables.reduce(function (p, table) {
    return p.then(function () {
      return fetch(SUPABASE_URL + "/rest/v1/" + table + "?id=gt.0", {
        method: "DELETE",
        headers: supabaseHeaders,
      }).then(function (res) {
        if (!res.ok && res.status !== 404) errors.push(table + " (" + res.status + ")");
      }).catch(function (e) { errors.push(table + " (" + e.message + ")"); });
    });
  }, Promise.resolve());

  return chain.then(function () {
    logDevActivity(actionLabel, "ลบ " + (tables.length - errors.length) + "/" + tables.length + " ตาราง" + (errors.length ? " | errors: " + errors.join(",") : ""));
    if (errors.length) {
      showToast("เสร็จสิ้นบางส่วน", "error: " + errors.slice(0, 3).join(", ") + (errors.length > 3 ? " …" : ""));
    } else {
      showToast("รีเซ็ตสำเร็จ", "ลบ " + tables.length + " ตาราง");
    }
  });
}

function doResetTransactional() {
  return doResetTables(TRANSACTIONAL_TABLES, "reset_transactional");
}

// ============ Reset All (Level 2) ============
function handleResetAll() {
  hasManagerPassword().then(function (has) {
    if (!has) { alert("กรุณาตั้ง Manager Password ก่อน"); return; }
    var tables = TRANSACTIONAL_TABLES.concat(MASTER_DATA_TABLES);
    showConfirm({
      title: "⚠️⚠️ รีเซ็ตข้อมูลทั้งหมด (ยกเว้น settings)",
      message:
        "ต้องการลบข้อมูลใน <strong>" + tables.length + " ตาราง</strong> รวมถึง:<br/>" +
        "• Transactional ทั้งหมด (PO, GR, Return, ...)<br/>" +
        "• Master data (Products, Suppliers, Categories, Warehouses, ...)<br/>" +
        "• Pages, Blocks, Promotions, Activity Log<br/><br/>" +
        "<strong style='color:#10b981;'>✓ จะเก็บ:</strong> users, company_info, app_settings, roles<br/><br/>" +
        "<strong style='color:#ef4444;'>⚠️ ไม่สามารถกู้คืนได้</strong>",
      okText: "Reset All",
      okColor: "#ef4444",
      onConfirm: function () {
        requireManagerPassword("Reset All Data — ลบ " + tables.length + " ตาราง")
          .then(function () { return doResetTables(tables, "reset_all"); })
          .catch(function () { /* cancelled */ });
      },
    });
  });
}

// ============ Factory Reset (Level 3) ============
function handleFactoryReset() {
  hasManagerPassword().then(function (has) {
    if (!has) { alert("กรุณาตั้ง Manager Password ก่อน"); return; }
    var tables = TRANSACTIONAL_TABLES.concat(MASTER_DATA_TABLES);
    showConfirm({
      title: "💣 FACTORY RESET — อันตราย!",
      message:
        "<strong style='color:#ef4444;font-size:13px;'>จะลบทุกอย่างยกเว้น admin user ที่ login อยู่</strong><br/><br/>" +
        "จะลบ:<br/>" +
        "• Transactional ทั้งหมด<br/>" +
        "• Master data ทั้งหมด<br/>" +
        "• Users อื่นที่ไม่ใช่ admin ปัจจุบัน<br/>" +
        "• ไฟล์ทั้งหมดใน Storage bucket 'product-images'<br/>" +
        "• Company info (reset to blank)<br/><br/>" +
        "จะเก็บ: app_settings (mode + manager password), admin ปัจจุบัน, roles<br/><br/>" +
        "<strong style='color:#ef4444;font-size:13px;'>⚠️⚠️⚠️ ยืนยันเท่านั้นถ้าต้องการเริ่มใหม่หมด ⚠️⚠️⚠️</strong>",
      okText: "Factory Reset",
      okColor: "#ef4444",
      onConfirm: function () {
        requireManagerPassword("Factory Reset — ลบทุกอย่าง")
          .then(doFactoryReset)
          .catch(function () { /* cancelled */ });
      },
    });
  });
}

function doFactoryReset() {
  var user = (typeof getCurrentUser === "function" ? getCurrentUser() : null) || {};
  var currentUserId = user.id;
  var tables = TRANSACTIONAL_TABLES.concat(MASTER_DATA_TABLES);

  showToast("กำลัง factory reset...", "กรุณารอ");

  // 1. ลบ tables
  doResetTables(tables, "factory_reset_tables")
    // 2. ลบ users (ยกเว้น admin ปัจจุบัน)
    .then(function () {
      if (!currentUserId) return;
      return fetch(SUPABASE_URL + "/rest/v1/users?id=neq." + currentUserId, {
        method: "DELETE",
        headers: supabaseHeaders,
      }).catch(function () {});
    })
    // 3. Reset company_info (เก็บ row id=1 แต่ล้างข้อมูล)
    .then(function () {
      return fetch(SUPABASE_URL + "/rest/v1/company_info?id=eq.1", {
        method: "PATCH",
        headers: supabaseHeaders,
        body: JSON.stringify({
          name: "", type: "", tax_id: "", phone: "", email: "", website: "",
          address: "", branch: "", logo_url: null,
        }),
      }).catch(function () {});
    })
    // 4. ลบ Storage files
    .then(function () {
      return fetch(SUPABASE_URL + "/storage/v1/object/list/product-images", {
        method: "POST",
        headers: supabaseHeaders,
        body: JSON.stringify({ prefix: "", limit: 1000, offset: 0 }),
      }).then(function (r) { return r.json(); }).then(function (files) {
        if (!Array.isArray(files) || !files.length) return;
        var names = files.map(function (f) { return f.name; });
        return fetch(SUPABASE_URL + "/storage/v1/object/product-images", {
          method: "DELETE",
          headers: supabaseHeaders,
          body: JSON.stringify({ prefixes: names }),
        });
      }).catch(function (e) { console.warn("storage cleanup:", e); });
    })
    .then(function () {
      logDevActivity("factory_reset", "Factory reset executed");
      showToast("Factory Reset สำเร็จ", "ระบบเริ่มต้นใหม่หมดแล้ว");
      setTimeout(function () { window.location.reload(); }, 2000);
    })
    .catch(function (err) {
      console.error(err);
      showToast("ผิดพลาด", err.message || "factory reset failed");
    });
}

// ============ Seed Demo Data ============
function handleSeedDemo() {
  showConfirm({
    title: "🌱 Seed Demo Data",
    message:
      "จะสร้างข้อมูลตัวอย่างแบบ generic:<br/>" +
      "• 3 categories<br/>" +
      "• 2 warehouses<br/>" +
      "• 2 units (pcs, box)<br/>" +
      "• 10 products<br/>" +
      "• 3 suppliers<br/>" +
      "• 3 customers<br/>" +
      "• 2 bank accounts<br/><br/>" +
      "เหมาะสำหรับ test flow ต่างๆ ได้ทันที",
    okText: "Seed Data",
    okColor: "#10b981",
    onConfirm: doSeedDemo,
  });
}

function doSeedDemo() {
  showToast("กำลังสร้าง...", "");

  var categories = [
    { name: "Electronics", status: "active" },
    { name: "Clothing", status: "active" },
    { name: "Food & Beverage", status: "active" },
  ];
  var warehouses = [
    { name: "Main Warehouse", status: "active" },
    { name: "Online Warehouse", status: "active" },
  ];
  var units = [
    { name: "ชิ้น", abbr: "pcs", status: "active" },
    { name: "กล่อง", abbr: "box", status: "active" },
  ];
  var suppliers = [
    { name: "ABC Trading Co., Ltd.", contact: "John Doe", phone: "02-111-1111", email: "abc@example.com", tax_id: "0105551234567", address: "Bangkok", status: "active" },
    { name: "XYZ Supplies", contact: "Jane Smith", phone: "02-222-2222", email: "xyz@example.com", tax_id: "0105557654321", address: "Chiang Mai", status: "active" },
    { name: "Thai Import Ltd.", contact: "Somchai", phone: "02-333-3333", email: "thai@example.com", tax_id: "0105559876543", address: "Samut Prakan", status: "active" },
  ];
  var customers = [
    { name: "Customer A", phone: "08-1111-1111", email: "a@example.com", address: "Bangkok", status: "active" },
    { name: "Customer B", phone: "08-2222-2222", email: "b@example.com", address: "Phuket", status: "active" },
    { name: "Customer C", phone: "08-3333-3333", email: "c@example.com", address: "Chiang Mai", status: "active" },
  ];
  var bankAccounts = [
    { bank: "Kasikorn", account_name: "Pathara Co., Ltd.", account_number: "123-4-56789-0", status: "active" },
    { bank: "SCB", account_name: "Pathara Co., Ltd.", account_number: "987-6-54321-0", status: "active" },
  ];
  var productTemplates = [
    { name: "Wireless Headphones", sku: "SKU-00001", price: 2590 },
    { name: "Cotton T-Shirt", sku: "SKU-00002", price: 450 },
    { name: "Smart Watch", sku: "SKU-00003", price: 4500 },
    { name: "Leather Wallet", sku: "SKU-00004", price: 890 },
    { name: "Yoga Mat", sku: "SKU-00005", price: 650 },
    { name: "Coffee Beans 500g", sku: "SKU-00006", price: 350 },
    { name: "USB Cable", sku: "SKU-00007", price: 120 },
    { name: "Desk Lamp", sku: "SKU-00008", price: 780 },
    { name: "Water Bottle", sku: "SKU-00009", price: 220 },
    { name: "Notebook A5", sku: "SKU-00010", price: 80 },
  ];

  function post(table, rows) {
    return fetch(SUPABASE_URL + "/rest/v1/" + table, {
      method: "POST",
      headers: supabaseHeaders,
      body: JSON.stringify(rows),
    }).then(function (res) { return res.json(); });
  }

  Promise.all([
    post("categories", categories),
    post("warehouses", warehouses),
    post("units", units),
    post("suppliers", suppliers),
    post("customers", customers),
    post("bank_accounts", bankAccounts),
  ]).then(function (results) {
    var cats = results[0] || [];
    var uns = results[2] || [];
    // Map products to categories + units
    var products = productTemplates.map(function (p, i) {
      return {
        name: p.name,
        sku: p.sku,
        barcode: "885" + String(100000000 + i).padStart(9, "0") + "0",
        price: p.price,
        category_id: cats[i % cats.length] ? cats[i % cats.length].id : null,
        unit_id: uns[0] ? uns[0].id : null,
        status: "active",
        low_stock_threshold: 10,
      };
    });
    return post("products", products);
  }).then(function () {
    logDevActivity("seed_demo", "Seeded demo data");
    showToast("Seed สำเร็จ", "สร้างข้อมูลตัวอย่างแล้ว");
  }).catch(function (err) {
    console.error(err);
    showToast("ผิดพลาด", "seed ไม่สำเร็จ (อาจมีข้อมูลซ้ำ ลอง Reset All ก่อน)");
  });
}

// ============ Clear Orphan Storage ============
// เช็คไฟล์ใน bucket product-images เทียบกับ URL ที่อ้างอยู่ใน DB
// ไฟล์ที่ไม่มีใครอ้าง = orphan → ลบ
function collectAllReferencedUrls() {
  return Promise.all([
    fetch(SUPABASE_URL + "/rest/v1/products?select=images", { headers: supabaseHeaders }).then(function (r) { return r.json(); }),
    fetch(SUPABASE_URL + "/rest/v1/company_info?select=logo_url", { headers: supabaseHeaders }).then(function (r) { return r.json(); }),
    fetch(SUPABASE_URL + "/rest/v1/purchase_orders?select=payment_slip_url,receipt_url", { headers: supabaseHeaders }).then(function (r) { return r.json(); }),
  ]).then(function (res) {
    var used = new Set();
    (res[0] || []).forEach(function (p) {
      (p.images || []).forEach(function (url) {
        if (typeof url === "string") used.add(url);
      });
    });
    (res[1] || []).forEach(function (c) {
      if (c.logo_url) used.add(c.logo_url);
    });
    (res[2] || []).forEach(function (po) {
      if (po.payment_slip_url) used.add(po.payment_slip_url);
      if (po.receipt_url) used.add(po.receipt_url);
    });
    return used;
  });
}

function handleClearOrphans() {
  showToast("กำลังสแกน...", "ตรวจ storage vs database");

  Promise.all([
    // list all files in bucket
    fetch(SUPABASE_URL + "/storage/v1/object/list/product-images", {
      method: "POST",
      headers: supabaseHeaders,
      body: JSON.stringify({ prefix: "", limit: 1000, offset: 0 }),
    }).then(function (r) { return r.json(); }),
    collectAllReferencedUrls(),
  ]).then(function (res) {
    var files = res[0] || [];
    var used = res[1] || new Set();
    var orphans = files.filter(function (f) {
      var publicUrl = SUPABASE_URL + "/storage/v1/object/public/product-images/" + encodeURIComponent(f.name);
      return !used.has(publicUrl);
    });

    if (!orphans.length) {
      showToast("ไม่มี orphan", "ทุกไฟล์มีคนอ้างถึง");
      return;
    }

    showConfirm({
      title: "🗑️ Clear Orphan Storage",
      message:
        "พบไฟล์ที่ไม่มีใครอ้างถึง <strong>" + orphans.length + " ไฟล์</strong> จาก " + files.length + " ไฟล์ทั้งหมด<br/><br/>" +
        "<code style='font-size:10px;'>" + orphans.slice(0, 5).map(function (f) { return f.name; }).join("<br/>") + (orphans.length > 5 ? "<br/>…" : "") + "</code><br/><br/>" +
        "ลบไฟล์เหล่านี้ออกจาก Storage?",
      okText: "ลบ Orphans",
      okColor: "#ef4444",
      onConfirm: function () {
        requireManagerPassword("Clear " + orphans.length + " orphan storage files")
          .then(function () {
            var names = orphans.map(function (f) { return f.name; });
            return fetch(SUPABASE_URL + "/storage/v1/object/product-images", {
              method: "DELETE",
              headers: supabaseHeaders,
              body: JSON.stringify({ prefixes: names }),
            });
          })
          .then(function () {
            logDevActivity("clear_orphans", "ลบ orphan storage " + orphans.length + " ไฟล์");
            showToast("ลบสำเร็จ", orphans.length + " ไฟล์ถูกลบ");
          })
          .catch(function () { /* cancelled or error */ });
      },
    });
  }).catch(function (err) {
    console.error(err);
    showToast("ผิดพลาด", "สแกนไม่สำเร็จ");
  });
}

// ============ DB Statistics ============
function refreshDBStats() {
  var container = document.getElementById("dbStatsBody");
  if (!container) return;
  container.innerHTML = '<tr><td colspan="2" style="text-align:center;padding:20px;color:#94a3b8;font-size:11px;">กำลังโหลด…</td></tr>';

  Promise.all(ALL_TABLES.map(function (t) {
    return fetch(SUPABASE_URL + "/rest/v1/" + t + "?select=id", {
      headers: Object.assign({}, supabaseHeaders, { "Prefer": "count=exact", "Range-Unit": "items", "Range": "0-0" }),
    }).then(function (res) {
      var count = res.headers.get("Content-Range");
      var n = count ? Number(count.split("/")[1]) : 0;
      return { table: t, count: isNaN(n) ? 0 : n };
    }).catch(function () { return { table: t, count: null }; });
  })).then(function (stats) {
    var total = stats.reduce(function (s, r) { return s + (r.count || 0); }, 0);
    stats.sort(function (a, b) { return (b.count || 0) - (a.count || 0); });
    container.innerHTML = stats.map(function (r) {
      var cnt = r.count == null ? '<span style="color:#ef4444;">?</span>' : r.count.toLocaleString();
      return '<tr><td style="padding:6px 10px;font-family:monospace;font-size:10px;color:#0f172a;">' + r.table + '</td>' +
             '<td style="padding:6px 10px;text-align:right;font-weight:700;color:#1e293b;">' + cnt + '</td></tr>';
    }).join("");
    document.getElementById("dbStatsTotal").textContent = total.toLocaleString();
  });
}

// ============ Export JSON ============
function handleExportJSON() {
  showToast("กำลัง export...", "");
  Promise.all(ALL_TABLES.map(function (t) {
    return fetch(SUPABASE_URL + "/rest/v1/" + t + "?select=*", {
      headers: supabaseHeaders,
    }).then(function (res) { return res.json(); })
      .then(function (rows) { return [t, rows || []]; })
      .catch(function () { return [t, []]; });
  })).then(function (entries) {
    var snapshot = {
      exported_at: new Date().toISOString(),
      app_mode: null,
      tables: Object.fromEntries(entries),
    };
    return getAppMode().then(function (m) { snapshot.app_mode = m; return snapshot; });
  }).then(function (snapshot) {
    var blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "pathara-backup-" + new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-") + ".json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    logDevActivity("export_json", "Exported DB snapshot");
    showToast("Export สำเร็จ", "ดาวน์โหลดไฟล์แล้ว");
  }).catch(function (err) {
    console.error(err);
    showToast("ผิดพลาด", "export ไม่สำเร็จ");
  });
}

// ============ Import JSON ============
function handleImportJSON() {
  hasManagerPassword().then(function (has) {
    if (!has) { alert("กรุณาตั้ง Manager Password ก่อน"); return; }
    document.getElementById("importFileInput").click();
  });
}

function handleImportFileSelect(input) {
  var file = input.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function (e) {
    var snapshot;
    try { snapshot = JSON.parse(e.target.result); }
    catch (err) { showToast("ผิดพลาด", "ไฟล์ไม่ใช่ JSON ที่ valid"); return; }
    if (!snapshot.tables) { showToast("ผิดพลาด", "โครงสร้างไฟล์ไม่ถูกต้อง"); return; }

    var tableNames = Object.keys(snapshot.tables);
    showConfirm({
      title: "📥 Import Data",
      message:
        "จะ import " + tableNames.length + " ตาราง:<br/>" +
        "<code style='font-size:10px;'>" + tableNames.slice(0, 10).join(", ") + (tableNames.length > 10 ? " …" : "") + "</code><br/><br/>" +
        "<strong style='color:#ef4444;'>⚠️ จะลบข้อมูลเดิมทั้งหมดก่อน import</strong><br/>" +
        "exported_at: " + (snapshot.exported_at || "unknown"),
      okText: "Import",
      okColor: "#3b82f6",
      onConfirm: function () {
        requireManagerPassword("Import JSON snapshot")
          .then(function () { return doImportJSON(snapshot); })
          .catch(function () { /* cancelled */ });
      },
    });
  };
  reader.readAsText(file);
  input.value = "";
}

function doImportJSON(snapshot) {
  showToast("กำลัง import...", "อย่าปิดหน้า");
  // 1. Clear existing
  var allTables = TRANSACTIONAL_TABLES.concat(MASTER_DATA_TABLES);
  doResetTables(allTables, "import_clear")
    .then(function () {
      // 2. Insert in reverse order (parent → child)
      var insertOrder = allTables.slice().reverse();
      return insertOrder.reduce(function (p, table) {
        return p.then(function () {
          var rows = snapshot.tables[table];
          if (!rows || !rows.length) return;
          return fetch(SUPABASE_URL + "/rest/v1/" + table, {
            method: "POST",
            headers: supabaseHeaders,
            body: JSON.stringify(rows),
          }).catch(function (e) { console.warn("import " + table + ":", e); });
        });
      }, Promise.resolve());
    })
    .then(function () {
      logDevActivity("import_json", "Imported DB snapshot");
      showToast("Import สำเร็จ", "รีเฟรชเพื่อดูข้อมูลใหม่");
    });
}

// ============ Activity Log helper ============
function logDevActivity(action, description) {
  if (typeof createActivityLogDB !== "function") return;
  var user = (typeof getCurrentUser === "function" ? getCurrentUser() : null) || {};
  createActivityLogDB({
    datetime: new Date().toISOString(),
    user_name: user.name || "unknown",
    action: action,
    module: "Developer",
    description: description,
  }).catch(function () { /* ignore */ });
}

// ============ Init ============
document.addEventListener("DOMContentLoaded", function () {
  getAppMode().then(renderModeUI);
  refreshPasswordStatus();

  document.getElementById("modeToggleBtn").addEventListener("click", handleModeToggle);
  document.getElementById("setPwdBtn").addEventListener("click", openSetPasswordModal);
  document.getElementById("resetTransBtn").addEventListener("click", handleResetTransactional);

  var byId = function (id) { return document.getElementById(id); };
  if (byId("resetAllBtn")) byId("resetAllBtn").addEventListener("click", handleResetAll);
  if (byId("factoryResetBtn")) byId("factoryResetBtn").addEventListener("click", handleFactoryReset);
  if (byId("seedDemoBtn")) byId("seedDemoBtn").addEventListener("click", handleSeedDemo);
  if (byId("refreshStatsBtn")) byId("refreshStatsBtn").addEventListener("click", refreshDBStats);
  if (byId("clearOrphansBtn")) byId("clearOrphansBtn").addEventListener("click", handleClearOrphans);
  if (byId("exportJsonBtn")) byId("exportJsonBtn").addEventListener("click", handleExportJSON);
  if (byId("importJsonBtn")) byId("importJsonBtn").addEventListener("click", handleImportJSON);
  if (byId("importFileInput")) byId("importFileInput").addEventListener("change", function () { handleImportFileSelect(this); });

  if (byId("dbStatsBody")) refreshDBStats();
});
