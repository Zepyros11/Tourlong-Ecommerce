// ============================================================
// supabase-client.js — Supabase API Client (shared)
// ------------------------------------------------------------
// ใช้ร่วม: backend (users) + frontend (pages/blocks/products)
// ============================================================

var SUPABASE_URL = "https://qdexibeljfwtrnfgqhmp.supabase.co";
var SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkZXhpYmVsamZ3dHJuZmdxaG1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MzgwNzEsImV4cCI6MjA5MTMxNDA3MX0.Xlw0tLsv7meuIBdSoGIwlcJ24vZy5djufhUB38cBWd4";

var supabaseHeaders = {
  "apikey": SUPABASE_KEY,
  "Authorization": "Bearer " + SUPABASE_KEY,
  "Content-Type": "application/json",
  "Prefer": "return=representation",
};

// ===================== Pages =====================

function fetchPages() {
  return fetch(SUPABASE_URL + "/rest/v1/pages?select=*&order=id.asc", {
    headers: supabaseHeaders,
  }).then(function (res) { return res.json(); });
}

function createPageDB(pageData) {
  return fetch(SUPABASE_URL + "/rest/v1/pages", {
    method: "POST",
    headers: supabaseHeaders,
    body: JSON.stringify(pageData),
  }).then(function (res) { return res.json(); });
}

function updatePageDB(pageId, pageData) {
  return fetch(SUPABASE_URL + "/rest/v1/pages?id=eq." + pageId, {
    method: "PATCH",
    headers: supabaseHeaders,
    body: JSON.stringify(pageData),
  }).then(function (res) { return res.json(); });
}

function deletePageDB(pageId) {
  return fetch(SUPABASE_URL + "/rest/v1/pages?id=eq." + pageId, {
    method: "DELETE",
    headers: supabaseHeaders,
  });
}

// ===================== Blocks =====================

function fetchBlocks(pageId) {
  return fetch(SUPABASE_URL + "/rest/v1/blocks?page_id=eq." + pageId + "&select=*&order=sort_order.asc", {
    headers: supabaseHeaders,
  }).then(function (res) { return res.json(); });
}

function saveBlocksDB(pageId, blocks) {
  return fetch(SUPABASE_URL + "/rest/v1/blocks?page_id=eq." + pageId, {
    method: "DELETE",
    headers: supabaseHeaders,
  }).then(function () {
    if (blocks.length === 0) return Promise.resolve([]);

    var rows = blocks.map(function (block, idx) {
      return {
        page_id: pageId,
        type: block.type,
        data: block.data,
        sort_order: idx,
      };
    });

    return fetch(SUPABASE_URL + "/rest/v1/blocks", {
      method: "POST",
      headers: supabaseHeaders,
      body: JSON.stringify(rows),
    }).then(function (res) { return res.json(); });
  });
}

function insertBlockDB(pageId, block, sortOrder) {
  return fetch(SUPABASE_URL + "/rest/v1/blocks", {
    method: "POST",
    headers: supabaseHeaders,
    body: JSON.stringify({
      page_id: pageId,
      type: block.type,
      data: block.data,
      sort_order: sortOrder,
    }),
  }).then(function (res) { return res.json(); });
}

// ===================== Storage =====================

// Upload a File/Blob ไป Supabase Storage → คืน public URL
function uploadToStorageBucket(bucket, file, originalName) {
  var rand = Math.random().toString(36).slice(2, 8);
  var safeName = (originalName || "img")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .slice(0, 40);
  if (!/\.[a-z0-9]+$/i.test(safeName)) {
    var mimeExt = (file.type || "").split("/")[1] || "bin";
    safeName += "." + mimeExt;
  }
  var fileName = Date.now() + "-" + rand + "-" + safeName;

  return fetch(SUPABASE_URL + "/storage/v1/object/" + encodeURIComponent(bucket) + "/" + encodeURIComponent(fileName), {
    method: "POST",
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": "Bearer " + SUPABASE_KEY,
      "Content-Type": file.type || "application/octet-stream",
    },
    body: file,
  }).then(function (res) {
    if (!res.ok) {
      return res.text().then(function (t) { throw new Error("Upload failed: " + res.status + " " + t); });
    }
    return SUPABASE_URL + "/storage/v1/object/public/" + encodeURIComponent(bucket) + "/" + encodeURIComponent(fileName);
  });
}

// แปลง data URL (base64) → Blob แล้ว upload
function uploadDataUrlToStorage(bucket, dataUrl) {
  var parts = dataUrl.split(",");
  var mimeMatch = parts[0].match(/:(.*?);/);
  var mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
  var binary = atob(parts[1] || "");
  var arr = new Uint8Array(binary.length);
  for (var i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
  var blob = new Blob([arr], { type: mime });
  return uploadToStorageBucket(bucket, blob);
}

// Backward compat (ถ้ามีที่ไหนใน codebase ยังเรียกชื่อเดิม)
function uploadFileToStorage(file) {
  return uploadToStorageBucket("product-images", file, file && file.name);
}

// ลบไฟล์เดียวจาก Storage bucket
function deleteFromStorageBucket(bucket, fileName) {
  return fetch(SUPABASE_URL + "/storage/v1/object/" + encodeURIComponent(bucket) + "/" + encodeURIComponent(fileName), {
    method: "DELETE",
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": "Bearer " + SUPABASE_KEY,
    },
  });
}

// ดึงชื่อไฟล์จาก public URL ของ Supabase Storage
// เช่น https://.../storage/v1/object/public/product-images/FOO.jpg → "FOO.jpg"
function extractStorageFileName(url, bucket) {
  if (typeof url !== "string") return null;
  var prefix = "/storage/v1/object/public/" + bucket + "/";
  var idx = url.indexOf(prefix);
  if (idx === -1) return null;
  return decodeURIComponent(url.slice(idx + prefix.length));
}

