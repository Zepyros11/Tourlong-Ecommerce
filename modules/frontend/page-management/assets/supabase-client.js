// ============================================================
// supabase-client.js — Supabase API Client
// ------------------------------------------------------------
// หน้าที่: CRUD pages & blocks ผ่าน Supabase REST API
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

/** โหลด pages ทั้งหมด */
function fetchPages() {
  return fetch(SUPABASE_URL + "/rest/v1/pages?select=*&order=id.asc", {
    headers: supabaseHeaders,
  }).then(function (res) { return res.json(); });
}

/** สร้าง page ใหม่ */
function createPageDB(pageData) {
  return fetch(SUPABASE_URL + "/rest/v1/pages", {
    method: "POST",
    headers: supabaseHeaders,
    body: JSON.stringify(pageData),
  }).then(function (res) { return res.json(); });
}

/** อัพเดท page */
function updatePageDB(pageId, pageData) {
  return fetch(SUPABASE_URL + "/rest/v1/pages?id=eq." + pageId, {
    method: "PATCH",
    headers: supabaseHeaders,
    body: JSON.stringify(pageData),
  }).then(function (res) { return res.json(); });
}

/** ลบ page (blocks จะลบตาม CASCADE) */
function deletePageDB(pageId) {
  return fetch(SUPABASE_URL + "/rest/v1/pages?id=eq." + pageId, {
    method: "DELETE",
    headers: supabaseHeaders,
  });
}

// ===================== Blocks =====================

/** โหลด blocks ของ page */
function fetchBlocks(pageId) {
  return fetch(SUPABASE_URL + "/rest/v1/blocks?page_id=eq." + pageId + "&select=*&order=sort_order.asc", {
    headers: supabaseHeaders,
  }).then(function (res) { return res.json(); });
}

/** บันทึก blocks ทั้งหมดของ page (ลบเก่า + insert ใหม่) */
function saveBlocksDB(pageId, blocks) {
  // Step 1: ลบ blocks เก่าของ page นี้
  return fetch(SUPABASE_URL + "/rest/v1/blocks?page_id=eq." + pageId, {
    method: "DELETE",
    headers: supabaseHeaders,
  }).then(function () {
    // Step 2: Insert blocks ใหม่
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

// ===================== Storage (Upload) =====================

/** Upload ไฟล์ไป Supabase Storage */
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
    // Return public URL
    return SUPABASE_URL + "/storage/v1/object/public/upload logo/" + filePath;
  });
}

/** เพิ่ม block เดียว */
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
