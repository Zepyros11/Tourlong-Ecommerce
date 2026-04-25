// ============================================================
// cancel-helpers.js — Shared cancel/reverse logic
// ------------------------------------------------------------
// - ตรวจ app mode (production / test)
// - สร้าง reverse stock_movement ตอนยกเลิก GR/Return
// - Helpers สำหรับ cascade cancel
//
// Depend on: app-mode.js, manager-password.js, supabase-client.js
// ============================================================

// Always fresh (ไม่ใช้ cache) — ใช้ตัดสินใจ render ปุ่ม delete/cancel
// ถ้าหน้าโหลดตอน mode เพิ่งเปลี่ยน → ต้องเห็นปุ่มถูกต้องทันที
function isProductionMode() {
  if (typeof getAppModeFresh === "function") {
    return getAppModeFresh().then(function (m) { return m === "production"; });
  }
  if (typeof getAppMode === "function") {
    return getAppMode().then(function (m) { return m === "production"; });
  }
  return Promise.resolve(false);
}

// สร้าง reverse stock_movement ตอน cancel
// payload: { type: "in"|"out", product_id, warehouse_id, qty, note, date }
function createReverseMovement(originalItem, reverseType, warehouseId, note) {
  var payload = {
    type: reverseType,
    product_id: originalItem.product_id,
    warehouse_id: warehouseId,
    qty: Number(originalItem.qty) || 0,
    date: new Date().toISOString().slice(0, 10),
    note: note || "reverse",
  };
  return fetch(SUPABASE_URL + "/rest/v1/stock_movements", {
    method: "POST",
    headers: supabaseHeaders,
    body: JSON.stringify(payload),
  }).then(function (res) {
    if (!res.ok) {
      return res.text().then(function (txt) {
        throw new Error("createReverseMovement failed (" + res.status + "): " + txt);
      });
    }
    return res;
  });
}

// Reverse ของ GR ทั้งใบ → สร้าง type=out ต่อ item (GR เดิม = stock in)
function reverseGRMovements(gr) {
  var items = gr.goods_receipt_items || [];
  var note = "ยกเลิก GR " + (gr.gr_number || "");
  return Promise.all(items.map(function (it) {
    return createReverseMovement(it, "out", gr.warehouse_id, note);
  }));
}

// Reverse ของ Return → สร้าง type=in ต่อ item (Return เดิม = stock out)
function reverseReturnMovements(pr) {
  var items = pr.purchase_return_items || [];
  var note = "ยกเลิก PR " + (pr.return_number || "");
  return Promise.all(items.map(function (it) {
    return createReverseMovement(it, "in", pr.warehouse_id, note);
  }));
}

// Update status ของเอกสาร (PO/GR/Return)
function updateDocStatus(table, id, status, extraPayload) {
  var payload = Object.assign({ status: status }, extraPayload || {});
  return fetch(SUPABASE_URL + "/rest/v1/" + table + "?id=eq." + id, {
    method: "PATCH",
    headers: supabaseHeaders,
    body: JSON.stringify(payload),
  });
}

// Log activity
function logCancelActivity(action, description) {
  if (typeof createActivityLogDB !== "function") return Promise.resolve();
  var user = (typeof getCurrentUser === "function" ? getCurrentUser() : null) || {};
  return createActivityLogDB({
    datetime: new Date().toISOString(),
    user_name: user.name || "unknown",
    action: action,
    module: "Cancel",
    description: description,
  }).catch(function () {});
}