// ลบรูปของสินค้าออกจาก Storage (รับ array ของ URLs)
// ข้าม base64 และ non-Storage URLs — ล้มเหลวไม่ throw (ไม่ให้บล็อกการลบ product)
function deleteProductImagesFromStorage(images) {
  if (!images || !images.length) return Promise.resolve();
  var ops = images.map(function (url) {
    if (typeof url !== "string" || url.indexOf("data:") === 0) return Promise.resolve();
    var fileName = extractStorageFileName(url, "product-images");
    if (!fileName) return Promise.resolve();
    return deleteFromStorageBucket("product-images", fileName).catch(function (e) {
      console.warn("Delete storage file failed:", fileName, e);
    });
  });
  return Promise.all(ops);
}

// ===================== Products & Categories =====================

function fetchCategories() {
  return fetch(SUPABASE_URL + "/rest/v1/categories?select=*&order=id.asc", {
    headers: supabaseHeaders,
  }).then(function (res) { return res.json(); });
}

function createCategoryDB(data) {
  return fetch(SUPABASE_URL + "/rest/v1/categories", {
    method: "POST",
    headers: supabaseHeaders,
    body: JSON.stringify(data),
  }).then(function (res) { return res.json(); })
    .then(function (rows) { return Array.isArray(rows) ? rows[0] : rows; });
}

function updateCategoryDB(id, data) {
  return fetch(SUPABASE_URL + "/rest/v1/categories?id=eq." + id, {
    method: "PATCH",
    headers: supabaseHeaders,
    body: JSON.stringify(data),
  }).then(function (res) { return res.json(); })
    .then(function (rows) { return Array.isArray(rows) ? rows[0] : rows; });
}

function deleteCategoryDB(id) {
  return fetch(SUPABASE_URL + "/rest/v1/categories?id=eq." + id, {
    method: "DELETE",
    headers: supabaseHeaders,
  }).then(function (res) {
    if (!res.ok) return res.json().then(function (err) { throw new Error(err.message || "Delete failed"); });
    return res;
  });
}

// NOTE: skip heavy columns (images, description) for list/dropdown use.
// For edit form use fetchProductById() which returns full record.
function fetchProducts(activeOnly) {
  var filter = activeOnly ? "&status=eq.active" : "";
  var cols = "id,name,sku,barcode,price,category_id,unit_id,variants,status,low_stock_threshold,categories(name)";
  return fetch(SUPABASE_URL + "/rest/v1/products?select=" + cols + filter + "&order=id.asc", {
    headers: supabaseHeaders,
  }).then(function (res) { return res.json(); });
}

// Lightweight fetch — ใช้ในหน้า form เพื่อ auto-generate SKU/barcode
// ดึงเฉพาะ column ที่จำเป็น ไม่โหลด variants/images
function fetchProductSkusDB() {
  return fetch(SUPABASE_URL + "/rest/v1/products?select=id,sku,barcode", {
    headers: supabaseHeaders,
  }).then(function (res) { return res.json(); });
}

function fetchProductById(id) {
  return fetch(SUPABASE_URL + "/rest/v1/products?id=eq." + id + "&select=*,categories(name)&limit=1", {
    headers: supabaseHeaders,
  }).then(function (res) { return res.json(); })
    .then(function (rows) { return rows && rows.length ? rows[0] : null; });
}

function createProductDB(data) {
  return fetch(SUPABASE_URL + "/rest/v1/products", {
    method: "POST",
    headers: supabaseHeaders,
    body: JSON.stringify(data),
  }).then(function (res) { return res.json(); })
    .then(function (rows) { return Array.isArray(rows) ? rows[0] : rows; });
}

function updateProductDB(id, data) {
  return fetch(SUPABASE_URL + "/rest/v1/products?id=eq." + id, {
    method: "PATCH",
    headers: supabaseHeaders,
    body: JSON.stringify(data),
  }).then(function (res) { return res.json(); })
    .then(function (rows) { return Array.isArray(rows) ? rows[0] : rows; });
}

function deleteProductDB(id) {
  return fetch(SUPABASE_URL + "/rest/v1/products?id=eq." + id, {
    method: "DELETE",
    headers: supabaseHeaders,
  });
}

// ===================== Users =====================

function fetchUsersDB() {
  return fetch(SUPABASE_URL + "/rest/v1/users?select=*&order=id.asc", {
    headers: supabaseHeaders,
  }).then(function (res) { return res.json(); });
}

function findUserByLoginDB(identifier) {
  var idLower = (identifier || "").toLowerCase();
  var encoded = encodeURIComponent(idLower);
  var query = "or=(username.eq." + encoded + ",email.eq." + encoded + ")";
  return fetch(SUPABASE_URL + "/rest/v1/users?" + query + "&select=*&limit=1", {
    headers: supabaseHeaders,
  }).then(function (res) { return res.json(); })
    .then(function (rows) { return rows && rows.length ? rows[0] : null; });
}

function createUserDB(userData) {
  return fetch(SUPABASE_URL + "/rest/v1/users", {
    method: "POST",
    headers: supabaseHeaders,
    body: JSON.stringify(userData),
  }).then(function (res) { return res.json(); })
    .then(function (rows) { return Array.isArray(rows) ? rows[0] : rows; });
}

function updateUserDB(userId, userData) {
  return fetch(SUPABASE_URL + "/rest/v1/users?id=eq." + userId, {
    method: "PATCH",
    headers: supabaseHeaders,
    body: JSON.stringify(userData),
  }).then(function (res) { return res.json(); })
    .then(function (rows) { return Array.isArray(rows) ? rows[0] : rows; });
}

function deleteUserDB(userId) {
  return fetch(SUPABASE_URL + "/rest/v1/users?id=eq." + userId, {
    method: "DELETE",
    headers: supabaseHeaders,
  });
}

// ===================== Units (Unit of Measure) =====================

function fetchUnitsDB() {
  return fetch(SUPABASE_URL + "/rest/v1/units?select=*&order=id.asc", {
    headers: supabaseHeaders,
  }).then(function (res) { return res.json(); });
}

function createUnitDB(unitData) {
  return fetch(SUPABASE_URL + "/rest/v1/units", {
    method: "POST",
    headers: supabaseHeaders,
    body: JSON.stringify(unitData),
  }).then(function (res) { return res.json(); })
    .then(function (rows) { return Array.isArray(rows) ? rows[0] : rows; });
}

