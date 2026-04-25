// ============================================================
// suppliers.js — Suppliers (Supabase)
// ============================================================

var suppliers = [];
var currentAppMode = "test";

// ============ Stats ============
function updateStats() {
  document.getElementById("statAll").textContent = suppliers.length;
  document.getElementById("statActive").textContent = suppliers.filter(function (s) { return s.status === "active"; }).length;
  document.getElementById("statInactive").textContent = suppliers.filter(function (s) { return s.status === "inactive"; }).length;
}

// ============ Render ============
function renderTable(data) {
  updateStats();
  var tbody = document.getElementById("supplierTableBody");
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;color:#94a3b8;font-size:11px;">ยังไม่มีผู้ขาย</td></tr>';
    lucide.createIcons();
    return;
  }
  var showDelete = currentAppMode === "test";
  tbody.innerHTML = data.map(function (s, i) {
    var isActive = s.status === "active";
    var statusToggle =
      '<label class="toggle" title="' + (isActive ? "Active" : "Inactive") + '">' +
        '<input type="checkbox" ' + (isActive ? "checked" : "") + ' onchange="toggleSupplierStatus(' + s.id + ', this.checked)" />' +
        '<span class="toggle-slider"></span>' +
      '</label>';
    var deleteBtn = showDelete
      ? '<button class="btn-icon-sm btn-danger" onclick="deleteSupplier(' + s.id + ')"><i data-lucide="trash-2"></i></button>'
      : '';
    return '<tr>' +
      '<td>' + (i + 1) + '</td>' +
      '<td>' + (s.name || "") + '</td>' +
      '<td>' + (s.contact || "—") + '</td>' +
      '<td>' + (s.phone || "—") + '</td>' +
      '<td>' + (s.email || "—") + '</td>' +
      '<td>' + statusToggle + '</td>' +
      '<td><div class="table-actions">' +
        '<button class="btn-icon-sm" onclick="editSupplier(' + s.id + ')"><i data-lucide="pencil"></i></button>' +
        deleteBtn +
      '</div></td>' +
    '</tr>';
  }).join("");
  lucide.createIcons();
  if (typeof refreshSortableHeaders === "function") refreshSortableHeaders();
}

// ============ Modal ============
function openSupplierModal(title, s) {
  document.getElementById("modalTitle").textContent = title;
  document.getElementById("editId").value = s ? s.id : "";
  document.getElementById("inputName").value = s ? (s.name || "") : "";
  document.getElementById("inputContact").value = s ? (s.contact || "") : "";
  document.getElementById("inputPhone").value = s ? (s.phone || "") : "";
  document.getElementById("inputEmail").value = s ? (s.email || "") : "";
  document.getElementById("inputTaxId").value = s ? (s.tax_id || "") : "";
  document.getElementById("inputAddress").value = s ? (s.address || "") : "";
  var active = s ? s.status === "active" : true;
  document.getElementById("inputStatus").checked = active;
  var lbl = document.getElementById("inputStatusLabel");
  if (lbl) { lbl.textContent = active ? "Active" : "Inactive"; lbl.classList.toggle("active-label", active); }
  openModalById("supplierModal", function () { document.getElementById("inputName").focus(); });
}

function saveSupplier() {
  var id = document.getElementById("editId").value;
  var name = document.getElementById("inputName").value.trim();
  if (!name) return document.getElementById("inputName").focus();

  var payload = {
    name: name,
    contact: document.getElementById("inputContact").value.trim() || null,
    phone: document.getElementById("inputPhone").value.trim() || null,
    email: document.getElementById("inputEmail").value.trim() || null,
    tax_id: document.getElementById("inputTaxId").value.trim() || null,
    address: document.getElementById("inputAddress").value.trim() || null,
    status: document.getElementById("inputStatus").checked ? "active" : "inactive",
  };

  var op = id ? updateSupplierDB(Number(id), payload) : createSupplierDB(payload);
  op.then(function () { return reloadSuppliers(); })
    .then(function () {
      closeModalById("supplierModal");
      applyFilters();
    })
    .catch(function (err) { console.error(err); });
}

function editSupplier(id) {
  var s = suppliers.find(function (x) { return x.id === id; });
  if (s) openSupplierModal("Edit Supplier", s);
}

