// ============================================================
// activity-log.js — Activity Log (Supabase, read-only view)
// ============================================================

var logs = [];

function updateStats() {
  var todayStr = new Date().toISOString().split("T")[0];
  document.getElementById("statAll").textContent = logs.length;
  document.getElementById("statToday").textContent = logs.filter(function (l) {
    return (l.datetime || "").startsWith(todayStr);
  }).length;
  var uniqueUsers = new Set(logs.map(function (l) { return l.user_name || ""; }));
  document.getElementById("statUsers").textContent = uniqueUsers.size;
}

function actionBadge(action) {
  switch (action) {
    case "create":        return '<span class="badge badge-active">Create</span>';
    case "update":        return '<span class="badge" style="background-color:#eff6ff;color:#3b82f6;">Update</span>';
    case "delete":        return '<span class="badge badge-inactive">Delete</span>';
    case "login":         return '<span class="badge" style="background-color:#ecfdf5;color:#10b981;">Login</span>';
    case "logout":        return '<span class="badge" style="background-color:#fef3c7;color:#f59e0b;">Logout</span>';
    case "cancel_po":     return '<span class="badge" style="background-color:#fff7ed;color:#ea580c;">Cancel PO</span>';
    case "cancel_gr":     return '<span class="badge" style="background-color:#fff7ed;color:#ea580c;">Cancel GR</span>';
    case "cancel_return": return '<span class="badge" style="background-color:#fff7ed;color:#ea580c;">Cancel Return</span>';
    default:              return '<span class="badge">' + action + "</span>";
  }
}

function renderTable(data) {
  updateStats();
  var tbody = document.getElementById("logTableBody");
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;color:#94a3b8;font-size:11px;">ยังไม่มี activity log</td></tr>';
    lucide.createIcons();
    return;
  }
  tbody.innerHTML = data.map(function (l, i) {
    var dt = l.datetime ? new Date(l.datetime).toLocaleString("th-TH") : "—";
    return '<tr>' +
      '<td>' + (i + 1) + '</td>' +
      '<td>' + dt + '</td>' +
      '<td>' + (l.user_name || "—") + '</td>' +
      '<td>' + actionBadge(l.action) + '</td>' +
      '<td>' + (l.module || "—") + '</td>' +
      '<td>' + (l.description || "") + '</td>' +
    '</tr>';
  }).join("");
  lucide.createIcons();
  if (typeof refreshSortableHeaders === "function") refreshSortableHeaders();
}

var currentFilter = "all";
var currentSort = "default";

function getFilteredData() {
  var keyword = document.querySelector(".filter-search-input").value.toLowerCase();
  var data = logs.slice();
  if (currentFilter !== "all") {
    data = data.filter(function (l) {
      if (currentFilter === "cancel") return (l.action || "").indexOf("cancel") === 0;
      return l.action === currentFilter;
    });
  }
  if (keyword) {
    data = data.filter(function (l) {
      return (l.user_name || "").toLowerCase().includes(keyword) ||
             (l.module || "").toLowerCase().includes(keyword) ||
             (l.description || "").toLowerCase().includes(keyword);
    });
  }
  switch (currentSort) {
    case "default":
    case "date-desc":
      data.sort(function (a, b) { return (b.datetime || "").localeCompare(a.datetime || ""); });
      break;
    case "date-asc":
      data.sort(function (a, b) { return (a.datetime || "").localeCompare(b.datetime || ""); });
      break;
  }
  return data;
}

function applyFilters() { renderTable(getFilteredData()); }

function reloadLogs() {
  return (typeof fetchActivityLogDB === "function" ? fetchActivityLogDB() : Promise.resolve([]))
    .then(function (rows) {
      logs = (rows || []).map(function (l) {
        return {
          id: l.id,
          datetime: l.datetime || "",
          user_name: l.user_name || "",
          action: l.action || "other",
          module: l.module || "",
          description: l.description || "",
        };
      });
    });
}

document.addEventListener("DOMContentLoaded", function () {
  document.querySelector(".filter-search-input").addEventListener("input", applyFilters);

  document.querySelectorAll(".filter-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".filter-btn").forEach(function (b) { b.classList.remove("active"); });
      this.classList.add("active");
      currentFilter = this.dataset.action;
      applyFilters();
    });
  });

  document.getElementById("sortSelect").addEventListener("change", function () {
    currentSort = this.value;
    applyFilters();
  });

  reloadLogs()
    .then(function () { applyFilters(); })
    .catch(function (err) { console.error(err); applyFilters(); });
});