function updateUnitDB(unitId, unitData) {
  return fetch(SUPABASE_URL + "/rest/v1/units?id=eq." + unitId, {
    method: "PATCH",
    headers: supabaseHeaders,
    body: JSON.stringify(unitData),
  }).then(function (res) { return res.json(); })
    .then(function (rows) { return Array.isArray(rows) ? rows[0] : rows; });
}

function deleteUnitDB(unitId) {
  return fetch(SUPABASE_URL + "/rest/v1/units?id=eq." + unitId, {
    method: "DELETE",
    headers: supabaseHeaders,
  });
}

// ===================== Product Unit Conversions =====================

function fetchProductUnitConversions(productId) {
  return fetch(SUPABASE_URL + "/rest/v1/product_unit_conversions?product_id=eq." + productId + "&select=*,units(name,abbr)&order=is_base.desc,id.asc", {
    headers: supabaseHeaders,
  }).then(function (res) { return res.json(); });
}

// ===================== Warehouses =====================

function fetchWarehousesDB() {
  return fetch(SUPABASE_URL + "/rest/v1/warehouses?select=*&order=id.asc", {
    headers: supabaseHeaders,
  }).then(function (res) { return res.json(); });
}

function createWarehouseDB(data) {
  return fetch(SUPABASE_URL + "/rest/v1/warehouses", {
    method: "POST",
    headers: supabaseHeaders,
    body: JSON.stringify(data),
  }).then(function (res) { return res.json(); })
    .then(function (rows) { return Array.isArray(rows) ? rows[0] : rows; });
}

function updateWarehouseDB(id, data) {
  return fetch(SUPABASE_URL + "/rest/v1/warehouses?id=eq." + id, {
    method: "PATCH",
    headers: supabaseHeaders,
    body: JSON.stringify(data),
  }).then(function (res) { return res.json(); })
    .then(function (rows) { return Array.isArray(rows) ? rows[0] : rows; });
}

function deleteWarehouseDB(id) {
  return fetch(SUPABASE_URL + "/rest/v1/warehouses?id=eq." + id, {
    method: "DELETE",
    headers: supabaseHeaders,
  });
}

// ===================== Invoices =====================

function fetchInvoicesDB() {
  return fetch(SUPABASE_URL + "/rest/v1/invoices?select=*,customers(name),sales_orders(so_number)&order=id.desc", {
    headers: supabaseHeaders,
  }).then(function (res) { return res.json(); });
}

function createInvoiceDB(data) {
  return fetch(SUPABASE_URL + "/rest/v1/invoices", {
    method: "POST",
    headers: supabaseHeaders,
    body: JSON.stringify(data),
  }).then(function (res) { return res.json(); })
    .then(function (rows) { return Array.isArray(rows) ? rows[0] : rows; });
}

function updateInvoiceDB(id, data) {
  return fetch(SUPABASE_URL + "/rest/v1/invoices?id=eq." + id, {
    method: "PATCH",
    headers: supabaseHeaders,
    body: JSON.stringify(data),
  }).then(function (res) { return res.json(); })
    .then(function (rows) { return Array.isArray(rows) ? rows[0] : rows; });
}

function deleteInvoiceDB(id) {
  return fetch(SUPABASE_URL + "/rest/v1/invoices?id=eq." + id, {
    method: "DELETE",
    headers: supabaseHeaders,
  });
}

// ===================== Payments =====================

function fetchPaymentsDB() {
  return fetch(SUPABASE_URL + "/rest/v1/payments?select=*,customers(name),suppliers(name),invoices(invoice_number),purchase_orders(po_number),sales_orders(so_number),bank_accounts(bank,account_name)&order=id.desc", {
    headers: supabaseHeaders,
  }).then(function (res) { return res.json(); });
}

function createPaymentDB(data) {
  return fetch(SUPABASE_URL + "/rest/v1/payments", {
    method: "POST",
    headers: supabaseHeaders,
    body: JSON.stringify(data),
  }).then(function (res) { return res.json(); })
    .then(function (rows) { return Array.isArray(rows) ? rows[0] : rows; });
}

function updatePaymentDB(id, data) {
  return fetch(SUPABASE_URL + "/rest/v1/payments?id=eq." + id, {
    method: "PATCH",
    headers: supabaseHeaders,
    body: JSON.stringify(data),
  }).then(function (res) { return res.json(); })
    .then(function (rows) { return Array.isArray(rows) ? rows[0] : rows; });
}

function deletePaymentDB(id) {
  return fetch(SUPABASE_URL + "/rest/v1/payments?id=eq." + id, {
    method: "DELETE",
    headers: supabaseHeaders,
  });
}

// ===================== Settings =====================

function fetchCompanyInfoDB() {
  return fetch(SUPABASE_URL + "/rest/v1/company_info?id=eq.1&select=*&limit=1", {
    headers: supabaseHeaders,
  }).then(function (res) { return res.json(); })
    .then(function (rows) { return rows && rows.length ? rows[0] : null; });
}
function updateCompanyInfoDB(data) {
  return fetch(SUPABASE_URL + "/rest/v1/company_info?id=eq.1", {
    method: "PATCH", headers: supabaseHeaders, body: JSON.stringify(data),
  }).then(function (res) { return res.json(); })
    .then(function (rows) { return Array.isArray(rows) ? rows[0] : rows; });
}

function fetchRolesDB() {
  return fetch(SUPABASE_URL + "/rest/v1/roles?select=*&order=id.asc", {
    headers: supabaseHeaders,
  }).then(function (res) { return res.json(); });
}
function createRoleDB(data) {
  return fetch(SUPABASE_URL + "/rest/v1/roles", {
    method: "POST", headers: supabaseHeaders, body: JSON.stringify(data),
  }).then(function (res) { return res.json(); })
    .then(function (rows) { return Array.isArray(rows) ? rows[0] : rows; });
}
function updateRoleDB(id, data) {
  return fetch(SUPABASE_URL + "/rest/v1/roles?id=eq." + id, {
    method: "PATCH", headers: supabaseHeaders, body: JSON.stringify(data),
  }).then(function (res) { return res.json(); })
    .then(function (rows) { return Array.isArray(rows) ? rows[0] : rows; });
}
function deleteRoleDB(id) {
  return fetch(SUPABASE_URL + "/rest/v1/roles?id=eq." + id, {
    method: "DELETE", headers: supabaseHeaders,
  });
}