function toggleSupplierStatus(id, isActive) {
  var newStatus = isActive ? "active" : "inactive";
  updateSupplierDB(id, { status: newStatus })
    .then(function () { return reloadSuppliers(); })
    .then(function () { applyFilters(); })
    .catch(function (err) {
      console.error(err);
      if (typeof showToast === "function") showToast("ผิดพลาด", "เปลี่ยนสถานะไม่สำเร็จ", "error");
    });
}

function deleteSupplier(id) {
  var s = suppliers.find(function (x) { return x.id === id; });
  if (!s) return;
  showConfirm({
    title: "Confirm Delete",
    message: "ต้องการลบผู้ขาย <strong>" + s.name + "</strong> ใช่ไหม?",
    okText: "Delete",
    okColor: "#ef4444",
    onConfirm: function () {
      deleteSupplierDB(id)
        .then(function () { return reloadSuppliers(); })
        .then(function () { applyFilters(); })
        .catch(function (err) { console.error(err); });
    },
  });
}

// ============ Filter & Sort ============
var currentFilter = "all";
var currentSort = "default";

function getFilteredData() {
  var keyword = document.querySelector(".filter-search-input").value.toLowerCase();
  var data = suppliers.slice();

  if (currentFilter !== "all") data = data.filter(function (s) { return s.status === currentFilter; });

  if (keyword) {
    data = data.filter(function (s) {
      return (s.name || "").toLowerCase().includes(keyword) ||
             (s.contact || "").toLowerCase().includes(keyword) ||
             (s.phone || "").toLowerCase().includes(keyword) ||
             (s.email || "").toLowerCase().includes(keyword);
    });
  }

  switch (currentSort) {
    case "name-asc":  data = data.slice().sort(function (a, b) { return (a.name || "").localeCompare(b.name || ""); }); break;
    case "name-desc": data = data.slice().sort(function (a, b) { return (b.name || "").localeCompare(a.name || ""); }); break;
  }
  return data;
}

function applyFilters() { renderTable(getFilteredData()); }

// ============ Load ============
function reloadSuppliers() {
  return (typeof fetchSuppliersDB === "function" ? fetchSuppliersDB() : Promise.resolve([]))
    .then(function (rows) {
      suppliers = (rows || []).map(function (r) {
        return {
          id: r.id,
          name: r.name || "",
          contact: r.contact || "",
          phone: r.phone || "",
          email: r.email || "",
          tax_id: r.tax_id || "",
          address: r.address || "",
          status: r.status || "active",
        };
      });
    });
}

// ============ Random fill (dev) ============
if (typeof registerRandomFill === "function") {
  registerRandomFill({
    target: "#supplierModal",
    fill: function () {
      setFieldValue("inputName", randomCompanyName());
      setFieldValue("inputContact", randomPersonName());
      setFieldValue("inputPhone", randomPhone());
      setFieldValue("inputEmail", randomEmail());
      // Random Thai tax_id 13 digits starting with 0 (corporate prefix)
      var taxId = "010" + String(Math.floor(Math.random() * 10000000000)).padStart(10, "0");
      setFieldValue("inputTaxId", taxId.slice(0, 13));
      setFieldValue("inputAddress", randomAddress());
      var sw = document.getElementById("inputStatus");
      if (sw) { sw.checked = rdBool(0.85); sw.dispatchEvent(new Event("change", { bubbles: true })); }
    },
  });
}

// ============ Init ============
document.addEventListener("DOMContentLoaded", function () {
  document.querySelector(".filter-search-input").addEventListener("input", applyFilters);

  document.querySelectorAll(".filter-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".filter-btn").forEach(function (b) { b.classList.remove("active"); });
      this.classList.add("active");
      currentFilter = this.dataset.status;
      applyFilters();
    });
  });

  document.getElementById("sortSelect").addEventListener("change", function () {
    currentSort = this.value;
    applyFilters();
  });

  document.getElementById("addSupplierBtn").addEventListener("click", function () {
    openSupplierModal("Add Supplier", null);
  });

  var statusToggle = document.getElementById("inputStatus");
  if (statusToggle) {
    statusToggle.addEventListener("change", function () {
      var lbl = document.getElementById("inputStatusLabel");
      if (lbl) { lbl.textContent = this.checked ? "Active" : "Inactive"; lbl.classList.toggle("active-label", this.checked); }
    });
  }

  var modeP = (typeof getAppMode === "function") ? getAppMode() : Promise.resolve("test");
  Promise.all([modeP, reloadSuppliers()])
    .then(function (results) {
      currentAppMode = results[0] || "test";
      applyFilters();
    })
    .catch(function (err) { console.error(err); applyFilters(); });
});
