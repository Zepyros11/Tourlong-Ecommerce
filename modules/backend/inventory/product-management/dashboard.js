// ============================================================
// dashboard.js — Inventory Dashboard (Supabase)
// ------------------------------------------------------------
// Tier 1: Stock Value, Out of Stock, Top Movers 30d
// Tier 2: Dead Stock, Stock by Warehouse, Incoming Stock
// Tier 3: Stock Timeline, Reorder Forecast, ABC Analysis
// ============================================================

// Store data เพื่อให้ modal lookup ได้ (expose ออกนอก IIFE)
var _dashboardPOs = [];
var _dashboardCompany = null;
var _dashboardSuppliers = [];

function printPODocument() {
  var area = document.getElementById("poPrintArea");
  if (!area) return;
  var win = window.open("", "_blank", "width=900,height=900");
  if (!win) {
    alert("กรุณาอนุญาต pop-up เพื่อพิมพ์เอกสาร");
    return;
  }
  win.document.write(
    '<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><title>Purchase Order</title>' +
    '<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">' +
    '<style>' +
      '* { box-sizing: border-box; }' +
      'body { font-family: "Plus Jakarta Sans", "Sarabun", sans-serif; margin: 0; padding: 24px; background: #fff; color: #0f172a; -webkit-print-color-adjust: exact; print-color-adjust: exact; }' +
      'table { border-collapse: collapse; }' +
      '@page { size: A4; margin: 12mm; }' +
      '@media print { body { padding: 0; } }' +
    '</style>' +
    '</head><body>' +
    area.outerHTML +
    '<script>window.addEventListener("load", function(){ setTimeout(function(){ window.print(); }, 400); });<\/script>' +
    '</body></html>'
  );
  win.document.close();
  win.focus();
}