function fetchActivityLogDB() {
  return fetch(SUPABASE_URL + "/rest/v1/activity_log?select=*&order=datetime.desc&limit=500", {
    headers: supabaseHeaders,
  }).then(function (res) { return res.json(); });
}
function createActivityLogDB(data) {
  return fetch(SUPABASE_URL + "/rest/v1/activity_log", {
    method: "POST", headers: supabaseHeaders, body: JSON.stringify(data),
  }).then(function (res) { return res.json(); });
}

// ===================== Promotions =====================

function fetchDiscountsDB() {
  return fetch(SUPABASE_URL + "/rest/v1/discounts?select=*&order=id.asc", {
    headers: supabaseHeaders,
  }).then(function (res) { return res.json(); });
}
function createDiscountDB(data) {
  return fetch(SUPABASE_URL + "/rest/v1/discounts", {
    method: "POST", headers: supabaseHeaders, body: JSON.stringify(data),
  }).then(function (res) { return res.json(); })
    .then(function (rows) { return Array.isArray(rows) ? rows[0] : rows; });
}
function updateDiscountDB(id, data) {
  return fetch(SUPABASE_URL + "/rest/v1/discounts?id=eq." + id, {
    method: "PATCH", headers: supabaseHeaders, body: JSON.stringify(data),
  }).then(function (res) { return res.json(); })
    .then(function (rows) { return Array.isArray(rows) ? rows[0] : rows; });
}
function deleteDiscountDB(id) {
  return fetch(SUPABASE_URL + "/rest/v1/discounts?id=eq." + id, {
    method: "DELETE", headers: supabaseHeaders,
  });
}

// ----- Promotion Packages (bundled products with new price) -----

function fetchPromotionPackagesDB() {
  return fetch(SUPABASE_URL + "/rest/v1/promotion_packages?select=*,promotion_package_items(id,product_id,qty,promo_price,products(name,sku))&order=id.desc", {
    headers: supabaseHeaders,
  }).then(function (res) { return res.json(); });
}

function createPromotionPackageDB(header, items) {
  return fetch(SUPABASE_URL + "/rest/v1/promotion_packages", {
    method: "POST",
    headers: supabaseHeaders,
    body: JSON.stringify(header),
  }).then(function (res) { return res.json(); })
    .then(function (rows) {
      var pkg = Array.isArray(rows) ? rows[0] : rows;
      if (!pkg || !pkg.id) throw new Error("Create package failed");
      if (!items || !items.length) return pkg;
      var rowsToInsert = items.map(function (it) {
        return { package_id: pkg.id, product_id: it.product_id, qty: it.qty, promo_price: it.promo_price };
      });
      return fetch(SUPABASE_URL + "/rest/v1/promotion_package_items", {
        method: "POST",
        headers: supabaseHeaders,
        body: JSON.stringify(rowsToInsert),
      }).then(function (r2) { return r2.json(); })
        .then(function () { return pkg; });
    });
}

function updatePromotionPackageDB(id, header, items) {
  return fetch(SUPABASE_URL + "/rest/v1/promotion_packages?id=eq." + id, {
    method: "PATCH",
    headers: supabaseHeaders,
    body: JSON.stringify(header),
  }).then(function (res) { return res.json(); })
    .then(function () {
      return fetch(SUPABASE_URL + "/rest/v1/promotion_package_items?package_id=eq." + id, {
        method: "DELETE",
        headers: supabaseHeaders,
      });
    })
    .then(function () {
      if (!items || !items.length) return null;
      var rowsToInsert = items.map(function (it) {
        return { package_id: Number(id), product_id: it.product_id, qty: it.qty, promo_price: it.promo_price };
      });
      return fetch(SUPABASE_URL + "/rest/v1/promotion_package_items", {
        method: "POST",
        headers: supabaseHeaders,
        body: JSON.stringify(rowsToInsert),
      }).then(function (res) { return res.json(); });
    });
}

function deletePromotionPackageDB(id) {
  return fetch(SUPABASE_URL + "/rest/v1/promotion_packages?id=eq." + id, {
    method: "DELETE",
    headers: supabaseHeaders,
  });
}

// ดึง latest cost/product จาก goods_receipt_items (เรียงใหม่สุดก่อน แล้ว dedupe ใน client)
function fetchLatestProductCosts() {
  return fetch(SUPABASE_URL + "/rest/v1/goods_receipt_items?select=product_id,cost,id&order=id.desc", {
    headers: supabaseHeaders,
  }).then(function (res) { return res.json(); })
    .then(function (rows) {
      var map = {};
      (rows || []).forEach(function (r) {
        if (map[r.product_id] == null) map[r.product_id] = Number(r.cost) || 0;
      });
      return map;
    });
}

function fetchCouponsDB() {
  return fetch(SUPABASE_URL + "/rest/v1/coupons?select=*&order=id.asc", {
    headers: supabaseHeaders,
  }).then(function (res) { return res.json(); });
}
function createCouponDB(data) {
  return fetch(SUPABASE_URL + "/rest/v1/coupons", {
    method: "POST", headers: supabaseHeaders, body: JSON.stringify(data),
  }).then(function (res) { return res.json(); })
    .then(function (rows) { return Array.isArray(rows) ? rows[0] : rows; });
}
function updateCouponDB(id, data) {
  return fetch(SUPABASE_URL + "/rest/v1/coupons?id=eq." + id, {
    method: "PATCH", headers: supabaseHeaders, body: JSON.stringify(data),
  }).then(function (res) { return res.json(); })
    .then(function (rows) { return Array.isArray(rows) ? rows[0] : rows; });
}
function deleteCouponDB(id) {
  return fetch(SUPABASE_URL + "/rest/v1/coupons?id=eq." + id, {
    method: "DELETE", headers: supabaseHeaders,
  });
}

// ===================== Shipping =====================

