// ============================================================
// dashboard.js — Sales Dashboard (Supabase)
// ============================================================

(function () {
  function fmtMoney(n) {
    return "฿" + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  function statusBadge(s) {
    if (s === "completed") return '<span class="badge badge-active">Completed</span>';
    if (s === "cancelled") return '<span class="badge badge-inactive">Cancelled</span>';
    return '<span class="badge" style="background-color:#fef3c7;color:#f59e0b;">Processing</span>';
  }

  function load() {
    Promise.all([
      typeof fetchSalesOrdersDB === "function" ? fetchSalesOrdersDB() : Promise.resolve([]),
      typeof fetchSalesReturnsDB === "function" ? fetchSalesReturnsDB() : Promise.resolve([]),
    ]).then(function (r) {
      var sos = r[0] || [];
      var returns = r[1] || [];

      var completed = sos.filter(function (s) { return s.status === "completed"; });
      var processing = sos.filter(function (s) { return s.status === "processing"; });
      var revenue = completed.reduce(function (sum, o) { return sum + Number(o.total || 0); }, 0);

      document.getElementById("statTotalOrders").textContent = sos.length;
      document.getElementById("statRevenue").textContent = fmtMoney(revenue);
      document.getElementById("statPendingOrders").textContent = processing.length;
      document.getElementById("statReturns").textContent = returns.length;

      // Recent Orders (top 5)
      var recent = sos.slice(0, 5);
      var tb1 = document.getElementById("recentSOTableBody");
      if (!recent.length) {
        tb1.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:30px;color:#94a3b8;font-size:11px;">ยังไม่มีคำสั่งซื้อ</td></tr>';
      } else {
        tb1.innerHTML = recent.map(function (o) {
          var cust = o.customers ? o.customers.name : "—";
          return "<tr>" +
            "<td>" + (o.so_number || "—") + "</td>" +
            "<td>" + cust + "</td>" +
            "<td>" + (o.date || "—") + "</td>" +
            "<td>" + fmtMoney(o.total) + "</td>" +
            "<td>" + statusBadge(o.status) + "</td>" +
          "</tr>";
        }).join("");
      }

      // Top Selling Products (aggregate items from completed + processing orders, skip cancelled)
      var map = {};
      sos.forEach(function (o) {
        if (o.status === "cancelled") return;
        (o.sales_order_items || []).forEach(function (it) {
          var key = it.product_id;
          if (!map[key]) {
            map[key] = {
              name: it.products ? it.products.name : "—",
              qty: 0,
              revenue: 0,
            };
          }
          map[key].qty += Number(it.qty) || 0;
          map[key].revenue += Number(it.subtotal) || 0;
        });
      });
      var top = Object.keys(map).map(function (k) { return map[k]; })
        .sort(function (a, b) { return b.qty - a.qty; })
        .slice(0, 5);

      var tb2 = document.getElementById("topProductsTableBody");
      if (!top.length) {
        tb2.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:30px;color:#94a3b8;font-size:11px;">ยังไม่มีข้อมูลการขาย</td></tr>';
      } else {
        tb2.innerHTML = top.map(function (p) {
          return "<tr>" +
            "<td>" + p.name + "</td>" +
            "<td>" + p.qty + "</td>" +
            "<td>" + fmtMoney(p.revenue) + "</td>" +
          "</tr>";
        }).join("");
      }

      if (typeof lucide !== "undefined") lucide.createIcons();
    }).catch(function (err) { console.error(err); });
  }

  document.addEventListener("DOMContentLoaded", load);
})();
