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

function uploadFileToStorage(file, folder) {
  folder = folder || "images";
  var fileName = Date.now() + "-" + file.name.replace(/[^a-zA-Z0-9._-]/g, "");
  var filePath = folder + "/" + fileName;

  return fetch(SUPABASE_URL + "/storage/v1/object/upload logo/" + filePath, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": "Bearer " + SUPABASE_KEY,
      "Content-Type": file.type,
    },
    body: file,
  }).then(function (res) {
    if (!res.ok) throw new Error("Upload failed: " + res.status);
    return SUPABASE_URL + "/storage/v1/object/public/upload logo/" + filePath;
  });
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

function fetchProducts(activeOnly) {
  var filter = activeOnly ? "&status=eq.active" : "";
  return fetch(SUPABASE_URL + "/rest/v1/products?select=*,categories(name)" + filter + "&order=id.asc", {
    headers: supabaseHeaders,
  }).then(function (res) { return res.json(); });
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