function fetchShippingRatesDB() {
  return fetch(SUPABASE_URL + "/rest/v1/shipping_rates?select=*&order=id.asc", {
    headers: supabaseHeaders,
  }).then(function (res) { return res.json(); });
}
function createShippingRateDB(data) {
  return fetch(SUPABASE_URL + "/rest/v1/shipping_rates", {
    method: "POST", headers: supabaseHeaders, body: JSON.stringify(data),
  }).then(function (res) { return res.json(); })
    .then(function (rows) { return Array.isArray(rows) ? rows[0] : rows; });
}
function updateShippingRateDB(id, data) {
  return fetch(SUPABASE_URL + "/rest/v1/shipping_rates?id=eq." + id, {
    method: "PATCH", headers: supabaseHeaders, body: JSON.stringify(data),
  }).then(function (res) { return res.json(); })
    .then(function (rows) { return Array.isArray(rows) ? rows[0] : rows; });
}
function deleteShippingRateDB(id) {
  return fetch(SUPABASE_URL + "/rest/v1/shipping_rates?id=eq." + id, {
    method: "DELETE", headers: supabaseHeaders,
  });
}

function fetchShipmentsDB() {
  return fetch(SUPABASE_URL + "/rest/v1/shipments?select=*,customers(name),sales_orders(so_number),shipping_rates(carrier,zone)&order=id.desc", {
    headers: supabaseHeaders,
  }).then(function (res) { return res.json(); });
}
function createShipmentDB(data) {
  return fetch(SUPABASE_URL + "/rest/v1/shipments", {
    method: "POST", headers: supabaseHeaders, body: JSON.stringify(data),
  }).then(function (res) { return res.json(); })
    .then(function (rows) { return Array.isArray(rows) ? rows[0] : rows; });
}
function updateShipmentDB(id, data) {
  return fetch(SUPABASE_URL + "/rest/v1/shipments?id=eq." + id, {
    method: "PATCH", headers: supabaseHeaders, body: JSON.stringify(data),
  }).then(function (res) { return res.json(); })
    .then(function (rows) { return Array.isArray(rows) ? rows[0] : rows; });
}
function deleteShipmentDB(id) {
  return fetch(SUPABASE_URL + "/rest/v1/shipments?id=eq." + id, {
    method: "DELETE", headers: supabaseHeaders,
  });
}

// ===================== Expenses =====================

function fetchExpensesDB() {
  return fetch(SUPABASE_URL + "/rest/v1/expenses?select=*,bank_accounts(bank,account_name)&order=id.desc", {
    headers: supabaseHeaders,
  }).then(function (res) { return res.json(); });
}

function createExpenseDB(data) {
  return fetch(SUPABASE_URL + "/rest/v1/expenses", {
    method: "POST",
    headers: supabaseHeaders,
    body: JSON.stringify(data),
  }).then(function (res) { return res.json(); })
    .then(function (rows) { return Array.isArray(rows) ? rows[0] : rows; });
}

function updateExpenseDB(id, data) {
  return fetch(SUPABASE_URL + "/rest/v1/expenses?id=eq." + id, {
    method: "PATCH",
    headers: supabaseHeaders,
    body: JSON.stringify(data),
  }).then(function (res) { return res.json(); })
    .then(function (rows) { return Array.isArray(rows) ? rows[0] : rows; });
}

function deleteExpenseDB(id) {
  return fetch(SUPABASE_URL + "/rest/v1/expenses?id=eq." + id, {
    method: "DELETE",
    headers: supabaseHeaders,
  });
}

// ===================== Bank Accounts =====================

function fetchBankAccountsDB() {
  return fetch(SUPABASE_URL + "/rest/v1/bank_accounts?select=*&order=id.asc", {
    headers: supabaseHeaders,
  }).then(function (res) { return res.json(); });
}

function createBankAccountDB(data) {
  return fetch(SUPABASE_URL + "/rest/v1/bank_accounts", {
    method: "POST",
    headers: supabaseHeaders,
    body: JSON.stringify(data),
  }).then(function (res) { return res.json(); })
    .then(function (rows) { return Array.isArray(rows) ? rows[0] : rows; });
}

function updateBankAccountDB(id, data) {
  return fetch(SUPABASE_URL + "/rest/v1/bank_accounts?id=eq." + id, {
    method: "PATCH",
    headers: supabaseHeaders,
    body: JSON.stringify(data),
  }).then(function (res) { return res.json(); })
    .then(function (rows) { return Array.isArray(rows) ? rows[0] : rows; });
}

function deleteBankAccountDB(id) {
  return fetch(SUPABASE_URL + "/rest/v1/bank_accounts?id=eq." + id, {
    method: "DELETE",
    headers: supabaseHeaders,
  });
}

// ===================== Banks (Bank Names master) =====================

function fetchBanksDB() {
  return fetch(SUPABASE_URL + "/rest/v1/banks?select=*&deleted_at=is.null&order=name.asc", {
    headers: supabaseHeaders,
  }).then(function (res) { return res.json(); });
}

function createBankDB(data) {
  return fetch(SUPABASE_URL + "/rest/v1/banks", {
    method: "POST",
    headers: supabaseHeaders,
    body: JSON.stringify(data),
  }).then(function (res) { return res.json(); })
    .then(function (rows) { return Array.isArray(rows) ? rows[0] : rows; });
}

function updateBankDB(id, data) {
  return fetch(SUPABASE_URL + "/rest/v1/banks?id=eq." + id, {
    method: "PATCH",
    headers: supabaseHeaders,
    body: JSON.stringify(data),
  }).then(function (res) { return res.json(); })
    .then(function (rows) { return Array.isArray(rows) ? rows[0] : rows; });
}

function deleteBankDB(id) {
  return fetch(SUPABASE_URL + "/rest/v1/banks?id=eq." + id, {
    method: "DELETE",
    headers: supabaseHeaders,
  });
}

function softDeleteBankDB(id) {
  return fetch(SUPABASE_URL + "/rest/v1/banks?id=eq." + id, {
    method: "PATCH",
    headers: supabaseHeaders,
    body: JSON.stringify({ deleted_at: new Date().toISOString() }),
  });
}

// ===================== Customers =====================

function fetchCustomersDB() {
  return fetch(SUPABASE_URL + "/rest/v1/customers?select=*&order=id.asc", {
    headers: supabaseHeaders,
  }).then(function (res) { return res.json(); });
}

