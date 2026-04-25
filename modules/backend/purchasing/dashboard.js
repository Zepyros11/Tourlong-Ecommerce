// ============================================================
// dashboard.js — Purchasing Dashboard (Supabase)
// ============================================================

(function () {
  function fmtMoney(n) {
    return "฿" + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  function statusBadge(s) {
    if (s === "approved") return '<span class="badge badge-active">Approved</span>';
    if (s === "cancelled") return '<span class="badge badge-inactive">Cancelled</span>';
    return '<span class="badge" style="background-color:#fef3c7;color:#f59e0b;">Pending</span>';
  }

  function isFullyReceived(po, grs) {
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

  function load() {
    Promise.all([
      typeof fetchSuppliersDB === "function" ? fetchSuppliersDB() : Promise.resolve([]),
      typeof fetchPurchaseOrdersDB === "function" ? fetchPurchaseOrdersDB() : Promise.resolve([]),
      typeof fetchGoodsReceiptsDB === "function" ? fetchGoodsReceiptsDB() : Promise.resolve([]),
    ]).then(function (r) {
      var suppliers = r[0] || [];
      var pos = r[1] || [];
      var grs = r[2] || [];

      var activePOs = pos.filter(function (p) { return p.status === "approved"; });
      var pendingReceive = activePOs.filter(function (p) { return !isFullyReceived(p, grs); });
      var totalValue = activePOs.reduce(function (s, p) { return s + Number(p.total || 0); }, 0);

      document.getElementById("statSuppliers").textContent = suppliers.length;
      document.getElementById("statActivePOs").textContent = activePOs.length;
      document.getElementById("statPendingGR").textContent = pendingReceive.length;
      document.getElementById("statTotalValue").textContent = fmtMoney(totalValue);

      // Recent POs (top 5)
      var recent = pos.slice(0, 5);
      var tb1 = document.getElementById("recentPOTableBody");
      if (!recent.length) {
        tb1.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:30px;color:#94a3b8;font-size:11px;">ยังไม่มีใบสั่งซื้อ</td></tr>';
      } else {
        tb1.innerHTML = recent.map(function (p) {
          var sup = p.suppliers ? p.suppliers.name : "—";
          return "<tr>" +
            "<td>" + (p.po_number || "—") + "</td>" +
            "<td>" + sup + "</td>" +
            "<td>" + (p.date || "—") + "</td>" +
            "<td>" + fmtMoney(p.total) + "</td>" +
            "<td>" + statusBadge(p.status) + "</td>" +
          "</tr>";
        }).join("");
      }

      // Pending GR list (approved POs not fully received)
      var tb2 = document.getElementById("pendingGRTableBody");
      if (!pendingReceive.length) {
        tb2.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:30px;color:#94a3b8;font-size:11px;">ไม่มีรายการรอรับของ</td></tr>';
      } else {
        tb2.innerHTML = pendingReceive.slice(0, 5).map(function (p) {
          var sup = p.suppliers ? p.suppliers.name : "—";
          var items = (p.purchase_order_items || []).length;
          return "<tr>" +
            "<td>" + (p.po_number || "—") + "</td>" +
            "<td>" + sup + "</td>" +
            "<td>" + items + " items</td>" +
            "<td>" + (p.date || "—") + "</td>" +
          "</tr>";
        }).join("");
      }

      if (typeof lucide !== "undefined") lucide.createIcons();
    }).catch(function (err) { console.error(err); });
  }

  document.addEventListener("DOMContentLoaded", load);
})();
