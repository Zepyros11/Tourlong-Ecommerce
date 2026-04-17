// ============================================================
// activity-log.js — logic เฉพาะหน้า Activity Log
// ------------------------------------------------------------
// ใช้ร่วมกับ: modal.js, sidebar-menu.js
// ============================================================

// ============ Database (อ่านจาก localStorage ผ่าน auth-guard.js) ============
let logs = loadActivity();

function refreshLogs() {
  logs = loadActivity();
}

// ============ Update Stat Cards ============
function updateStats() {
  const todayStr = new Date().toISOString().split("T")[0];
  document.getElementById("statAll").textContent = logs.length;
  document.getElementById("statToday").textContent = logs.filter((l) => l.datetime.startsWith(todayStr)).length;
  const uniqueUsers = new Set(logs.map((l) => l.user));
  document.getElementById("statUsers").textContent = uniqueUsers.size;
}

// ============ Action Badge ============
function actionBadge(action) {
  switch (action) {
    case "create": return '<span class="badge badge-active">Create</span>';
    case "update": return '<span class="badge" style="background-color:#eff6ff;color:#3b82f6;">Update</span>';
    case "delete": return '<span class="badge badge-inactive">Delete</span>';
    default:       return '<span class="badge">' + action + "</span>";
  }
}

// ============ Render Table ============
function renderTable(data) {
  updateStats();
  const tbody = document.getElementById("logTableBody");
  tbody.innerHTML = data
    .map(
      (l, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${l.datetime}</td>
      <td>${l.user}</td>
      <td>${actionBadge(l.action)}</td>
      <td>${l.module}</td>
      <td>${l.description}</td>
    </tr>
  `
    )
    .join("");
  lucide.createIcons();
  if (typeof refreshSortableHeaders === "function") refreshSortableHeaders();
}

// ============ Filter & Sort ============
let currentFilter = "all";
let currentSort = "default";

function getFilteredData() {
  const keyword = document.querySelector(".filter-search-input").value.toLowerCase();
  let data = [...logs];

  if (currentFilter !== "all") {
    data = data.filter((l) => l.action === currentFilter);
  }

  if (keyword) {
    data = data.filter(
      (l) =>
        l.user.toLowerCase().includes(keyword) ||
        l.module.toLowerCase().includes(keyword) ||
        l.description.toLowerCase().includes(keyword)
    );
  }

  switch (currentSort) {
    case "default":
    case "date-desc":
      data.sort((a, b) => b.datetime.localeCompare(a.datetime));
      break;
    case "date-asc":
      data.sort((a, b) => a.datetime.localeCompare(b.datetime));
      break;
  }

  return data;
}

function applyFilters() {
  renderTable(getFilteredData());
}

// ============ Init ============
document.addEventListener("DOMContentLoaded", function () {
  document.querySelector(".filter-search-input").addEventListener("input", applyFilters);

  document.querySelectorAll(".filter-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
      this.classList.add("active");
      currentFilter = this.dataset.action;
      applyFilters();
    });
  });

  document.getElementById("sortSelect").addEventListener("change", function () {
    currentSort = this.value;
    applyFilters();
  });

  renderTable(logs);
});