function createCustomerDB(data) {
  return fetch(SUPABASE_URL + "/rest/v1/customers", {
    method: "POST",
    headers: supabaseHeaders,
    body: JSON.stringify(data),
  }).then(function (res) { return res.json(); })
    .then(function (rows) { return Array.isArray(rows) ? rows[0] : rows; });
}

function updateCustomerDB(id, data) {
  return fetch(SUPABASE_URL + "/rest/v1/customers?id=eq." + id, {
    method: "PATCH",
    headers: supabaseHeaders,
    body: JSON.stringify(data),
  }).then(function (res) { return res.json(); })
    .then(function (rows) { return Array.isArray(rows) ? rows[0] : rows; });
}

function deleteCustomerDB(id) {
  return fetch(SUPABASE_URL + "/rest/v1/customers?id=eq." + id, {
    method: "DELETE",
    headers: supabaseHeaders,
  });
}

// ===================== Suppliers =====================

function fetchSuppliersDB() {
  return fetch(SUPABASE_URL + "/rest/v1/suppliers?select=*&order=id.asc", {
    headers: supabaseHeaders,
  }).then(function (res) { return res.json(); });
}

function createSupplierDB(data) {
  return fetch(SUPABASE_URL + "/rest/v1/suppliers", {
    method: "POST",
    headers: supabaseHeaders,
    body: JSON.stringify(data),
  }).then(function (res) { return res.json(); })
    .then(function (rows) { return Array.isArray(rows) ? rows[0] : rows; });
}

function updateSupplierDB(id, data) {
  return fetch(SUPABASE_URL + "/rest/v1/suppliers?id=eq." + id, {
    method: "PATCH",
    headers: supabaseHeaders,
    body: JSON.stringify(data),
  }).then(function (res) { return res.json(); })
    .then(function (rows) { return Array.isArray(rows) ? rows[0] : rows; });
}

function deleteSupplierDB(id) {
  return fetch(SUPABASE_URL + "/rest/v1/suppliers?id=eq." + id, {
    method: "DELETE",
    headers: supabaseHeaders,
  });
}

// ===================== Purchase Orders =====================

function fetchPurchaseOrdersDB() {
  return fetch(SUPABASE_URL + "/rest/v1/purchase_orders?select=*,suppliers(name),bank_accounts(bank,account_name),purchase_order_items(id,product_id,qty,cost,subtotal,products(name,sku))&order=id.desc", {
    headers: supabaseHeaders,
  }).then(function (res) { return res.json(); });
}

function fetchPurchaseOrderById(id) {
  return fetch(SUPABASE_URL + "/rest/v1/purchase_orders?id=eq." + id + "&select=*,suppliers(name),bank_accounts(bank,account_name),purchase_order_items(id,product_id,qty,cost,subtotal,products(name,sku))&limit=1", {
    headers: supabaseHeaders,
  }).then(function (res) { return res.json(); })
    .then(function (rows) { return rows && rows.length ? rows[0] : null; });
}

function createPurchaseOrderDB(header, items) {
  return fetch(SUPABASE_URL + "/rest/v1/purchase_orders", {
    method: "POST",
    headers: supabaseHeaders,
    body: JSON.stringify(header),
  }).then(function (res) { return res.json(); })
    .then(function (rows) {
      var po = Array.isArray(rows) ? rows[0] : rows;
      if (!po || !po.id) throw new Error("Create PO failed");
      if (!items || !items.length) return po;
      var rowsToInsert = items.map(function (it) {
        return { po_id: po.id, product_id: it.product_id, qty: it.qty, cost: it.cost };
      });
      return fetch(SUPABASE_URL + "/rest/v1/purchase_order_items", {
        method: "POST",
        headers: supabaseHeaders,
        body: JSON.stringify(rowsToInsert),
      }).then(function (res2) { return res2.json(); })
        .then(function () { return po; });
    });
}

function updatePurchaseOrderDB(id, header, items) {
  return fetch(SUPABASE_URL + "/rest/v1/purchase_orders?id=eq." + id, {
    method: "PATCH",
    headers: supabaseHeaders,
    body: JSON.stringify(header),
  }).then(function (res) { return res.json(); })
    .then(function () {
      // ลบ items เดิมทิ้งก่อน แล้ว insert ใหม่
      return fetch(SUPABASE_URL + "/rest/v1/purchase_order_items?po_id=eq." + id, {
        method: "DELETE",
        headers: supabaseHeaders,
      });
    })
    .then(function () {
      if (!items || !items.length) return null;
      var rowsToInsert = items.map(function (it) {
        return { po_id: Number(id), product_id: it.product_id, qty: it.qty, cost: it.cost };
      });
      return fetch(SUPABASE_URL + "/rest/v1/purchase_order_items", {
        method: "POST",
        headers: supabaseHeaders,
        body: JSON.stringify(rowsToInsert),
      }).then(function (res) { return res.json(); });
    });
}

function deletePurchaseOrderDB(id) {
  return fetch(SUPABASE_URL + "/rest/v1/purchase_orders?id=eq." + id, {
    method: "DELETE",
    headers: supabaseHeaders,
  });
}

// ===================== Goods Receipts =====================

function fetchGoodsReceiptsDB() {
  return fetch(SUPABASE_URL + "/rest/v1/goods_receipts?select=*,suppliers(name),warehouses(name),purchase_orders(po_number),goods_receipt_items(id,po_item_id,product_id,qty,cost,subtotal,products(name,sku))&order=id.desc", {
    headers: supabaseHeaders,
  }).then(function (res) { return res.json(); });
}

function createGoodsReceiptDB(header, items) {
  return fetch(SUPABASE_URL + "/rest/v1/goods_receipts", {
    method: "POST",
    headers: supabaseHeaders,
    body: JSON.stringify(header),
  }).then(function (res) { return res.json(); })
    .then(function (rows) {
      var gr = Array.isArray(rows) ? rows[0] : rows;
      if (!gr || !gr.id) throw new Error("Create GR failed");
      if (!items || !items.length) return gr;
      var rowsToInsert = items.map(function (it) {
        return { gr_id: gr.id, po_item_id: it.po_item_id || null, product_id: it.product_id, qty: it.qty, cost: it.cost };
      });
      return fetch(SUPABASE_URL + "/rest/v1/goods_receipt_items", {
        method: "POST",
        headers: supabaseHeaders,
        body: JSON.stringify(rowsToInsert),
      }).then(function (res2) { return res2.json(); })
        .then(function () { return gr; });
    });
}

