// ============================================================
// dashboard.js — Finance Dashboard (Supabase)
// ============================================================

(function () {
  function fmtMoney(n) {
    return "฿" + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  function load() {
    Promise.all([
      typeof fetchPaymentsDB === "function" ? fetchPaymentsDB() : Promise.resolve([]),
      typeof fetchExpensesDB === "function" ? fetchExpensesDB() : Promise.resolve([]),
      typeof fetchBankAccountsDB === "function" ? fetchBankAccountsDB() : Promise.resolve([]),
    ]).then(function (r) {
      var payments = r[0] || [];
      var expenses = r[1] || [];
      var banks = r[2] || [];

      // Income = completed incoming payments
      var income = payments
        .filter(function (p) { return p.direction === "incoming" && p.status === "completed"; })
        .reduce(function (sum, p) { return sum + Number(p.amount || 0); }, 0);

      // Expenses แยก 2 ก้อน: paid (จ่ายแล้ว) + unpaid (ค้างจ่าย)
      var expensesPaid = expenses
        .filter(function (e) { return e.status === "paid"; })
        .reduce(function (sum, e) { return sum + Number(e.amount || 0); }, 0);
      var expensesUnpaid = expenses
        .filter(function (e) { return e.status === "unpaid"; })
        .reduce(function (sum, e) { return sum + Number(e.amount || 0); }, 0);

      // Net = เงินสดคงเหลือตามบัญชี (cash basis) = Income - Paid
      var net = income - expensesPaid;

      document.getElementById("statIncome").textContent = fmtMoney(income);
      document.getElementById("statExpensesPaid").textContent = fmtMoney(expensesPaid);
      document.getElementById("statExpensesUnpaid").textContent = fmtMoney(expensesUnpaid);
      document.getElementById("statNetBalance").textContent = fmtMoney(net);
      document.getElementById("statBankAccounts").textContent = banks.length;

      // Recent Payments — incoming only, top 5
      var recentPay = payments
        .filter(function (p) { return p.direction === "incoming"; })
        .slice(0, 5);
      var tb1 = document.getElementById("recentPaymentsTableBody");
      if (!recentPay.length) {
        tb1.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:30px;color:#94a3b8;font-size:11px;">ยังไม่มีรายการชำระเงิน</td></tr>';
      } else {
        tb1.innerHTML = recentPay.map(function (p) {
          var party = p.customers ? p.customers.name : "—";
          return "<tr>" +
            "<td>" + (p.date || "—") + "</td>" +
            "<td>" + party + "</td>" +
            "<td>" + (p.method || "—") + "</td>" +
            "<td>" + fmtMoney(p.amount) + "</td>" +
          "</tr>";
        }).join("");
      }

      // Recent Expenses — top 5
      var recentExp = (expenses || []).slice(0, 5);
      var tb2 = document.getElementById("recentExpensesTableBody");
      if (!recentExp.length) {
        tb2.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:30px;color:#94a3b8;font-size:11px;">ยังไม่มีรายจ่าย</td></tr>';
      } else {
        tb2.innerHTML = recentExp.map(function (e) {
          return "<tr>" +
            "<td>" + (e.date || "—") + "</td>" +
            "<td>" + (e.description || "—") + "</td>" +
            "<td>" + (e.category || "—") + "</td>" +
            "<td>" + fmtMoney(e.amount) + "</td>" +
          "</tr>";
        }).join("");
      }

      if (typeof lucide !== "undefined") lucide.createIcons();
    }).catch(function (err) { console.error(err); });
  }

  document.addEventListener("DOMContentLoaded", load);
})();