function viewPODetail(poId) {
  var po = _dashboardPOs.find(function (p) { return Number(p.id) === Number(poId); });
  if (!po) return;

  var body = document.getElementById("poViewBody");
  var statusLabel = { approved: "อนุมัติแล้ว", pending: "รอดำเนินการ", cancelled: "ยกเลิก" };
  var statusColor = { approved: "#10b981", pending: "#f59e0b", cancelled: "#ef4444" };
  var statusBg = { approved: "#d1fae5", pending: "#fef3c7", cancelled: "#fee2e2" };
  var fmt = function (n) { return Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
  var fmtMoney = function (n) { return "฿" + fmt(n); };

  var company = _dashboardCompany || {};
  var supplierFull = _dashboardSuppliers.find(function (s) { return Number(s.id) === Number(po.supplier_id); }) || {};
  var supplierName = (po.suppliers && po.suppliers.name) || supplierFull.name || "—";

  var items = po.purchase_order_items || [];
  var subtotal = Number(po.subtotal) || 0;
  var tax = Number(po.tax) || 0;
  var total = Number(po.total) || (subtotal + tax);

  // ===== Header: Company (left) + PURCHASE ORDER title (right) =====
  var logoHtml = company.logo_url
    ? '<img src="' + company.logo_url + '" style="width:80px;height:80px;object-fit:contain;flex:0 0 80px;" />'
    : '';

  var companyBlock =
    '<div style="display:flex;align-items:center;gap:14px;">' +
      logoHtml +
      '<div>' +
        '<h2 style="margin:0 0 3px;font-size:17px;font-weight:800;color:#0f172a;letter-spacing:0.3px;">' + (company.name || "Pathara") + '</h2>' +
        (company.branch ? '<p style="margin:0 0 3px;font-size:10px;color:#64748b;">สาขา ' + company.branch + '</p>' : '') +
        (company.address ? '<p style="margin:0 0 2px;font-size:10px;color:#64748b;line-height:1.5;">' + company.address + '</p>' : '') +
        '<p style="margin:2px 0 0;font-size:10px;color:#64748b;">' +
          (company.phone ? 'โทร. ' + company.phone : '') +
          (company.phone && company.email ? '  |  ' : '') +
          (company.email || '') +
        '</p>' +
        (company.tax_id ? '<p style="margin:2px 0 0;font-size:10px;color:#64748b;">เลขประจำตัวผู้เสียภาษี: ' + company.tax_id + '</p>' : '') +
      '</div>' +
    '</div>';

  var titleBlock =
    '<div style="text-align:right;">' +
      '<h1 style="margin:0 0 4px;font-size:22px;font-weight:800;color:#0f172a;letter-spacing:1px;">PURCHASE ORDER</h1>' +
      '<p style="margin:0 0 8px;font-size:11px;color:#64748b;letter-spacing:0.3px;">ใบสั่งซื้อ</p>' +
      '<div style="display:inline-block;padding:4px 12px;background:#f1f5f9;border-radius:6px;font-size:13px;font-weight:800;color:#0f172a;letter-spacing:0.5px;">' + (po.po_number || "—") + '</div>' +
    '</div>';

  var header =
    '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:20px;padding:24px 28px 20px;border-bottom:2px solid #0f172a;">' +
      companyBlock + titleBlock +
    '</div>';

  // ===== Supplier info (left) + Meta (right) =====
  var supplierDetails =
    '<p style="margin:0 0 6px;font-size:9px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;">ผู้ขาย / Supplier</p>' +
    '<p style="margin:0 0 3px;font-size:13px;font-weight:800;color:#0f172a;">' + supplierName + '</p>' +
    (supplierFull.address ? '<p style="margin:0 0 2px;font-size:10px;color:#64748b;line-height:1.5;">' + supplierFull.address + '</p>' : '') +
    (supplierFull.phone ? '<p style="margin:2px 0 0;font-size:10px;color:#64748b;">โทร. ' + supplierFull.phone + '</p>' : '') +
    (supplierFull.email ? '<p style="margin:2px 0 0;font-size:10px;color:#64748b;">' + supplierFull.email + '</p>' : '') +
    (supplierFull.tax_id ? '<p style="margin:2px 0 0;font-size:10px;color:#64748b;">เลขประจำตัวผู้เสียภาษี: ' + supplierFull.tax_id + '</p>' : '');

  var meta =
    '<table style="font-size:11px;border-collapse:collapse;width:100%;">' +
      '<tr><td style="padding:2px 0;color:#64748b;width:100px;">เลขที่เอกสาร</td><td style="padding:2px 0;text-align:right;font-weight:700;color:#0f172a;">' + (po.po_number || "—") + '</td></tr>' +
      '<tr><td style="padding:2px 0;color:#64748b;">วันที่สั่ง</td><td style="padding:2px 0;text-align:right;font-weight:700;color:#0f172a;">' + (po.date || "—") + '</td></tr>' +
      '<tr><td style="padding:2px 0;color:#64748b;">สถานะ</td><td style="padding:2px 0;text-align:right;"><span style="display:inline-block;padding:2px 10px;border-radius:9999px;font-size:10px;font-weight:800;background:' + (statusBg[po.status] || "#f1f5f9") + ';color:' + (statusColor[po.status] || "#64748b") + ';">' + (statusLabel[po.status] || po.status) + '</span></td></tr>' +
    '</table>';

  var infoRow =
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;padding:18px 28px;">' +
      '<div>' + supplierDetails + '</div>' +
      '<div>' + meta + '</div>' +
    '</div>';

  // ===== Items table (formal) =====
  var itemsTable;
  if (!items.length) {
    itemsTable = '<p style="text-align:center;color:#94a3b8;font-size:11px;padding:30px;">ไม่มีรายการ</p>';
  } else {
    var rows = items.map(function (it, idx) {
      var name = it.products ? it.products.name : "—";
      var sku = it.products ? it.products.sku : "—";
      var qty = Number(it.qty) || 0;
      var cost = Number(it.cost) || 0;
      var sub = qty * cost;
      return '<tr style="border-bottom:1px solid #e2e8f0;">' +
        '<td style="padding:10px 8px;text-align:center;color:#64748b;font-size:11px;width:40px;">' + (idx + 1) + '</td>' +
        '<td style="padding:10px 8px;">' +
          '<div style="font-size:12px;font-weight:700;color:#0f172a;word-break:break-word;">' + name + '</div>' +
          '<div style="font-size:10px;color:#94a3b8;margin-top:2px;">SKU: ' + (sku || "—") + '</div>' +
        '</td>' +
        '<td style="padding:10px 8px;text-align:center;font-size:12px;color:#0f172a;font-weight:600;width:70px;">' + qty + '</td>' +
        '<td style="padding:10px 8px;text-align:right;font-size:12px;color:#0f172a;width:110px;">' + fmt(cost) + '</td>' +
        '<td style="padding:10px 8px;text-align:right;font-size:12px;font-weight:700;color:#0f172a;width:120px;">' + fmt(sub) + '</td>' +
      '</tr>';
    }).join("");

    itemsTable =
      '<table style="width:100%;border-collapse:collapse;">' +
        '<thead><tr style="background:#0f172a;color:#fff;">' +
          '<th style="padding:10px 8px;text-align:center;font-size:10px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">#</th>' +
          '<th style="padding:10px 8px;text-align:left;font-size:10px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">รายการสินค้า</th>' +
          '<th style="padding:10px 8px;text-align:center;font-size:10px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">จำนวน</th>' +
          '<th style="padding:10px 8px;text-align:right;font-size:10px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">ราคา/หน่วย</th>' +
          '<th style="padding:10px 8px;text-align:right;font-size:10px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">รวม</th>' +
        '</tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
      '</table>';
  }

  var itemsSection = '<div style="padding:0 28px 18px;">' + itemsTable + '</div>';

  // ===== Totals (right-aligned) =====
  var totalsSection =
    '<div style="display:flex;justify-content:flex-end;padding:0 28px 20px;">' +
      '<table style="font-size:12px;border-collapse:collapse;min-width:280px;">' +
        '<tr><td style="padding:4px 12px;color:#64748b;text-align:right;">Subtotal</td><td style="padding:4px 0;text-align:right;font-weight:600;color:#0f172a;min-width:120px;">' + fmtMoney(subtotal) + '</td></tr>' +
        (tax > 0 ? '<tr><td style="padding:4px 12px;color:#64748b;text-align:right;">Tax (VAT)</td><td style="padding:4px 0;text-align:right;font-weight:600;color:#0f172a;">' + fmtMoney(tax) + '</td></tr>' : '') +
        '<tr style="border-top:2px solid #0f172a;"><td style="padding:8px 12px 0;text-align:right;font-weight:800;color:#0f172a;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;">Grand Total</td><td style="padding:8px 0 0;text-align:right;font-weight:800;color:#0f172a;font-size:15px;">' + fmtMoney(total) + '</td></tr>' +
      '</table>' +
    '</div>';

  // ===== Payment section =====
  var methodLabels = { bank_transfer: "โอนธนาคาร", cash: "เงินสด", credit_card: "บัตรเครดิต", check: "เช็ค" };
  var paymentSection = "";
  if (po.payment_status === "paid") {
    var bankText = po.bank_accounts ? (po.bank_accounts.bank + " — " + po.bank_accounts.account_name) : "";
    var methodText = methodLabels[po.payment_method] || po.payment_method || "—";
    var slipLink = po.payment_slip_url
      ? ' &nbsp;·&nbsp; <a href="' + po.payment_slip_url + '" target="_blank" style="color:#10b981;text-decoration:underline;">ดูสลิป</a>'
      : "";
    var receiptText = "";
    if (po.receipt_url || po.receipt_number) {
      var receiptLink = po.receipt_url ? ' &nbsp;·&nbsp; <a href="' + po.receipt_url + '" target="_blank" style="color:#3b82f6;text-decoration:underline;">ดูใบเสร็จ</a>' : "";
      receiptText =
        '<div style="margin-top:8px;padding-top:8px;border-top:1px dashed #e2e8f0;">' +
          '<span style="font-size:10px;font-weight:800;color:#3b82f6;text-transform:uppercase;letter-spacing:0.5px;">🧾 ใบเสร็จจากผู้ขาย</span>' +
          '<p style="margin:3px 0 0;font-size:11px;color:#334155;">เลขที่: <strong>' + (po.receipt_number || "—") + '</strong>' + receiptLink + '</p>' +
        '</div>';
    }
    paymentSection =
      '<div style="margin:0 28px 20px;padding:14px 16px;background:#ecfdf5;border-left:3px solid #10b981;border-radius:4px;">' +
        '<span style="font-size:10px;font-weight:800;color:#10b981;text-transform:uppercase;letter-spacing:0.5px;">✅ ชำระเงินแล้ว</span>' +
        '<p style="margin:3px 0 0;font-size:11px;color:#334155;">' +
          'วันที่ <strong>' + (po.paid_date || "—") + '</strong>' +
          ' &nbsp;·&nbsp; วิธี: <strong>' + methodText + '</strong>' +
          (bankText ? ' &nbsp;·&nbsp; ' + bankText : '') +
          slipLink +
        '</p>' +
        receiptText +
      '</div>';
  } else if (po.status === "approved") {
    paymentSection =
      '<div style="margin:0 28px 20px;padding:10px 14px;background:#fffbeb;border-left:3px solid #f59e0b;border-radius:4px;font-size:11px;color:#78350f;">' +
        '⏳ ยังไม่ได้ชำระเงิน' +
      '</div>';
  }

  // ===== Notes / Terms =====
  var notesSection = po.note
    ? '<div style="margin:0 28px 20px;padding:14px 16px;background:#f8fafc;border-left:3px solid #0f172a;border-radius:4px;">' +
        '<p style="margin:0 0 4px;font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">หมายเหตุ / Notes</p>' +
        '<p style="margin:0;font-size:11px;color:#334155;line-height:1.6;">' + po.note + '</p>' +
      '</div>'
    : '';

  // ===== Signature area =====
  var signatureSection =
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:60px;padding:24px 28px 28px;margin-top:8px;">' +
      '<div style="text-align:center;">' +
        '<div style="border-top:1px solid #94a3b8;padding-top:6px;margin-top:40px;">' +
          '<p style="margin:0;font-size:11px;color:#64748b;">ผู้สั่งซื้อ</p>' +
          '<p style="margin:2px 0 0;font-size:10px;color:#94a3b8;">วันที่ ................................</p>' +
        '</div>' +
      '</div>' +
      '<div style="text-align:center;">' +
        '<div style="border-top:1px solid #94a3b8;padding-top:6px;margin-top:40px;">' +
          '<p style="margin:0;font-size:11px;color:#64748b;">ผู้อนุมัติ</p>' +
          '<p style="margin:2px 0 0;font-size:10px;color:#94a3b8;">วันที่ ................................</p>' +
        '</div>' +
      '</div>' +
    '</div>';

  // Wrap ทั้งหมดใน id="poPrintArea" เพื่อให้ @media print ทำงาน
  body.innerHTML =
    '<div id="poPrintArea" style="background:#fff;">' +
      header +
      infoRow +
      itemsSection +
      totalsSection +
      paymentSection +
      notesSection +
      signatureSection +
    '</div>';

  if (typeof lucide !== "undefined") lucide.createIcons();
  openModalById("poViewModal");
}

(function () {
  var DEFAULT_LOW_STOCK_THRESHOLD = 10;
  var MS_PER_DAY = 86400000;

  function fmtQty(n) { return Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 }); }
  function fmtMoney(n) { return "฿" + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }

  function daysAgo(date, n) {
    var d = new Date(date);
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  }

  // ==================== Activity helpers ====================
  function movementActivity(m) {
    var pName = m.products ? m.products.name : "—";
    var qty = Number(m.qty) || 0;
    var color, text;
    if (m.type === "in") {
      color = "green";
      text = "รับเข้า <strong>" + qty + "</strong> × " + pName + " → " + (m.warehouse ? m.warehouse.name : "—");
    } else if (m.type === "out") {
      color = "red";
      text = "จ่ายออก <strong>" + qty + "</strong> × " + pName + " จาก " + (m.warehouse ? m.warehouse.name : "—");
    } else if (m.type === "transfer") {
      color = "yellow";
      text = "โอน <strong>" + qty + "</strong> × " + pName + " (" + (m.from_warehouse ? m.from_warehouse.name : "—") + " → " + (m.warehouse ? m.warehouse.name : "—") + ")";
    } else {
      color = "blue";
      text = pName + " (" + (m.type || "") + ")";
    }
    if (m.note) text += ' <span style="color:#94a3b8;">— ' + m.note + '</span>';
    return { color: color, text: text };
  }

  // ==================== Incoming (PO rับ ไม่ครบ) ====================
  function isPOFullyReceived(po, grs) {
    var items = po.purchase_order_items || [];
    if (!items.length) return false;
    return items.every(function (pi) {
      var ordered = Number(pi.qty) || 0;
      if (ordered <= 0) return true;
      var received = 0;
      grs.forEach(function (g) {
        if (Number(g.po_id) !== Number(po.id)) return;
        if (g.status === "cancelled") return;
        (g.goods_receipt_items || []).forEach(function (gi) {
          if (Number(gi.po_item_id) === Number(pi.id)) received += Number(gi.qty) || 0;
        });
      });
      return received >= ordered;
    });
  }

  // ==================== Charts (inline SVG/CSS) ====================
  function renderWarehouseChart(stockByWarehouse, warehouses) {
    var el = document.getElementById("warehouseChart");
    var rows = warehouses.map(function (w) {
      return { name: w.name || "—", qty: stockByWarehouse[w.id] || 0 };
    });
    var max = rows.reduce(function (m, r) { return Math.max(m, r.qty); }, 0) || 1;
    if (!rows.length) {
      el.innerHTML = '<p style="padding:20px;text-align:center;color:#94a3b8;font-size:11px;">ยังไม่มีคลัง</p>';
      return;
    }
    el.innerHTML = rows.map(function (r) {
      var pct = (r.qty / max) * 100;
      return '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;font-size:11px;">' +
        '<div style="flex:0 0 120px;color:#1e293b;font-weight:600;">' + r.name + '</div>' +
        '<div style="flex:1;background:#f1f5f9;border-radius:6px;overflow:hidden;height:18px;position:relative;">' +
          '<div style="background:linear-gradient(90deg,#47b8b4,#10b981);height:100%;width:' + pct + '%;transition:width 0.3s;"></div>' +
        '</div>' +
        '<div style="flex:0 0 60px;text-align:right;font-weight:700;color:#1e293b;">' + fmtQty(r.qty) + '</div>' +
      '</div>';
    }).join("");
  }

  function renderTimelineChart(dailyTotals) {
    var el = document.getElementById("timelineChart");
    if (!dailyTotals.length) {
      el.innerHTML = '<p style="padding:30px;text-align:center;color:#94a3b8;font-size:11px;">ไม่มีข้อมูล</p>';
      return;
    }
    var W = 720, H = 160, PAD = 28;
    var values = dailyTotals.map(function (d) { return d.qty; });
    var max = Math.max.apply(null, values);
    var min = Math.min.apply(null, values);
    if (max === min) max = min + 1;
    var stepX = (W - PAD * 2) / (dailyTotals.length - 1 || 1);
    var points = dailyTotals.map(function (d, i) {
      var x = PAD + i * stepX;
      var y = H - PAD - ((d.qty - min) / (max - min)) * (H - PAD * 2);
      return { x: x, y: y, d: d };
    });
    var path = points.map(function (p, i) { return (i === 0 ? "M" : "L") + p.x.toFixed(1) + "," + p.y.toFixed(1); }).join(" ");
    var area = path + " L" + points[points.length - 1].x + "," + (H - PAD) + " L" + points[0].x + "," + (H - PAD) + " Z";
    var firstLabel = dailyTotals[0].date;
    var lastLabel = dailyTotals[dailyTotals.length - 1].date;
    var midLabel = dailyTotals[Math.floor(dailyTotals.length / 2)].date;

    var dots = points.map(function (p) {
      return '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="2.5" fill="#47b8b4">' +
        '<title>' + p.d.date + ': ' + fmtQty(p.d.qty) + '</title></circle>';
    }).join("");

    el.innerHTML =
      '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" style="display:block;max-width:100%;height:auto;">' +
        '<defs><linearGradient id="tlGrad" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0%" stop-color="#47b8b4" stop-opacity="0.28"/>' +
          '<stop offset="100%" stop-color="#47b8b4" stop-opacity="0"/>' +
        '</linearGradient></defs>' +
        '<path d="' + area + '" fill="url(#tlGrad)"/>' +
        '<path d="' + path + '" fill="none" stroke="#47b8b4" stroke-width="2"/>' +
        dots +
        '<text x="' + PAD + '" y="' + (H - 6) + '" font-size="9" fill="#94a3b8">' + firstLabel + '</text>' +
        '<text x="' + (W / 2) + '" y="' + (H - 6) + '" font-size="9" fill="#94a3b8" text-anchor="middle">' + midLabel + '</text>' +
        '<text x="' + (W - PAD) + '" y="' + (H - 6) + '" font-size="9" fill="#94a3b8" text-anchor="end">' + lastLabel + '</text>' +
        '<text x="4" y="' + (PAD - 10) + '" font-size="9" fill="#94a3b8">' + fmtQty(max) + '</text>' +
        '<text x="4" y="' + (H - PAD + 4) + '" font-size="9" fill="#94a3b8">' + fmtQty(min) + '</text>' +
      '</svg>';
  }

  // ==================== Main load ====================
  function load() {
    Promise.all([
      typeof fetchProducts === "function" ? fetchProducts() : Promise.resolve([]),
      typeof fetchWarehousesDB === "function" ? fetchWarehousesDB() : Promise.resolve([]),
      typeof fetchInitialStocks === "function" ? fetchInitialStocks() : Promise.resolve([]),
      typeof fetchMovementsDB === "function" ? fetchMovementsDB() : Promise.resolve([]),
      typeof fetchLatestProductCosts === "function" ? fetchLatestProductCosts() : Promise.resolve({}),
      typeof fetchPurchaseOrdersDB === "function" ? fetchPurchaseOrdersDB() : Promise.resolve([]),
      typeof fetchGoodsReceiptsDB === "function" ? fetchGoodsReceiptsDB() : Promise.resolve([]),
      typeof fetchSalesOrdersDB === "function" ? fetchSalesOrdersDB() : Promise.resolve([]),
      typeof fetchCompanyInfoDB === "function" ? fetchCompanyInfoDB() : Promise.resolve(null),
      typeof fetchSuppliersDB === "function" ? fetchSuppliersDB() : Promise.resolve([]),
    ]).then(function (r) {
      var products = r[0] || [];
      var warehouses = r[1] || [];
      var stocks = r[2] || [];
      var movements = r[3] || [];
      var costMap = r[4] || {};
      var pos = r[5] || [];
      var grs = r[6] || [];
      var sos = r[7] || [];
      _dashboardCompany = r[8] || null;
      _dashboardSuppliers = r[9] || [];

      var todayStr = new Date().toISOString().slice(0, 10);
      var cutoff30 = daysAgo(todayStr, 30);
      var cutoff90 = daysAgo(todayStr, 90);

      // ---------- Aggregate stock per product / warehouse ----------
      var stockByProduct = {};
      var stockByWarehouse = {};
      var costFromInitial = {}; // fallback cost

      stocks.forEach(function (s) {
        var pid = s.product_id, wid = s.warehouse_id, q = Number(s.qty) || 0;
        stockByProduct[pid] = (stockByProduct[pid] || 0) + q;
        stockByWarehouse[wid] = (stockByWarehouse[wid] || 0) + q;
        if (costFromInitial[pid] == null && s.cost != null) costFromInitial[pid] = Number(s.cost);
      });
      movements.forEach(function (m) {
        var pid = m.product_id, q = Number(m.qty) || 0;
        if (stockByProduct[pid] == null) stockByProduct[pid] = 0;
        if (m.type === "in") {
          stockByProduct[pid] += q;
          stockByWarehouse[m.warehouse_id] = (stockByWarehouse[m.warehouse_id] || 0) + q;
        } else if (m.type === "out") {
          stockByProduct[pid] -= q;
          stockByWarehouse[m.warehouse_id] = (stockByWarehouse[m.warehouse_id] || 0) - q;
        } else if (m.type === "transfer") {
          stockByWarehouse[m.from_warehouse_id] = (stockByWarehouse[m.from_warehouse_id] || 0) - q;
          stockByWarehouse[m.warehouse_id] = (stockByWarehouse[m.warehouse_id] || 0) + q;
        }
      });

      var totalStock = 0;
      Object.keys(stockByProduct).forEach(function (k) { totalStock += stockByProduct[k]; });

      // ---------- Stock value ----------
      function costOf(pid) {
        if (costMap[pid] != null) return Number(costMap[pid]) || 0;
        if (costFromInitial[pid] != null) return costFromInitial[pid];
        return 0;
      }
      var totalValue = 0;
      products.forEach(function (p) {
        totalValue += (stockByProduct[p.id] || 0) * costOf(p.id);
      });

      // ---------- Sales & movement aggregates (for movers/dead/forecast/ABC) ----------
      var outQty30d = {}, outQty90d = {};
      movements.forEach(function (m) {
        if (m.type !== "out") return;
        var d = m.date || "";
        var q = Number(m.qty) || 0;
        if (d >= cutoff30) outQty30d[m.product_id] = (outQty30d[m.product_id] || 0) + q;
        if (d >= cutoff90) outQty90d[m.product_id] = (outQty90d[m.product_id] || 0) + q;
      });

      var revenue90d = {}; // from sales_orders completed
      sos.forEach(function (so) {
        if (so.status === "cancelled") return;
        if ((so.date || "") < cutoff90) return;
        (so.sales_order_items || []).forEach(function (it) {
          var pid = it.product_id;
          revenue90d[pid] = (revenue90d[pid] || 0) + (Number(it.subtotal) || 0);
        });
      });

      var movedSet30 = {};
      movements.forEach(function (m) {
        if ((m.date || "") >= cutoff30) movedSet30[m.product_id] = true;
      });

      // ==================== Render stat cards ====================
      document.getElementById("statProducts").textContent = products.length;
      document.getElementById("statWarehouses").textContent = warehouses.length;
      document.getElementById("statTotalStock").textContent = fmtQty(totalStock);
      document.getElementById("statStockValue").textContent = fmtMoney(totalValue);

      var outOfStockList = products.filter(function (p) { return (stockByProduct[p.id] || 0) <= 0; });
      document.getElementById("statOutOfStock").textContent = outOfStockList.length;

      // ==================== Low Stock ====================
      var lowStockList = products.map(function (p) {
        var qty = stockByProduct[p.id] || 0;
        var threshold = p.low_stock_threshold != null ? Number(p.low_stock_threshold) : DEFAULT_LOW_STOCK_THRESHOLD;
        return { id: p.id, name: p.name || "—", category: p.categories ? p.categories.name : (p.category || "—"), qty: qty, threshold: threshold };
      }).filter(function (p) { return p.qty > 0 && p.qty <= p.threshold; })
        .sort(function (a, b) { return a.qty - b.qty; });
      document.getElementById("lowStockCount").textContent = lowStockList.length + " items";
      var tb = document.getElementById("lowStockTableBody");
      if (!lowStockList.length) {
        tb.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:30px;color:#94a3b8;font-size:11px;">ไม่มีสินค้าที่สต็อกต่ำ</td></tr>';
      } else {
        tb.innerHTML = lowStockList.slice(0, 10).map(function (p) {
          return "<tr>" +
            "<td>" + p.name + "</td>" +
            "<td>" + p.category + "</td>" +
            "<td><span style=\"color:#f59e0b;font-weight:700;\">" + p.qty + "</span></td>" +
            "<td><span style=\"color:#94a3b8;\">" + p.threshold + "</span></td>" +
          "</tr>";
        }).join("");
      }

      // ==================== Out of Stock ====================
      document.getElementById("outStockCount").textContent = outOfStockList.length + " items";
      var tbOOS = document.getElementById("outStockTableBody");
      if (!outOfStockList.length) {
        tbOOS.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:30px;color:#94a3b8;font-size:11px;">ไม่มีสินค้าหมดสต็อก</td></tr>';
      } else {
        tbOOS.innerHTML = outOfStockList.slice(0, 10).map(function (p) {
          return "<tr>" +
            "<td>" + (p.name || "—") + "</td>" +
            "<td>" + (p.categories ? p.categories.name : "—") + "</td>" +
            "<td><span style=\"font-size:10px;color:#94a3b8;\">" + (p.sku || "—") + "</span></td>" +
          "</tr>";
        }).join("");
      }

      // ==================== Top Movers 30d ====================
      var topMovers = products.map(function (p) {
        return { id: p.id, name: p.name || "—", category: p.categories ? p.categories.name : "—", qty: outQty30d[p.id] || 0 };
      }).filter(function (p) { return p.qty > 0; })
        .sort(function (a, b) { return b.qty - a.qty; })
        .slice(0, 10);
      var tbTM = document.getElementById("topMoversTableBody");
      if (!topMovers.length) {
        tbTM.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:30px;color:#94a3b8;font-size:11px;">ยังไม่มีการเคลื่อนไหวใน 30 วัน</td></tr>';
      } else {
        tbTM.innerHTML = topMovers.map(function (p) {
          return "<tr><td>" + p.name + "</td><td>" + p.category + "</td><td><strong>" + fmtQty(p.qty) + "</strong></td></tr>";
        }).join("");
      }

      // ==================== Dead Stock ====================
      var deadStock = products.filter(function (p) {
        return (stockByProduct[p.id] || 0) > 0 && !movedSet30[p.id];
      }).map(function (p) {
        var qty = stockByProduct[p.id] || 0;
        return { id: p.id, name: p.name || "—", qty: qty, value: qty * costOf(p.id) };
      }).sort(function (a, b) { return b.value - a.value; });
      document.getElementById("deadStockCount").textContent = deadStock.length + " items";
      var tbDS = document.getElementById("deadStockTableBody");
      if (!deadStock.length) {
        tbDS.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:30px;color:#94a3b8;font-size:11px;">ไม่มี dead stock</td></tr>';
      } else {
        tbDS.innerHTML = deadStock.slice(0, 10).map(function (p) {
          return "<tr><td>" + p.name + "</td><td>" + fmtQty(p.qty) + "</td><td>" + fmtMoney(p.value) + "</td></tr>";
        }).join("");
      }

      // ==================== Stock by Warehouse ====================
      renderWarehouseChart(stockByWarehouse, warehouses);

      // ==================== Incoming Stock ====================
      var pendingPOs = pos.filter(function (p) { return p.status === "approved" && !isPOFullyReceived(p, grs); });
      _dashboardPOs = pendingPOs; // expose ให้ viewPODetail ใช้
      document.getElementById("incomingCount").textContent = pendingPOs.length + " POs";
      var tbIN = document.getElementById("incomingTableBody");
      if (!pendingPOs.length) {
        tbIN.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:30px;color:#94a3b8;font-size:11px;">ไม่มี PO รอรับ</td></tr>';
      } else {
        tbIN.innerHTML = pendingPOs.slice(0, 10).map(function (p) {
          var sup = p.suppliers ? p.suppliers.name : "—";
          var items = (p.purchase_order_items || []).length;
          return '<tr onclick="viewPODetail(' + p.id + ')" style="cursor:pointer;" title="คลิกเพื่อดูรายละเอียด">' +
            "<td>" + (p.po_number || "—") + "</td>" +
            "<td>" + sup + "</td>" +
            "<td>" + items + " items</td>" +
            "<td>" + fmtMoney(p.total) + "</td>" +
          "</tr>";
        }).join("");
      }

      // ==================== Stock Timeline (30d) ====================
      // Walk backwards from today, subtracting net inflow each day
      var endTotal = totalStock;
      var movesByDate = {};
      movements.forEach(function (m) {
        var d = m.date || "";
        if (!d) return;
        if (!movesByDate[d]) movesByDate[d] = 0;
        var q = Number(m.qty) || 0;
        if (m.type === "in") movesByDate[d] += q;
        else if (m.type === "out") movesByDate[d] -= q;
        // transfer: no net
      });
      var dailyTotals = [];
      var running = endTotal;
      for (var i = 0; i < 31; i++) {
        var d = daysAgo(todayStr, i);
        dailyTotals.push({ date: d, qty: running });
        if (movesByDate[d]) running -= movesByDate[d]; // ย้อนกลับ: เอา inflow ออก
      }
      dailyTotals.reverse();
      renderTimelineChart(dailyTotals);

      // ==================== Reorder Forecast ====================
      var forecast = products.map(function (p) {
        var stock = stockByProduct[p.id] || 0;
        var sold = outQty30d[p.id] || 0;
        var velocity = sold / 30; // units per day
        var days = velocity > 0 ? Math.floor(stock / velocity) : null;
        return { name: p.name || "—", stock: stock, velocity: velocity, days: days };
      }).filter(function (f) {
        return f.velocity > 0 && f.days != null && f.days <= 60;
      }).sort(function (a, b) { return a.days - b.days; });
      var tbFC = document.getElementById("forecastTableBody");
      if (!forecast.length) {
        tbFC.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:30px;color:#94a3b8;font-size:11px;">ไม่มีสินค้าที่ต้องเติมใน 60 วัน</td></tr>';
      } else {
        tbFC.innerHTML = forecast.slice(0, 10).map(function (f) {
          var urgency = f.days <= 7 ? "#ef4444" : f.days <= 14 ? "#f59e0b" : "#64748b";
          return "<tr>" +
            "<td>" + f.name + "</td>" +
            "<td>" + fmtQty(f.stock) + "</td>" +
            "<td>" + f.velocity.toFixed(1) + "</td>" +
            "<td><strong style=\"color:" + urgency + ";\">" + f.days + " วัน</strong></td>" +
          "</tr>";
        }).join("");
      }

      // ==================== ABC Analysis (90 วันจาก sales) ====================
      var ranked = products.map(function (p) {
        return { id: p.id, name: p.name || "—", rev: revenue90d[p.id] || 0 };
      }).sort(function (a, b) { return b.rev - a.rev; });
      var totalRev = ranked.reduce(function (s, p) { return s + p.rev; }, 0);
      var cumul = 0;
      ranked.forEach(function (p) {
        cumul += p.rev;
        var ratio = totalRev > 0 ? cumul / totalRev : 0;
        if (totalRev === 0 || p.rev === 0) p.class = "C";
        else if (ratio <= 0.8) p.class = "A";
        else if (ratio <= 0.95) p.class = "B";
        else p.class = "C";
      });
      var classRev = { A: 0, B: 0, C: 0 };
      var classCount = { A: 0, B: 0, C: 0 };
      ranked.forEach(function (p) {
        classRev[p.class] += p.rev;
        classCount[p.class] += 1;
      });
      var tbABC = document.getElementById("abcSummaryBody");
      if (totalRev === 0) {
        tbABC.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:30px;color:#94a3b8;font-size:11px;">ยังไม่มีรายได้ใน 90 วัน</td></tr>';
        document.getElementById("abcDetailList").innerHTML = "";
      } else {
        var colorMap = { A: "#10b981", B: "#f59e0b", C: "#94a3b8" };
        var labelMap = { A: "A (ขายดี)", B: "B (ปานกลาง)", C: "C (ขายช้า/ไม่ขาย)" };
        tbABC.innerHTML = ["A", "B", "C"].map(function (k) {
          var pct = totalRev > 0 ? (classRev[k] / totalRev * 100) : 0;
          return "<tr>" +
            "<td><span style=\"display:inline-block;padding:2px 10px;border-radius:9999px;font-size:10px;font-weight:800;color:" + colorMap[k] + ";background:" + colorMap[k] + "22;\">" + labelMap[k] + "</span></td>" +
            "<td>" + classCount[k] + "</td>" +
            "<td>" + fmtMoney(classRev[k]) + "</td>" +
            "<td>" + pct.toFixed(1) + "%</td>" +
          "</tr>";
        }).join("");

        var topA = ranked.filter(function (p) { return p.class === "A"; }).slice(0, 5);
        if (topA.length) {
          document.getElementById("abcDetailList").innerHTML =
            '<div style="margin-top:4px;"><strong style="color:#10b981;">Top A:</strong> ' +
            topA.map(function (p) { return p.name + ' (' + fmtMoney(p.rev) + ')'; }).join(", ") +
            '</div>';
        }
      }

      // ==================== Recent Activity ====================
      var list = document.getElementById("activityList");
      var recentMov = (movements || []).slice(0, 8);
      if (!recentMov.length) {
        list.innerHTML = '<p style="padding:30px;text-align:center;color:#94a3b8;font-size:11px;">ยังไม่มีกิจกรรม</p>';
      } else {
        list.innerHTML = recentMov.map(function (m) {
          var act = movementActivity(m);
          return '<div class="activity-item">' +
            '<div class="activity-dot activity-dot-' + act.color + '"></div>' +
            '<div>' +
              '<p class="activity-text">' + act.text + '</p>' +
              '<p class="activity-time">' + (m.date || "") + '</p>' +
            '</div>' +
          '</div>';
        }).join("");
      }

      if (typeof lucide !== "undefined") lucide.createIcons();
    }).catch(function (err) { console.error(err); });
  }

  document.addEventListener("DOMContentLoaded", load);
})();