function updateGoodsReceiptDB(id, header, items) {
  return fetch(SUPABASE_URL + "/rest/v1/goods_receipts?id=eq." + id, {
    method: "PATCH",
    headers: supabaseHeaders,
    body: JSON.stringify(header),
  }).then(function (res) { return res.json(); })
    .then(function () {
      return fetch(SUPABASE_URL + "/rest/v1/goods_receipt_items?gr_id=eq." + id, {
        method: "DELETE",
        headers: supabaseHeaders,
      });
    })
    .then(function () {
      if (!items || !items.length) return null;
      var rowsToInsert = items.map(function (it) {
        return { gr_id: Number(id), po_item_id: it.po_item_id || null, product_id: it.product_id, qty: it.qty, cost: it.cost };
      });
      return fetch(SUPABASE_URL + "/rest/v1/goods_receipt_items", {
        method: "POST",
        headers: supabaseHeaders,
        body: JSON.stringify(rowsToInsert),
      }).then(function (res) { return res.json(); });
    });
}

function deleteGoodsReceiptDB(id) {
  return fetch(SUPABASE_URL + "/rest/v1/goods_receipts?id=eq." + id, {
    method: "DELETE",
    headers: supabaseHeaders,
  });
}

// ===================== Purchase Returns =====================

function fetchPurchaseReturnsDB() {
  return fetch(SUPABASE_URL + "/rest/v1/purchase_returns?select=*,suppliers(name),warehouses(name),goods_receipts(gr_number),purchase_return_items(id,product_id,qty,cost,subtotal,products(name,sku))&order=id.desc", {
    headers: supabaseHeaders,
  }).then(function (res) { return res.json(); });
}

function createPurchaseReturnDB(header, items) {
  return fetch(SUPABASE_URL + "/rest/v1/purchase_returns", {
    method: "POST",
    headers: supabaseHeaders,
    body: JSON.stringify(header),
  }).then(function (res) { return res.json(); })
    .then(function (rows) {
      var pr = Array.isArray(rows) ? rows[0] : rows;
      if (!pr || !pr.id) throw new Error("Create return failed");
      if (!items || !items.length) return pr;
      var rowsToInsert = items.map(function (it) {
        return { return_id: pr.id, product_id: it.product_id, qty: it.qty, cost: it.cost };
      });
      return fetch(SUPABASE_URL + "/rest/v1/purchase_return_items", {
        method: "POST",
        headers: supabaseHeaders,
        body: JSON.stringify(rowsToInsert),
      }).then(function (r2) { return r2.json(); })
        .then(function () { return pr; });
    });
}

function updatePurchaseReturnDB(id, header, items) {
  return fetch(SUPABASE_URL + "/rest/v1/purchase_returns?id=eq." + id, {
    method: "PATCH",
    headers: supabaseHeaders,
    body: JSON.stringify(header),
  }).then(function (res) { return res.json(); })
    .then(function () {
      return fetch(SUPABASE_URL + "/rest/v1/purchase_return_items?return_id=eq." + id, {
        method: "DELETE",
        headers: supabaseHeaders,
      });
    })
    .then(function () {
      if (!items || !items.length) return null;
      var rowsToInsert = items.map(function (it) {
        return { return_id: Number(id), product_id: it.product_id, qty: it.qty, cost: it.cost };
      });
      return fetch(SUPABASE_URL + "/rest/v1/purchase_return_items", {
        method: "POST",
        headers: supabaseHeaders,
        body: JSON.stringify(rowsToInsert),
      }).then(function (res) { return res.json(); });
    });
}

function deletePurchaseReturnDB(id) {
  return fetch(SUPABASE_URL + "/rest/v1/purchase_returns?id=eq." + id, {
    method: "DELETE",
    headers: supabaseHeaders,
  });
}

// ===================== Sales Orders =====================

function fetchSalesOrdersDB() {
  return fetch(SUPABASE_URL + "/rest/v1/sales_orders?select=*,customers(name),warehouses(name),sales_order_items(id,product_id,qty,price,subtotal,products(name,sku))&order=id.desc", {
    headers: supabaseHeaders,
  }).then(function (res) { return res.json(); });
}

function createSalesOrderDB(header, items) {
  return fetch(SUPABASE_URL + "/rest/v1/sales_orders", {
    method: "POST",
    headers: supabaseHeaders,
    body: JSON.stringify(header),
  }).then(function (res) { return res.json(); })
    .then(function (rows) {
      var so = Array.isArray(rows) ? rows[0] : rows;
      if (!so || !so.id) throw new Error("Create SO failed");
      if (!items || !items.length) return so;
      var rowsToInsert = items.map(function (it) {
        return { so_id: so.id, product_id: it.product_id, qty: it.qty, price: it.price };
      });
      return fetch(SUPABASE_URL + "/rest/v1/sales_order_items", {
        method: "POST",
        headers: supabaseHeaders,
        body: JSON.stringify(rowsToInsert),
      }).then(function (r2) { return r2.json(); })
        .then(function () { return so; });
    });
}

function updateSalesOrderDB(id, header, items) {
  return fetch(SUPABASE_URL + "/rest/v1/sales_orders?id=eq." + id, {
    method: "PATCH",
    headers: supabaseHeaders,
    body: JSON.stringify(header),
  }).then(function (res) { return res.json(); })
    .then(function () {
      return fetch(SUPABASE_URL + "/rest/v1/sales_order_items?so_id=eq." + id, {
        method: "DELETE",
        headers: supabaseHeaders,
      });
    })
    .then(function () {
      if (!items || !items.length) return null;
      var rowsToInsert = items.map(function (it) {
        return { so_id: Number(id), product_id: it.product_id, qty: it.qty, price: it.price };
      });
      return fetch(SUPABASE_URL + "/rest/v1/sales_order_items", {
        method: "POST",
        headers: supabaseHeaders,
        body: JSON.stringify(rowsToInsert),
      }).then(function (res) { return res.json(); });
    });
}

