// ============================================================
// products-category-list.js — logic เฉพาะหน้า Product Category
// ------------------------------------------------------------
// ใช้ร่วมกับ: modal.js, confirm.js
// ============================================================

// ============ Database (Supabase) ============
let categories = [];
var currentAppMode = "test";

function reloadCategories() {
  return fetchCategories().then(function (rows) {
    categories = (rows || []).map(function (r) {
      return {
        id: r.id,
        name: r.name || "",
        description: r.description || "",
        products: r.products || 0,
        status: r.status || "active",
      };
    });
    return categories;
  });
}

// ============ Update Stat Cards ============
function updateStats() {
  document.getElementById("statAll").textContent = categories.length;
  document.getElementById("statActive").textContent = categories.filter((c) => c.status === "active").length;
  document.getElementById("statInactive").textContent = categories.filter((c) => c.status === "inactive").length;
}

// ============ Render Table ============
function renderTable(data) {
  updateStats();
  const tbody = document.getElementById("categoryTableBody");
  const showDelete = currentAppMode === "test";
  tbody.innerHTML = data
    .map((cat, i) => {
      const isActive = cat.status === "active";
      const statusToggle =
        `<label class="toggle" title="${isActive ? "Active" : "Inactive"}">` +
          `<input type="checkbox" ${isActive ? "checked" : ""} onchange="toggleCategoryStatus(${cat.id}, this.checked)" />` +
          `<span class="toggle-slider"></span>` +
        `</label>`;
      const deleteBtn = showDelete
        ? `<button class="btn-icon-sm btn-danger" onclick="deleteCategory(${cat.id})"><i data-lucide="trash-2"></i></button>`
        : "";
      return `
    <tr>
      <td>${i + 1}</td>
      <td>${cat.name}</td>
      <td>${cat.description}</td>
      <td>${cat.products}</td>
      <td>${statusToggle}</td>
      <td>
        <div class="table-actions">
          <button class="btn-icon-sm" onclick="editCategory(${cat.id})"><i data-lucide="pencil"></i></button>
          ${deleteBtn}
        </div>
      </td>
    </tr>
  `;
    })
    .join("");
  lucide.createIcons();
  if (typeof refreshSortableHeaders === "function") refreshSortableHeaders();
}

// ============ Add / Edit Modal ============
function openCategoryModal(title, cat) {
  document.getElementById("modalTitle").textContent = title;
  document.getElementById("editId").value = cat ? cat.id : "";
  document.getElementById("inputName").value = cat ? cat.name : "";
  document.getElementById("inputDesc").value = cat ? cat.description : "";
  document.getElementById("inputStatus").checked = cat ? cat.status === "active" : true;
  var _lbl = document.getElementById("inputStatusLabel"); if(_lbl) { _lbl.textContent = (cat ? cat.status === "active" : true) ? "Active" : "Inactive"; _lbl.classList.toggle("active-label", cat ? cat.status === "active" : true); }
  openModalById("categoryModal", function () {
    document.getElementById("inputName").focus();
  });
}

function saveCategory() {
  const id = document.getElementById("editId").value;
  const name = document.getElementById("inputName").value.trim();
  const desc = document.getElementById("inputDesc").value.trim();
  const status = document.getElementById("inputStatus").checked ? "active" : "inactive";
  if (!name) return document.getElementById("inputName").focus();

  var payload = { name: name, description: desc, status: status };
  var promise = id
    ? updateCategoryDB(Number(id), payload)
    : createCategoryDB(payload);

  promise
    .then(reloadCategories)
    .then(function () {
      closeModalById("categoryModal");
      applyFilters();
    })
    .catch(function (err) {
      console.error(err);
    });
}

function editCategory(id) {
  const cat = categories.find((c) => c.id === id);
  if (cat) openCategoryModal("Edit Category", cat);
}

function toggleCategoryStatus(id, isActive) {
  const newStatus = isActive ? "active" : "inactive";
  updateCategoryDB(id, { status: newStatus })
    .then(function () { return reloadCategories(); })
    .then(function () { applyFilters(); })
    .catch(function (err) {
      console.error(err);
      if (typeof showToast === "function") showToast("ผิดพลาด", "เปลี่ยนสถานะไม่สำเร็จ", "error");
    });
}

