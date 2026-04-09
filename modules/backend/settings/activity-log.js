// ============================================================
// activity-log.js — logic เฉพาะหน้า Activity Log
// ------------------------------------------------------------
// ใช้ร่วมกับ: modal.js, sidebar-menu.js
// ============================================================

// ============ Mock Database ============
const logs = [
  { id: 1,  datetime: "2026-04-08 09:15", user: "สมชาย",    action: "create", module: "Product",   description: "เพิ่มสินค้าใหม่ รองเท้าวิ่ง Nike Air Max" },
  { id: 2,  datetime: "2026-04-08 09:45", user: "วิภา",     action: "update", module: "Category",  description: "แก้ไขหมวดหมู่ เครื่องแต่งกาย เปลี่ยนชื่อเป็น แฟชั่น" },
  { id: 3,  datetime: "2026-04-08 10:30", user: "ประวิทย์",  action: "delete", module: "Product",   description: "ลบสินค้า กระเป๋าสะพายข้าง รุ่นเก่า" },
  { id: 4,  datetime: "2026-04-08 11:00", user: "ธนา",      action: "create", module: "Warehouse", description: "สร้างคลังสินค้าใหม่ สาขาเชียงใหม่" },
  { id: 5,  datetime: "2026-04-08 13:20", user: "สมชาย",    action: "update", module: "Stock",     description: "อัปเดตจำนวนสต็อก รองเท้าวิ่ง เพิ่ม 50 คู่" },
  { id: 6,  datetime: "2026-04-07 08:30", user: "วิภา",     action: "create", module: "User",      description: "เพิ่มผู้ใช้งานใหม่ พิมพ์ใจ ศรีสุข" },
  { id: 7,  datetime: "2026-04-07 10:00", user: "ประวิทย์",  action: "update", module: "Product",   description: "แก้ไขราคาสินค้า เสื้อยืดคอกลม จาก 350 เป็น 299 บาท" },
  { id: 8,  datetime: "2026-04-07 14:30", user: "สมชาย",    action: "delete", module: "Category",  description: "ลบหมวดหมู่ สินค้าทดสอบ" },
  { id: 9,  datetime: "2026-04-07 16:45", user: "ธนา",      action: "update", module: "Warehouse", description: "แก้ไขที่อยู่คลังสินค้า สาขากรุงเทพ" },
  { id: 10, datetime: "2026-04-06 09:00", user: "วิภา",     action: "create", module: "Product",   description: "เพิ่มสินค้าใหม่ หมวกแก๊ป Adidas" },
  { id: 11, datetime: "2026-04-06 11:30", user: "ประวิทย์",  action: "create", module: "Stock",     description: "เพิ่มรายการรับสินค้าเข้าคลัง จำนวน 200 ชิ้น" },
  { id: 12, datetime: "2026-04-06 14:00", user: "สมชาย",    action: "update", module: "User",      description: "แก้ไขสิทธิ์ผู้ใช้ นภา พิมพ์ทอง เป็น Viewer" },
  { id: 13, datetime: "2026-04-05 10:15", user: "ธนา",      action: "delete", module: "Stock",     description: "ลบรายการสต็อกที่ซ้ำกัน รหัส STK-0042" },
  { id: 14, datetime: "2026-04-05 13:00", user: "วิภา",     action: "update", module: "Product",   description: "อัปเดตรูปภาพสินค้า กางเกงขายาว 3 รายการ" },
  { id: 15, datetime: "2026-04-05 15:30", user: "ประวิทย์",  action: "create", module: "Category",  description: "เพิ่มหมวดหมู่ใหม่ อุปกรณ์กีฬา" },
];

// ============ Update Stat Cards ============
function updateStats() {
  document.getElementById("statAll").textContent = logs.length;
  document.getElementById("statToday").textContent = logs.filter((l) => l.datetime.startsWith("2026-04-08")).length;
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