function deleteSalesOrderDB(id) {
  return fetch(SUPABASE_URL + "/rest/v1/sales_orders?id=eq." + id, {
    method: "DELETE",
    headers: supabaseHeaders,
  });
}

// ===================== Sales Returns =====================

function fetchSalesReturnsDB() {
  return fetch(SUPABASE_URL + "/rest/v1/sales_returns?select=*,customers(name),warehouses(name),sales_orders(so_number),sales_return_items(id,product_id,qty,price,subtotal,products(name,sku))&order=id.desc", {
    headers: supabaseHeaders,
  }).then(function (res) { return res.json(); });
}

function createSalesReturnDB(header, items) {
  return fetch(SUPABASE_URL + "/rest/v1/sales_returns", {
    method: "POST",
    headers: supabaseHeaders,
    body: JSON.stringify(header),
  }).then(function (res) { return res.json(); })
    .then(function (rows) {
      var sr = Array.isArray(rows) ? rows[0] : rows;
      if (!sr || !sr.id) throw new Error("Create sales return failed");
      if (!items || !items.length) return sr;
      var rowsToInsert = items.map(function (it) {
        return { return_id: sr.id, product_id: it.product_id, qty: it.qty, price: it.price };
      });
      return fetch(SUPABASE_URL + "/rest/v1/sales_return_items", {
        method: "POST",
        headers: supabaseHeaders,
        body: JSON.stringify(rowsToInsert),
      }).then(function (r2) { return r2.json(); })
        .then(function () { return sr; });
    });
}

function updateSalesReturnDB(id, header, items) {
  return fetch(SUPABASE_URL + "/rest/v1/sales_returns?id=eq." + id, {
    method: "PATCH",
    headers: supabaseHeaders,
    body: JSON.stringify(header),
  }).then(function (res) { return res.json(); })
    .then(function () {
      return fetch(SUPABASE_URL + "/rest/v1/sales_return_items?return_id=eq." + id, {
        method: "DELETE",
        headers: supabaseHeaders,
      });
    })
    .then(function () {
      if (!items || !items.length) return null;
      var rowsToInsert = items.map(function (it) {
        return { return_id: Number(id), product_id: it.product_id, qty: it.qty, price: it.price };
      });
      return fetch(SUPABASE_URL + "/rest/v1/sales_return_items", {
        method: "POST",
        headers: supabaseHeaders,
        body: JSON.stringify(rowsToInsert),
      }).then(function (res) { return res.json(); });
    });
}

function deleteSalesReturnDB(id) {
  return fetch(SUPABASE_URL + "/rest/v1/sales_returns?id=eq." + id, {
    method: "DELETE",
    headers: supabaseHeaders,
  });
}

// ===================== Stock Movements =====================

function fetchMovementsDB() {
  return fetch(SUPABASE_URL + "/rest/v1/stock_movements?select=*,products(name,sku),warehouse:warehouses!warehouse_id(name),from_warehouse:warehouses!from_warehouse_id(name)&order=date.desc,id.desc", {
    headers: supabaseHeaders,
  }).then(function (res) { return res.json(); });
}

function createMovementDB(data) {
  return fetch(SUPABASE_URL + "/rest/v1/stock_movements", {
    method: "POST",
    headers: supabaseHeaders,
    body: JSON.stringify(data),
  }).then(function (res) { return res.json(); })
    .then(function (rows) { return Array.isArray(rows) ? rows[0] : rows; });
}

function updateMovementDB(id, data) {
  return fetch(SUPABASE_URL + "/rest/v1/stock_movements?id=eq." + id, {
    method: "PATCH",
    headers: supabaseHeaders,
    body: JSON.stringify(data),
  }).then(function (res) { return res.json(); })
    .then(function (rows) { return Array.isArray(rows) ? rows[0] : rows; });
}

function deleteMovementDB(id) {
  return fetch(SUPABASE_URL + "/rest/v1/stock_movements?id=eq." + id, {
    method: "DELETE",
    headers: supabaseHeaders,
  });
}

// ===================== Initial Stock =====================

function fetchInitialStocks() {
  return fetch(SUPABASE_URL + "/rest/v1/initial_stock?select=*,products(name,sku),warehouses(name)&order=id.asc", {
    headers: supabaseHeaders,
  }).then(function (res) { return res.json(); });
}

function createInitialStockDB(data) {
  return fetch(SUPABASE_URL + "/rest/v1/initial_stock", {
    method: "POST",
    headers: supabaseHeaders,
    body: JSON.stringify(data),
  }).then(function (res) { return res.json(); })
    .then(function (rows) { return Array.isArray(rows) ? rows[0] : rows; });
}

function updateInitialStockDB(id, data) {
  return fetch(SUPABASE_URL + "/rest/v1/initial_stock?id=eq." + id, {
    method: "PATCH",
    headers: supabaseHeaders,
    body: JSON.stringify(data),
  }).then(function (res) { return res.json(); })
    .then(function (rows) { return Array.isArray(rows) ? rows[0] : rows; });
}

function deleteInitialStockDB(id) {
  return fetch(SUPABASE_URL + "/rest/v1/initial_stock?id=eq." + id, {
    method: "DELETE",
    headers: supabaseHeaders,
  });
}

function saveProductUnitConversions(productId, conversions) {
  // ลบของเดิมก่อน แล้ว insert ใหม่ทั้งหมด
  return fetch(SUPABASE_URL + "/rest/v1/product_unit_conversions?product_id=eq." + productId, {
    method: "DELETE",
    headers: supabaseHeaders,
  }).then(function () {
    if (!conversions || conversions.length === 0) return Promise.resolve([]);
    var rows = conversions.map(function (c) {
      return {
        product_id: productId,
        unit_id: c.unit_id,
        factor: c.factor,
        is_base: !!c.is_base,
      };
    });
    return fetch(SUPABASE_URL + "/rest/v1/product_unit_conversions", {
      method: "POST",
      headers: supabaseHeaders,
      body: JSON.stringify(rows),
    }).then(function (res) { return res.json(); });
  });
}