// ============ Delete (ใช้ confirm.js) ============
function deleteCategory(id) {
  const cat = categories.find((c) => c.id === id);
  if (!cat) return;
  showConfirm({
    title: "Confirm Delete",
    message: "ต้องการลบหมวดหมู่ <strong>" + cat.name + "</strong> ใช่ไหม?",
    okText: "Delete",
    okColor: "#ef4444",
    onConfirm: function () {
      deleteCategoryDB(id)
        .then(reloadCategories)
        .then(function () {
          applyFilters();
          showToast("ลบหมวดหมู่สำเร็จ", "success");
        })
        .catch(function (err) {
          console.error(err);
          if (err.message && err.message.includes("foreign key")) {
            showToast("ลบไม่ได้ — มีสินค้าอยู่ในหมวดหมู่นี้ ต้องย้ายสินค้าออกก่อน", "error", 5000);
          } else {
            showToast("ลบไม่สำเร็จ: " + (err.message || "เกิดข้อผิดพลาด"), "error");
          }
        });
    },
  });
}

// ============ Filter & Sort ============
let currentFilter = "all";
let currentSort = "default";

function getFilteredData() {
  const keyword = document.querySelector(".filter-search-input").value.toLowerCase();
  let data = categories;

  // Filter by status
  if (currentFilter !== "all") {
    data = data.filter((c) => c.status === currentFilter);
  }

  // Filter by search
  if (keyword) {
    data = data.filter(
      (c) => c.name.toLowerCase().includes(keyword) || c.description.includes(keyword)
    );
  }

  // Sort
  switch (currentSort) {
    case "name-asc":
      data = [...data].sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "name-desc":
      data = [...data].sort((a, b) => b.name.localeCompare(a.name));
      break;
    case "products-desc":
      data = [...data].sort((a, b) => b.products - a.products);
      break;
    case "products-asc":
      data = [...data].sort((a, b) => a.products - b.products);
      break;
  }

  return data;
}

function applyFilters() {
  renderTable(getFilteredData());
}

// ============ Random fill (dev) ============
if (typeof registerRandomFill === "function") {
  registerRandomFill({
    target: "#categoryModal",
    fill: function () {
      setFieldValue("inputName", randomCategoryName());
      setFieldValue("inputDesc", randomNote());
      var sw = document.getElementById("inputStatus");
      if (sw) { sw.checked = rdBool(0.85); sw.dispatchEvent(new Event("change", { bubbles: true })); }
    },
  });
}

// ============ Init ============
document.addEventListener("DOMContentLoaded", function () {
  // Search
  document.querySelector(".filter-search-input").addEventListener("input", applyFilters);

  // Filter buttons
  document.querySelectorAll(".filter-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
      this.classList.add("active");
      currentFilter = this.dataset.status;
      applyFilters();
    });
  });

  // Sort select
  document.getElementById("sortSelect").addEventListener("change", function () {
    currentSort = this.value;
    applyFilters();
  });

  // Add button
  document.querySelector(".content-header .btn-primary").addEventListener("click", function () {
    openCategoryModal("Add Category", null);
  });

  // Status toggle listener
  var statusToggle = document.getElementById("inputStatus");
  if (statusToggle) {
    statusToggle.addEventListener("change", function() {
      var lbl = document.getElementById("inputStatusLabel");
      if (lbl) { lbl.textContent = this.checked ? "Active" : "Inactive"; lbl.classList.toggle("active-label", this.checked); }
    });
  }

  // โหลดข้อมูลจาก Supabase + app mode
  var modeP = (typeof getAppMode === "function") ? getAppMode() : Promise.resolve("test");
  Promise.all([modeP, reloadCategories()])
    .then(function (results) {
      currentAppMode = results[0] || "test";
      applyFilters();
    })
    .catch(function (err) {
      console.error(err);
      applyFilters();
    });
});
