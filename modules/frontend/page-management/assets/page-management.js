// ============================================================
// page-management.js — Page Builder / Editor Logic
// ------------------------------------------------------------
// หน้าที่: จัดการหน้าเว็บ, Block Editor, Drag & Drop, Preview
// ============================================================

// ===================== State =====================
var currentEditPageId = null;
var selectedBlockId = null;
var draggedBlockType = null;
var draggedCanvasBlockId = null;
var pagesData = []; // โหลดจาก Supabase
var allProducts = []; // โหลดจาก Supabase
var allCategories = []; // โหลดจาก Supabase
var nextBlockId = 100;
var isDirty = false; // track unsaved changes
var autoSaveTimer = null;
var isAutoSaving = false;
var AUTO_SAVE_DELAY = 2000; // 2 seconds after last change

function markDirty() {
  if (!isDirty) {
    isDirty = true;
    var saveBtn = document.getElementById("saveDraftBtn");
    var pubBtn = document.getElementById("publishBtn");
    if (saveBtn) saveBtn.classList.add("unsaved");
    if (pubBtn) pubBtn.classList.add("unsaved");
  }
  // Debounced auto-save
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(function () {
    autoSaveDraft();
  }, AUTO_SAVE_DELAY);
}

function markClean() {
  isDirty = false;
  if (autoSaveTimer) { clearTimeout(autoSaveTimer); autoSaveTimer = null; }
  var saveBtn = document.getElementById("saveDraftBtn");
  var pubBtn = document.getElementById("publishBtn");
  if (saveBtn) saveBtn.classList.remove("unsaved");
  if (pubBtn) pubBtn.classList.remove("unsaved");
  updateAutoSaveStatus("saved");
}

function updateAutoSaveStatus(status) {
  var el = document.getElementById("autoSaveStatus");
  if (!el) return;
  if (status === "saving") {
    el.textContent = "กำลังบันทึก...";
    el.style.color = "#f59e0b";
  } else if (status === "saved") {
    el.textContent = "บันทึกแล้ว";
    el.style.color = "#10b981";
    setTimeout(function () {
      if (el.textContent === "บันทึกแล้ว") el.textContent = "";
    }, 2000);
  } else if (status === "error") {
    el.textContent = "บันทึกไม่สำเร็จ";
    el.style.color = "#ef4444";
  } else {
    el.textContent = "";
  }
}

function autoSaveDraft() {
  if (!isDirty || isAutoSaving) return;
  var page = getCurrentPage();
  if (!page) return;

  isAutoSaving = true;
  updateAutoSaveStatus("saving");

  page.name = document.getElementById("editorPageTitle").value.trim() || page.name;
  var today = new Date().toISOString().split("T")[0];
  page.lastModified = today;

  var bgToSave = Object.assign({}, page.bgSettings || {});
  delete bgToSave._open;

  Promise.all([
    updatePageDB(page.id, { name: page.name, last_modified: today, bg_settings: bgToSave }),
    saveBlocksDB(page.id, page.blocks),
  ]).then(function () {
    updatePageSelector();
    isDirty = false;
    var saveBtn = document.getElementById("saveDraftBtn");
    var pubBtn = document.getElementById("publishBtn");
    if (saveBtn) saveBtn.classList.remove("unsaved");
    if (pubBtn) pubBtn.classList.remove("unsaved");
    updateAutoSaveStatus("saved");
  }).catch(function (err) {
    console.error("Auto-save error:", err);
    updateAutoSaveStatus("error");
  }).then(function () {
    isAutoSaving = false;
  });
}

// ===================== Init =====================
document.addEventListener("DOMContentLoaded", function () {
  renderBlockLibrary();
  bindEvents();
  // โหลดข้อมูลจาก Supabase แล้วเปิด editor
  loadAllPages();
});

/** โหลด pages ทั้งหมดจาก Supabase แล้วเปิดหน้าแรก */
function loadAllPages() {
  // Load products & categories in parallel
  Promise.all([fetchProducts(), fetchCategories()]).then(function (results) {
    allProducts = results[0] || [];
    allCategories = results[1] || [];
  }).catch(function () {
    allProducts = [];
    allCategories = [];
  });

  fetchPages().then(function (pages) {
    // โหลด blocks สำหรับแต่ละ page
    var promises = pages.map(function (page) {
      return fetchBlocks(page.id).then(function (blocks) {
        page.blocks = blocks.map(function (b) {
          return { id: "b" + b.id, dbId: b.id, type: b.type, data: b.data };
        });
        page.lastModified = page.last_modified;
        page.bgSettings = page.bg_settings || {};
        return page;
      });
    });

    return Promise.all(promises);
  }).then(function (pages) {
    pagesData = pages;
    if (pagesData.length > 0) {
      // มี page → เปิด editor
      showEditorView();
      openEditor(pagesData[0].id);
    } else {
      // ไม่มี page → แสดง Welcome Screen
      showWelcomeView();
    }
  }).catch(function (err) {
    console.error("Failed to load pages:", err);
    showToast("Error", "ไม่สามารถโหลดข้อมูลจาก Supabase ได้");
  });
}

function showWelcomeView() {
  document.getElementById("welcomeView").style.display = "block";
  document.getElementById("editorView").style.display = "none";
  var et = document.getElementById("editorTopbarInner");
  if (et) et.style.display = "none";
  updateSidebarPages();
}

function showEditorView() {
  document.getElementById("welcomeView").style.display = "none";
  document.getElementById("editorView").style.display = "";
  document.getElementById("editorView").style.flexDirection = "column";
  var et = document.getElementById("editorTopbarInner");
  if (et) et.style.display = "";
  updateSidebarPages();
}

/** โหลด blocks ใหม่สำหรับ page ที่เปิดอยู่ */
function reloadCurrentPageBlocks() {
  var page = getCurrentPage();
  if (!page) return Promise.resolve();

  return fetchBlocks(page.id).then(function (blocks) {
    page.blocks = blocks.map(function (b) {
      return { id: "b" + b.id, dbId: b.id, type: b.type, data: b.data };
    });
  });
}

// ===================== Block Library =====================
function renderBlockLibrary() {
  var container = document.getElementById("blockLibraryList");
  if (!container || typeof blockTemplates === "undefined") return;

  var html = "";
  var groups = {};

  // Group blocks by category
  blockTemplates.forEach(function (block) {
    if (!groups[block.group]) groups[block.group] = [];
    groups[block.group].push(block);
  });

  Object.keys(groups).forEach(function (groupName) {
    html += '<div class="block-library-group">';
    html += '<div class="block-library-group-title">' + groupName + '</div>';
    html += '<div class="block-library-grid">';
    groups[groupName].forEach(function (block) {
      html += '<div class="block-library-item" draggable="true" data-block-type="' + block.type + '">';
      if (block.preview) {
        html += '<div class="block-library-preview">' + block.preview + '</div>';
      } else {
        html += '<div class="block-library-preview"><div class="block-library-icon ' + block.iconBg + '"><i data-lucide="' + block.icon + '"></i></div></div>';
      }
      html += '<div class="block-library-label">';
      html += '<span class="block-library-name">' + block.name + '</span>';
      if (block.tip) {
        html += '<div class="block-library-tip" title="' + escapeHtml(block.tip) + '">';
        html += '<i data-lucide="info" style="width:10px;height:10px;"></i>';
        html += '<div class="block-library-tip-popup">' + escapeHtml(block.tip) + '</div>';
        html += '</div>';
      }
      html += '</div>';
      html += '</div>';
    });
    html += '</div>';
    html += '</div>';
  });

  container.innerHTML = html;
  if (typeof lucide !== "undefined") lucide.createIcons();

  // Bind drag events on library items
  container.querySelectorAll(".block-library-item").forEach(function (item) {
    item.addEventListener("dragstart", function (e) {
      draggedBlockType = this.dataset.blockType;
      draggedCanvasBlockId = null;
      this.classList.add("dragging");
      e.dataTransfer.effectAllowed = "copy";
    });
    item.addEventListener("dragend", function () {
      this.classList.remove("dragging");
      draggedBlockType = null;
    });
    // Click to add at bottom
    item.addEventListener("click", function () {
      var type = this.dataset.blockType;
      addBlockToCanvas(type);
    });
  });
}

// ===================== Page Background Settings =====================
function renderPageBgSettings() {
  var container = document.getElementById("pageBgSettings");
  if (!container) return;
  var page = getCurrentPage();
  if (!page) { container.innerHTML = ""; return; }

  var bg = page.bgSettings || {};
  var bgColor = bg.color || "#0a0a0a";
  var bgImage = bg.image || "";
  var bgMode = bg.mode || "scroll";
  var bgOverlay = bg.overlay !== undefined ? bg.overlay : 0.5;
  var bgGradient = bg.gradient || "";
  var bgType = bg.type || "color"; // color | image | gradient

  var html = '<div class="page-bg-panel">';
  var isOpen = bg._open !== false;
  html += '<div class="page-bg-panel-header" id="pageBgToggle">';
  html += '<span><i data-lucide="paintbrush" style="width:12px;height:12px;"></i> Page Background</span>';
  html += '<i data-lucide="chevron-down" style="width:12px;height:12px;" class="page-bg-chevron' + (isOpen ? ' open' : '') + '"></i>';
  html += '</div>';

  html += '<div class="page-bg-panel-body" id="pageBgBody" style="' + (isOpen ? '' : 'display:none;') + '">';

  // Type selector
  html += '<div class="page-bg-type-row">';
  html += '<button class="page-bg-type-btn' + (bgType === "color" ? " active" : "") + '" data-bg-type="color"><i data-lucide="palette" style="width:11px;height:11px;"></i> สี</button>';
  html += '<button class="page-bg-type-btn' + (bgType === "image" ? " active" : "") + '" data-bg-type="image"><i data-lucide="image" style="width:11px;height:11px;"></i> ภาพ</button>';
  html += '<button class="page-bg-type-btn' + (bgType === "gradient" ? " active" : "") + '" data-bg-type="gradient"><i data-lucide="blend" style="width:11px;height:11px;"></i> ไล่สี</button>';
  html += '</div>';

  // Color section
  html += '<div class="page-bg-section" id="pageBgColor" style="' + (bgType === "color" ? "" : "display:none;") + '">';
  html += '<label class="settings-label">เลือกสีพื้นหลัง</label>';
  html += '<div class="settings-color-row">';
  html += '<div class="settings-color-swatch" style="background:' + bgColor + ';"><input type="color" id="pageBgColorInput" value="' + bgColor + '" /></div>';
  html += '<input type="text" class="settings-input" style="flex:1;" value="' + bgColor + '" data-color-text="pageBgColorInput" />';
  html += '</div>';
  html += '</div>';

  // Image section
  html += '<div class="page-bg-section" id="pageBgImage" style="' + (bgType === "image" ? "" : "display:none;") + '">';
  if (bgImage) {
    html += '<div class="settings-img-preview" id="pageBgImg-preview"><img src="' + escapeHtml(bgImage) + '" />';
    html += '<button class="settings-img-remove" onclick="clearPageBgImage()" title="Remove">x</button></div>';
  } else {
    html += '<div class="settings-img-dropzone" id="pageBgImg-dropzone">';
    html += '<i data-lucide="upload" style="width:20px;height:20px;margin-bottom:4px;"></i>';
    html += '<span>Drag & drop or click</span></div>';
  }
  html += '<input type="hidden" id="pageBgImgInput" value="' + escapeHtml(bgImage) + '" />';
  html += '<input type="file" id="pageBgImg-file" accept="image/*" style="display:none;" />';

  // Mode selector
  html += '<label class="settings-label" style="margin-top:8px;">Background Mode</label>';
  html += '<select class="settings-select" id="pageBgMode">';
  var modes = [
    { val: "scroll", label: "Scroll ปกติ" },
    { val: "fixed", label: "ยึดกับที่ (Fixed)" },
    { val: "parallax", label: "Parallax" },
    { val: "cover", label: "Cover เต็มจอ" },
  ];
  modes.forEach(function (m) {
    html += '<option value="' + m.val + '"' + (bgMode === m.val ? ' selected' : '') + '>' + m.label + '</option>';
  });
  html += '</select>';

  // Overlay
  html += '<label class="settings-label" style="margin-top:8px;">Overlay ทึบ</label>';
  html += '<div style="display:flex;align-items:center;gap:6px;">';
  html += '<input type="range" id="pageBgOverlay" min="0" max="1" step="0.05" value="' + bgOverlay + '" style="flex:1;" />';
  html += '<span id="pageBgOverlayVal" style="font-size:9px;color:#64748b;min-width:28px;text-align:right;">' + Math.round(bgOverlay * 100) + '%</span>';
  html += '</div>';
  html += '</div>';

  // Gradient section
  html += '<div class="page-bg-section" id="pageBgGradient" style="' + (bgType === "gradient" ? "" : "display:none;") + '">';
  var gColors = (bgGradient || "#0a0a0a,#1e293b").split(",");
  html += '<label class="settings-label">สีที่ 1</label>';
  html += '<div class="settings-color-row" style="margin-bottom:6px;">';
  html += '<div class="settings-color-swatch" style="background:' + gColors[0] + ';"><input type="color" id="pageBgGrad1" value="' + gColors[0] + '" /></div>';
  html += '<input type="text" class="settings-input" style="flex:1;" value="' + gColors[0] + '" data-color-text="pageBgGrad1" />';
  html += '</div>';
  html += '<label class="settings-label">สีที่ 2</label>';
  html += '<div class="settings-color-row">';
  html += '<div class="settings-color-swatch" style="background:' + (gColors[1] || "#1e293b") + ';"><input type="color" id="pageBgGrad2" value="' + (gColors[1] || "#1e293b") + '" /></div>';
  html += '<input type="text" class="settings-input" style="flex:1;" value="' + (gColors[1] || "#1e293b") + '" data-color-text="pageBgGrad2" />';
  html += '</div>';
  html += '<label class="settings-label" style="margin-top:6px;">Direction</label>';
  html += '<select class="settings-select" id="pageBgGradDir">';
  var dirs = [
    { val: "to bottom", label: "↓ บนลงล่าง" },
    { val: "to right", label: "→ ซ้ายไปขวา" },
    { val: "to bottom right", label: "↘ มุมทแยง" },
    { val: "135deg", label: "↘ 135°" },
  ];
  var curDir = bg.gradientDir || "135deg";
  dirs.forEach(function (d) {
    html += '<option value="' + d.val + '"' + (curDir === d.val ? ' selected' : '') + '>' + d.label + '</option>';
  });
  html += '</select>';
  html += '</div>';

  html += '</div></div>';
  container.innerHTML = html;
  if (typeof lucide !== "undefined") lucide.createIcons();
  bindPageBgEvents();
}

function updatePageBgData() {
  markDirty();
  var page = getCurrentPage();
  if (!page) return;
  if (!page.bgSettings) page.bgSettings = {};
  var bg = page.bgSettings;

  var activeBtn = document.querySelector(".page-bg-type-btn.active");
  bg.type = activeBtn ? activeBtn.dataset.bgType : "color";
  bg.color = getVal("pageBgColorInput") || bg.color || "#0a0a0a";
  bg.image = getVal("pageBgImgInput") || "";
  bg.mode = getVal("pageBgMode") || "scroll";
  var overlayEl = document.getElementById("pageBgOverlay");
  bg.overlay = overlayEl ? parseFloat(overlayEl.value) : 0.5;
  bg.gradient = (getVal("pageBgGrad1") || "#0a0a0a") + "," + (getVal("pageBgGrad2") || "#1e293b");
  bg.gradientDir = getVal("pageBgGradDir") || "135deg";

  applyCanvasBg();
}

function applyCanvasBg() {
  var page = getCurrentPage();
  if (!page) return;
  var canvas = document.getElementById("editorCanvas");
  var wrapper = canvas ? canvas.parentElement : null;
  if (!canvas) return;
  var bg = page.bgSettings || {};
  var bgType = bg.type || "color";

  var bgVal = "";
  if (bgType === "color") {
    bgVal = bg.color || "#0a0a0a";
  } else if (bgType === "gradient") {
    var gColors = (bg.gradient || "#0a0a0a,#1e293b").split(",");
    bgVal = "linear-gradient(" + (bg.gradientDir || "135deg") + "," + gColors[0] + "," + (gColors[1] || "#1e293b") + ")";
  } else if (bgType === "image") {
    var mode = bg.mode || "scroll";
    var imgUrl = bg.image || "";
    if (imgUrl) {
      var attachment = mode === "fixed" ? "fixed" : mode === "parallax" ? "fixed" : "scroll";
      bgVal = "url('" + imgUrl + "') center/cover no-repeat " + attachment;
    } else {
      bgVal = bg.color || "#0a0a0a";
    }
  } else {
    bgVal = "#0a0a0a";
  }

  canvas.style.background = bgVal;
  if (wrapper) wrapper.style.background = bgVal;
}

function clearPageBgImage() {
  var page = getCurrentPage();
  if (!page || !page.bgSettings) return;
  page.bgSettings.image = "";
  var hidden = document.getElementById("pageBgImgInput");
  if (hidden) hidden.value = "";
  renderPageBgSettings();
  applyCanvasBg();
}

function bindPageBgEvents() {
  // Toggle panel
  var toggle = document.getElementById("pageBgToggle");
  if (toggle) {
    toggle.addEventListener("click", function () {
      var body = document.getElementById("pageBgBody");
      var chevron = this.querySelector(".page-bg-chevron");
      var page = getCurrentPage();
      if (!page) return;
      if (!page.bgSettings) page.bgSettings = {};
      if (body.style.display === "none") {
        body.style.display = "";
        page.bgSettings._open = true;
        if (chevron) chevron.classList.add("open");
      } else {
        body.style.display = "none";
        page.bgSettings._open = false;
        if (chevron) chevron.classList.remove("open");
      }
    });
  }

  // Type buttons
  document.querySelectorAll(".page-bg-type-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".page-bg-type-btn").forEach(function (b) { b.classList.remove("active"); });
      this.classList.add("active");
      var t = this.dataset.bgType;
      document.getElementById("pageBgColor").style.display = t === "color" ? "" : "none";
      document.getElementById("pageBgImage").style.display = t === "image" ? "" : "none";
      document.getElementById("pageBgGradient").style.display = t === "gradient" ? "" : "none";
      updatePageBgData();
    });
  });

  // Color inputs
  document.querySelectorAll("#pageBgSettings input[type='color'], #pageBgSettings .settings-input, #pageBgSettings select").forEach(function (el) {
    var evt = el.tagName === "SELECT" ? "change" : "input";
    el.addEventListener(evt, function () {
      if (this.type === "color") {
        var txt = document.querySelector('[data-color-text="' + this.id + '"]');
        if (txt) txt.value = this.value;
        var sw = this.closest(".settings-color-swatch");
        if (sw) sw.style.background = this.value;
      }
      if (this.dataset.colorText) {
        var ci = document.getElementById(this.dataset.colorText);
        if (ci) { ci.value = this.value; var sw2 = ci.closest(".settings-color-swatch"); if (sw2) sw2.style.background = this.value; }
      }
      updatePageBgData();
    });
  });

  // Overlay range
  var overlayRange = document.getElementById("pageBgOverlay");
  if (overlayRange) {
    overlayRange.addEventListener("input", function () {
      var label = document.getElementById("pageBgOverlayVal");
      if (label) label.textContent = Math.round(this.value * 100) + "%";
      updatePageBgData();
    });
  }

  // Image dropzone
  var dropzone = document.getElementById("pageBgImg-dropzone");
  var fileInput = document.getElementById("pageBgImg-file");
  if (dropzone && fileInput) {
    dropzone.addEventListener("click", function () { fileInput.click(); });
    dropzone.addEventListener("dragover", function (e) { e.preventDefault(); this.style.borderColor = "#6366f1"; this.style.background = "#eef2ff"; });
    dropzone.addEventListener("dragleave", function () { this.style.borderColor = ""; this.style.background = ""; });
    dropzone.addEventListener("drop", function (e) {
      e.preventDefault(); this.style.borderColor = ""; this.style.background = "";
      var file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) handlePageBgUpload(file);
    });
    fileInput.addEventListener("change", function () {
      if (this.files[0]) handlePageBgUpload(this.files[0]);
    });
  }
}

function handlePageBgUpload(file) {
  var dropzone = document.getElementById("pageBgImg-dropzone");
  if (dropzone) dropzone.innerHTML = '<i data-lucide="loader" style="width:16px;height:16px;animation:spin 1s linear infinite;"></i><span>Uploading...</span>';

  uploadFileToStorage(file, "backgrounds").then(function (url) {
    var hidden = document.getElementById("pageBgImgInput");
    if (hidden) hidden.value = url;
    var page = getCurrentPage();
    if (page) {
      if (!page.bgSettings) page.bgSettings = {};
      page.bgSettings.image = url;
    }
    renderPageBgSettings();
    applyCanvasBg();
  }).catch(function (err) {
    console.error("BG upload error:", err);
    showToast("Upload Failed", "ไม่สามารถอัพโหลดได้");
    if (dropzone) dropzone.innerHTML = '<i data-lucide="upload" style="width:20px;height:20px;margin-bottom:4px;"></i><span>Drag & drop or click</span>';
  });
}

// ===================== Editor =====================
function openEditor(pageId) {
  var page = pagesData.find(function (p) { return p.id === pageId; });
  if (!page) return;

  currentEditPageId = pageId;
  selectedBlockId = null;

  // Set page info
  document.getElementById("editorPageTitle").value = page.name;
  document.getElementById("editorPageSlug").textContent = "/" + page.slug;

  // Update page selector + sidebar
  updatePageSelector();
  updateSidebarPages();

  renderPageBgSettings();
  renderCanvasBlocks();
  applyCanvasBg();
  renderBlockSettings();
}

// ===================== Page Selector =====================
function updatePageSelector() {
  var page = getCurrentPage();
  if (!page) return;
  // Update sidebar pages
  updateSidebarPages();
}

function getCurrentPage() {
  return pagesData.find(function (p) { return p.id === currentEditPageId; });
}

// ===================== Canvas Rendering =====================
function renderCanvasBlocks() {
  var page = getCurrentPage();
  if (!page) return;

  var container = document.getElementById("canvasBlocks");
  var empty = document.getElementById("canvasEmpty");

  if (page.blocks.length === 0) {
    empty.style.display = "flex";
    container.innerHTML = "";
    return;
  }

  empty.style.display = "none";
  var html = "";

  page.blocks.forEach(function (block, idx) {
    var isSelected = block.id === selectedBlockId;
    var template = getBlockTemplate(block.type);
    var preview = generateBlockPreview(block);

    html += '<div class="canvas-block' + (isSelected ? ' selected' : '') + '" ' +
      'data-block-id="' + block.id + '" ' +
      'data-block-index="' + idx + '" ' +
      'draggable="true">';

    // Block type badge
    html += '<span class="block-type-badge">' + (template ? template.name : block.type) + '</span>';

    // Toolbar
    html += '<div class="block-toolbar">';
    html += '<span class="block-toolbar-label">' + (template ? template.name : block.type) + '</span>';
    html += '<div class="block-toolbar-divider"></div>';
    if (idx > 0) {
      html += '<button class="block-toolbar-btn" onclick="moveBlock(\'' + block.id + '\', -1)" title="Move Up"><i data-lucide="chevron-up"></i></button>';
    }
    if (idx < page.blocks.length - 1) {
      html += '<button class="block-toolbar-btn" onclick="moveBlock(\'' + block.id + '\', 1)" title="Move Down"><i data-lucide="chevron-down"></i></button>';
    }
    html += '<button class="block-toolbar-btn" onclick="duplicateBlock(\'' + block.id + '\')" title="Duplicate"><i data-lucide="copy"></i></button>';
    html += '<div class="block-toolbar-divider"></div>';
    html += '<button class="block-toolbar-btn danger" onclick="removeBlock(\'' + block.id + '\')" title="Remove"><i data-lucide="trash-2"></i></button>';
    html += '</div>';

    // Content preview
    html += '<div class="block-content">' + preview + '</div>';
    html += '</div>';

    // Add block between button
    html += '<div class="add-block-between">';
    html += '<button class="add-block-between-btn" onclick="showAddBlockAt(' + (idx + 1) + ')" title="Add block here"><i data-lucide="plus"></i></button>';
    html += '</div>';
  });

  container.innerHTML = html;
  if (typeof lucide !== "undefined") lucide.createIcons();

  // Bind canvas block events
  bindCanvasBlockEvents();
}

function bindCanvasBlockEvents() {
  var blocks = document.querySelectorAll("#canvasBlocks .canvas-block");
  blocks.forEach(function (block) {
    // Click to select
    block.addEventListener("click", function (e) {
      if (e.target.closest(".block-toolbar-btn")) return;
      var blockId = this.dataset.blockId;
      selectBlock(blockId);
    });

    // Drag from canvas (reorder)
    block.addEventListener("dragstart", function (e) {
      draggedCanvasBlockId = this.dataset.blockId;
      draggedBlockType = null;
      this.style.opacity = "0.4";
      e.dataTransfer.effectAllowed = "move";
    });

    block.addEventListener("dragend", function () {
      this.style.opacity = "1";
      draggedCanvasBlockId = null;
      document.querySelectorAll(".canvas-block.drag-over").forEach(function (el) {
        el.classList.remove("drag-over");
      });
    });

    block.addEventListener("dragover", function (e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = (draggedBlockType ? "copy" : "move");
      this.classList.add("drag-over");
    });

    block.addEventListener("dragleave", function () {
      this.classList.remove("drag-over");
    });

    block.addEventListener("drop", function (e) {
      e.preventDefault();
      this.classList.remove("drag-over");
      var targetIndex = parseInt(this.dataset.blockIndex);

      if (draggedBlockType) {
        // Drop new block from library
        addBlockToCanvas(draggedBlockType, targetIndex);
        draggedBlockType = null;
      } else if (draggedCanvasBlockId) {
        // Reorder existing block
        reorderBlock(draggedCanvasBlockId, targetIndex);
        draggedCanvasBlockId = null;
      }
    });
  });

  // Allow drop on empty canvas
  var canvas = document.getElementById("editorCanvas");
  canvas.addEventListener("dragover", function (e) { e.preventDefault(); });
  canvas.addEventListener("drop", function (e) {
    e.preventDefault();
    if (draggedBlockType) {
      addBlockToCanvas(draggedBlockType);
      draggedBlockType = null;
    }
  });
}

// ===================== Block Operations =====================
function addBlockToCanvas(type, atIndex) {
  markDirty();
  var page = getCurrentPage();
  if (!page) return;

  var template = getBlockTemplate(type);
  if (!template) return;

  var newBlock = {
    id: "b" + (nextBlockId++),
    type: type,
    data: JSON.parse(JSON.stringify(template.defaultData)),
  };

  if (typeof atIndex === "number" && atIndex >= 0) {
    page.blocks.splice(atIndex, 0, newBlock);
  } else {
    page.blocks.push(newBlock);
  }

  selectedBlockId = newBlock.id;
  renderCanvasBlocks();
  renderBlockSettings();
}

function removeBlock(blockId) {
  markDirty();
  var page = getCurrentPage();
  if (!page) return;

  page.blocks = page.blocks.filter(function (b) { return b.id !== blockId; });

  if (selectedBlockId === blockId) {
    selectedBlockId = null;
  }

  renderCanvasBlocks();
  renderBlockSettings();
}

function moveBlock(blockId, direction) {
  markDirty();
  var page = getCurrentPage();
  if (!page) return;

  var idx = page.blocks.findIndex(function (b) { return b.id === blockId; });
  if (idx === -1) return;

  var newIdx = idx + direction;
  if (newIdx < 0 || newIdx >= page.blocks.length) return;

  var temp = page.blocks[idx];
  page.blocks[idx] = page.blocks[newIdx];
  page.blocks[newIdx] = temp;

  renderCanvasBlocks();
}

function duplicateBlock(blockId) {
  var page = getCurrentPage();
  if (!page) return;

  var idx = page.blocks.findIndex(function (b) { return b.id === blockId; });
  if (idx === -1) return;

  var original = page.blocks[idx];
  var copy = {
    id: "b" + (nextBlockId++),
    type: original.type,
    data: JSON.parse(JSON.stringify(original.data)),
  };

  page.blocks.splice(idx + 1, 0, copy);
  selectedBlockId = copy.id;
  renderCanvasBlocks();
  renderBlockSettings();
}

function reorderBlock(blockId, targetIndex) {
  var page = getCurrentPage();
  if (!page) return;

  var currentIdx = page.blocks.findIndex(function (b) { return b.id === blockId; });
  if (currentIdx === -1 || currentIdx === targetIndex) return;

  var block = page.blocks.splice(currentIdx, 1)[0];
  if (targetIndex > currentIdx) targetIndex--;
  page.blocks.splice(targetIndex, 0, block);

  renderCanvasBlocks();
}

function selectBlock(blockId) {
  selectedBlockId = blockId;

  // Update visual selection
  document.querySelectorAll(".canvas-block").forEach(function (el) {
    el.classList.toggle("selected", el.dataset.blockId === blockId);
  });

  renderBlockSettings();
}

function showAddBlockAt(index) {
  // Quick-add: show a simple dropdown or just add a text block
  addBlockToCanvas("text", index);
}

// ===================== Block Settings Panel =====================
function renderBlockSettings() {
  var container = document.getElementById("blockSettingsContent");
  if (!container) return;

  if (!selectedBlockId) {
    container.innerHTML = '<div class="settings-empty">' +
      '<i data-lucide="mouse-pointer" class="settings-empty-icon"></i>' +
      '<p>Select a block to edit settings</p>' +
      '</div>';
    if (typeof lucide !== "undefined") lucide.createIcons();
    return;
  }

  var page = getCurrentPage();
  if (!page) return;

  var block = page.blocks.find(function (b) { return b.id === selectedBlockId; });
  if (!block) return;

  var template = getBlockTemplate(block.type);
  var html = '';

  // Block type header
  html += '<div class="settings-block-header">';
  html += '<div style="display:flex;align-items:center;gap:8px;">';
  if (template) {
    html += '<div class="block-library-icon ' + template.iconBg + '" style="width:28px;height:28px;border-radius:8px;">';
    html += '<i data-lucide="' + template.icon + '" style="width:14px;height:14px;"></i>';
    html += '</div>';
  }
  html += '<span style="font-size:12px;font-weight:800;color:#1e293b;">' + (template ? template.name : block.type) + '</span>';
  html += '</div>';
  html += '</div>';

  // Generate settings fields based on block type
  html += generateSettingsFields(block);

  container.innerHTML = html;
  if (typeof lucide !== "undefined") lucide.createIcons();

  // Bind settings input events
  bindSettingsEvents(block);
}

function generateSettingsFields(block) {
  var html = '';
  var data = block.data;

  switch (block.type) {
    case "hero":
      html += settingsSection("Background", [
        settingsColorField("Background", "setting-bgColor", data.bgColor || "#0a0a0a"),
        settingsSelectField("Text Align", "setting-textAlign", data.textAlign || "center", ["left", "center", "right"]),
      ]);
      html += settingsSection("Title", [
        settingsField("Title", "text", "setting-title", data.title || ""),
        settingsColorField("Title Color", "setting-fontColor", data.fontColor || "#ffffff"),
      ]);
      html += settingsSection("Subtitle", [
        settingsField("Subtitle", "textarea", "setting-subtitle", data.subtitle || ""),
        settingsColorField("Subtitle Color", "setting-subColor", data.subColor || "#ffffff"),
      ]);
      html += settingsSection("Button", [
        settingsField("Button Text", "text", "setting-buttonText", data.buttonText || ""),
        settingsPageLinkField("Button Link", "setting-buttonLink", data.buttonLink || "#"),
        settingsColorField("Button Color", "setting-btnColor", data.btnColor || "#ef4444"),
        settingsColorField("Button Font", "setting-btnFontColor", data.btnFontColor || "#ffffff"),
      ]);
      break;

    case "text":
      html += settingsSection("Image (optional)", [
        settingsImageUpload("Upload Image", "setting-image", data.image || ""),
        settingsSelectField("ตำแหน่งภาพ", "setting-imagePos", data.imagePos || "none", [
          { value: "none", label: "ไม่แสดงภาพ" },
          { value: "top", label: "ภาพด้านบน" },
          { value: "left", label: "ภาพซ้าย" },
          { value: "right", label: "ภาพขวา" },
        ]),
      ]);
      html += settingsSection("Heading", [
        settingsField("Heading", "text", "setting-heading", data.heading || ""),
        settingsColorField("Heading Color", "setting-fontColor", data.fontColor || "#ffffff"),
        settingsSelectField("Heading Size", "setting-headingSize", data.headingSize || "medium", ["small", "medium", "large"]),
      ]);
      html += settingsSection("Content", [
        settingsField("Content", "textarea", "setting-content", data.content || ""),
        settingsColorField("Content Color", "setting-contentColor", data.contentColor || "#ffffff"),
        settingsSelectField("Text Align", "setting-textAlign", data.textAlign || "left", ["left", "center", "right"]),
      ]);
      var btn1Fields = [
        '<div class="settings-field"><label class="settings-label" style="display:flex;align-items:center;gap:6px;cursor:pointer;"><input type="checkbox" id="setting-btn1Show"' + (data.btn1Show ? ' checked' : '') + ' style="width:14px;height:14px;" /> แสดงปุ่ม 1</label></div>',
        settingsField("Text", "text", "setting-btn1Text", data.btn1Text || "Learn More"),
        settingsField("Link URL", "text", "setting-btn1Link", data.btn1Link || "#"),
        settingsColorField("Button Color", "setting-btn1Color", data.btn1Color || "#ef4444"),
        settingsColorField("Font Color", "setting-btn1FontColor", data.btn1FontColor || "#ffffff"),
      ];
      html += settingsSection("Button 1", btn1Fields);
      var btn2Fields = [
        '<div class="settings-field"><label class="settings-label" style="display:flex;align-items:center;gap:6px;cursor:pointer;"><input type="checkbox" id="setting-btn2Show"' + (data.btn2Show ? ' checked' : '') + ' style="width:14px;height:14px;" /> แสดงปุ่ม 2</label></div>',
        settingsField("Text", "text", "setting-btn2Text", data.btn2Text || "Contact"),
        settingsField("Link URL", "text", "setting-btn2Link", data.btn2Link || "#"),
        settingsColorField("Button Color", "setting-btn2Color", data.btn2Color || "#222222"),
        settingsColorField("Font Color", "setting-btn2FontColor", data.btn2FontColor || "#ffffff"),
      ];
      html += settingsSection("Button 2", btn2Fields);
      break;

    case "image":
      html += settingsSection("Image", [
        settingsImageUpload("Upload Image", "setting-src", data.src || ""),
        settingsField("Alt Text", "text", "setting-alt", data.alt || ""),
      ]);
      html += settingsSection("Style", [
        settingsColorFieldWithTransparent("Background", "setting-bgColor", data.bgColor || "transparent"),
        settingsSelectField("Size", "setting-size", data.size || "full", ["small", "medium", "full"]),
        settingsSelectField("Alignment", "setting-align", data.align || "center", ["left", "center", "right"]),
        settingsField("Border Radius (px)", "text", "setting-borderRadius", data.borderRadius || "10"),
      ]);
      break;

    case "imagetext":
      html += settingsSection("Image", [
        settingsImageUpload("Upload Image", "setting-image", data.image || ""),
        settingsField("Image Radius (px)", "text", "setting-imgRadius", String(data.imgRadius || 16)),
        settingsField("Image Height (px)", "text", "setting-imgHeight", String(data.imgHeight || 300)),
      ]);
      html += settingsSection("Layout", [
        settingsSelectField("ตำแหน่งเนื้อหา", "setting-layout", data.layout || "image-left", [
          { value: "image-left", label: "ภาพซ้าย / เนื้อหาขวา" },
          { value: "image-right", label: "ภาพขวา / เนื้อหาซ้าย" },
          { value: "image-top", label: "ภาพบน / เนื้อหาล่าง (กลาง)" },
        ]),
      ]);
      html += settingsSection("Text", [
        settingsField("Title", "text", "setting-title", data.title || ""),
        settingsField("Content", "textarea", "setting-content", data.content || ""),
      ]);
      html += settingsSection("Colors", [
        settingsColorField("Title Color", "setting-titleColor", data.titleColor || "#ffffff"),
        settingsColorField("Content Color", "setting-contentColor", data.contentColor || "#94a3b8"),
        settingsColorFieldWithTransparent("Background", "setting-bgColor", data.bgColor || "transparent"),
      ]);
      html += settingsSection("Button 1", [
        '<div class="settings-field"><label class="settings-label" style="display:flex;align-items:center;gap:6px;cursor:pointer;"><input type="checkbox" id="setting-btn1Show"' + (data.btn1Show ? ' checked' : '') + ' style="width:14px;height:14px;" /> แสดงปุ่ม 1</label></div>',
        settingsField("Text", "text", "setting-btn1Text", data.btn1Text || "Learn More"),
        settingsPageLinkField("Link", "setting-btn1Link", data.btn1Link || "#"),
        settingsColorField("Button Color", "setting-btn1Color", data.btn1Color || "#ef4444"),
        settingsColorField("Font Color", "setting-btn1FontColor", data.btn1FontColor || "#ffffff"),
      ]);
      html += settingsSection("Button 2", [
        '<div class="settings-field"><label class="settings-label" style="display:flex;align-items:center;gap:6px;cursor:pointer;"><input type="checkbox" id="setting-btn2Show"' + (data.btn2Show ? ' checked' : '') + ' style="width:14px;height:14px;" /> แสดงปุ่ม 2</label></div>',
        settingsField("Text", "text", "setting-btn2Text", data.btn2Text || "Contact"),
        settingsPageLinkField("Link", "setting-btn2Link", data.btn2Link || "#"),
        settingsColorField("Button Color", "setting-btn2Color", data.btn2Color || "#222222"),
        settingsColorField("Font Color", "setting-btn2FontColor", data.btn2FontColor || "#ffffff"),
      ]);
      break;

    case "products":
      var prodMode = data.mode || "auto";
      html += settingsSection("Section Title", [
        settingsField("Title", "text", "setting-title", data.title || ""),
        settingsColorField("Title Color", "setting-titleColor", data.titleColor || "#14b8a6"),
      ]);
      html += settingsSection("Layout", [
        settingsSelectField("Columns", "setting-columns", String(data.columns || 3), ["2", "3", "4"]),
      ]);

      // Mode toggle: auto vs manual
      html += '<div class="settings-section">';
      html += '<div class="settings-section-title">Product Source</div>';
      html += '<div class="page-bg-type-row">';
      html += '<button class="page-bg-type-btn' + (prodMode === "auto" ? " active" : "") + '" data-prod-mode="auto"><i data-lucide="zap" style="width:11px;height:11px;"></i> อัตโนมัติ</button>';
      html += '<button class="page-bg-type-btn' + (prodMode === "manual" ? " active" : "") + '" data-prod-mode="manual"><i data-lucide="hand" style="width:11px;height:11px;"></i> เลือกเอง</button>';
      html += '</div>';

      // Auto mode: category filter + limit
      html += '<div id="prodAutoSection" style="' + (prodMode === "auto" ? "" : "display:none;") + 'margin-top:8px;">';
      html += '<label class="settings-label">Category</label>';
      html += '<select class="settings-select" id="setting-category">';
      html += '<option value="">-- ทั้งหมด --</option>';
      allCategories.forEach(function (cat) {
        html += '<option value="' + cat.id + '"' + (String(data.categoryId) === String(cat.id) ? ' selected' : '') + '>' + escapeHtml(cat.name) + '</option>';
      });
      html += '</select>';
      html += '<label class="settings-label" style="margin-top:6px;">Max Products</label>';
      html += '<input type="text" class="settings-input" id="setting-limit" value="' + (data.limit || 6) + '" />';
      html += '</div>';

      // Manual mode: product checkboxes
      html += '<div id="prodManualSection" style="' + (prodMode === "manual" ? "" : "display:none;") + 'margin-top:8px;">';
      html += '<label class="settings-label">เลือกสินค้า</label>';
      html += '<div class="product-picker-list">';
      var selectedIds = data.selectedProducts || [];
      allProducts.forEach(function (p) {
        var catName = p.categories ? p.categories.name : "";
        var isChecked = selectedIds.indexOf(p.id) !== -1;
        html += '<label class="product-picker-item' + (isChecked ? ' checked' : '') + '">';
        html += '<input type="checkbox" value="' + p.id + '"' + (isChecked ? ' checked' : '') + ' />';
        html += '<span class="product-picker-name">' + escapeHtml(p.name) + '</span>';
        html += '<span class="product-picker-price">฿' + p.price + '</span>';
        html += '</label>';
      });
      html += '</div>';
      html += '</div>';
      html += '</div>';

      // Card style
      html += settingsSection("Card Style", [
        settingsColorField("Card BG", "setting-cardBg", data.cardBg || "#111111"),
        settingsColorField("Price Color", "setting-priceColor", data.priceColor || "#ef4444"),
        settingsField("Card Radius (px)", "text", "setting-cardRadius", String(data.cardRadius || 16)),
        settingsField("Image Height (px)", "text", "setting-imgHeight", String(data.imgHeight || 120)),
      ]);

      // Button
      html += settingsSection("Button", [
        settingsSelectField("Show Button", "setting-showBtn", data.showBtn || "false", ["true", "false"]),
        settingsField("Button Text", "text", "setting-btnText", data.btnText || "Add to Cart"),
        settingsColorField("Button Color", "setting-btnColor", data.btnColor || "#14b8a6"),
      ]);
      break;

    case "features":
      // Migrate old items format to new
      if (data.items && typeof data.items[0] === "string") {
        data.features = data.items.map(function (name, i) {
          var icons = ["shield-check", "sparkles", "truck", "star"];
          return { name: name, desc: "", icon: icons[i] || "check" };
        });
        delete data.items;
      }
      var feats = data.features || [
        { name: "Quality", desc: "คุณภาพเกรดพรีเมียม", icon: "shield-check" },
        { name: "Fresh", desc: "สดใหม่ทุกวัน", icon: "sparkles" },
        { name: "Fast Delivery", desc: "จัดส่ง 1-2 วัน", icon: "truck" },
        { name: "5-Star Reviews", desc: "รีวิว 5 ดาว", icon: "star" },
      ];

      html += settingsSection("Title", [
        settingsField("Section Title", "text", "setting-title", data.title || ""),
        settingsColorField("Title Color", "setting-titleColor", data.titleColor || "#ffffff"),
      ]);
      html += settingsSection("Style", [
        settingsColorField("Card BG", "setting-cardBg", data.cardBg || "#111111"),
        settingsColorField("Icon Color", "setting-iconColor", data.iconColor || "#14b8a6"),
        settingsColorField("Text Color", "setting-textColor", data.textColor || "#ffffff"),
        settingsSelectField("Columns", "setting-columns", String(data.columns || 4), ["2", "3", "4"]),
      ]);
      for (var fi = 0; fi < feats.length; fi++) {
        var iconOptions = ["shield-check", "sparkles", "truck", "star", "heart", "zap", "award", "check-circle", "thumbs-up", "clock", "gift", "leaf", "flame", "gem", "crown"];
        html += settingsSection("Item " + (fi + 1), [
          settingsField("Name", "text", "setting-feat-name-" + fi, feats[fi].name || ""),
          settingsField("Description", "text", "setting-feat-desc-" + fi, feats[fi].desc || ""),
          settingsSelectField("Icon", "setting-feat-icon-" + fi, feats[fi].icon || "check", iconOptions),
        ]);
      }
      html += '<div class="settings-section"><button class="btn-outline btn-sm" style="width:100%;justify-content:center;" onclick="addFeatureItem()"><i data-lucide="plus" style="width:10px;height:10px;"></i> เพิ่มจุดเด่น</button></div>';
      break;

    case "contact":
      html += settingsSection("Title", [
        settingsField("Section Title", "text", "setting-title", data.title || ""),
        settingsColorField("Title Color", "setting-titleColor", data.titleColor || "#ffffff"),
      ]);
      html += settingsSection("Contact Info", [
        settingsField("Phone", "text", "setting-phone", data.phone || ""),
        settingsField("Line ID", "text", "setting-line", data.line || ""),
        settingsField("Email", "text", "setting-email", data.email || ""),
        settingsField("Address", "textarea", "setting-address", data.address || ""),
        settingsField("Website", "text", "setting-website", data.website || ""),
        settingsField("Facebook", "text", "setting-facebook", data.facebook || ""),
      ]);
      html += settingsSection("Style", [
        settingsSelectField("Layout", "setting-layout", data.layout || "vertical", ["vertical", "horizontal"]),
        settingsColorField("Card BG", "setting-cardBg", data.cardBg || "#111111"),
        settingsColorField("Icon Color", "setting-iconColor", data.iconColor || "#14b8a6"),
        settingsColorField("Text Color", "setting-textColor", data.textColor || "#ffffff"),
      ]);
      break;

    case "cta":
      html += settingsSection("Background", [
        settingsColorField("Background", "setting-bgColor", data.bgColor || "#0f172a"),
      ]);
      html += settingsSection("Heading", [
        settingsField("Heading", "text", "setting-heading", data.heading || ""),
        settingsColorField("Heading Color", "setting-fontColor", data.fontColor || "#ffffff"),
      ]);
      html += settingsSection("Description", [
        settingsField("Description", "textarea", "setting-description", data.description || ""),
        settingsColorField("Desc Color", "setting-descColor", data.descColor || "#ffffff"),
      ]);
      html += settingsSection("Button", [
        settingsField("Button Text", "text", "setting-buttonText", data.buttonText || ""),
        settingsPageLinkField("Button Link", "setting-buttonLink", data.buttonLink || "#"),
        settingsColorField("Button Color", "setting-btnColor", data.btnColor || "#14b8a6"),
        settingsColorField("Button Font", "setting-btnFontColor", data.btnFontColor || "#ffffff"),
      ]);
      break;

    case "header":
      html += settingsSection("Logo", [
        settingsImageUpload("Logo Image", "setting-logoImage", data.logoImage || ""),
        settingsField("Logo Text", "text", "setting-logoText", data.logoText || ""),
        settingsSelectField("Logo Size", "setting-logoSize", data.logoSize || "medium", ["small", "medium", "large", "xlarge"]),
      ]);
      html += settingsSection("Style", [
        settingsColorField("Background", "setting-bgColor", data.bgColor || "#0a0a0a"),
        settingsColorField("Font Color", "setting-fontColor", data.fontColor || "#ffffff"),
      ]);
      html += '<div class="settings-section">';
      html += '<div class="settings-section-title">Navigation (max 10)</div>';
      html += '<div class="nav-slots-list" id="navSlotsList">';
      var slots = data.navSlots || [];
      for (var ns = 0; ns < 10; ns++) {
        var slot = slots[ns] || { name: "", slug: "" };
        var hasValue = slot.name && slot.name.trim();
        html += '<div class="nav-slot-row' + (hasValue ? ' active' : '') + '" data-slot-index="' + ns + '" draggable="true">';
        html += '<span class="nav-slot-handle" title="Drag to reorder">&#9776;</span>';
        html += '<span class="nav-slot-number">' + (ns + 1) + '</span>';
        html += '<input type="text" class="nav-slot-input" data-slot="' + ns + '" placeholder="Menu name..." value="' + escapeHtml(slot.name || "") + '" />';
        html += '<select class="nav-slot-page" data-slot="' + ns + '">';
        html += '<option value="">-- Link to --</option>';
        pagesData.forEach(function (p) {
          html += '<option value="' + p.slug + '"' + (slot.slug === p.slug ? ' selected' : '') + '>' + p.name + '</option>';
        });
        html += '</select>';
        html += '<span class="nav-slot-status">' + (hasValue ? '&#9679;' : '') + '</span>';
        html += '</div>';
      }
      html += '</div>';
      html += '</div>';
      break;

    case "footer":
      html += settingsSection("Content", [
        settingsField("Footer Text", "text", "setting-text", data.text || ""),
      ]);
      html += settingsSection("Style", [
        settingsColorField("Background", "setting-bgColor", data.bgColor || "#0a0a0a"),
        settingsColorField("Font Color", "setting-fontColor", data.fontColor || "#ffffff"),
      ]);
      break;

    case "spacer":
      html += settingsSection("Style", [
        '<div class="settings-field">' +
          '<label class="settings-label">Height (px)</label>' +
          '<div style="display:flex;align-items:center;gap:8px;">' +
          '<input type="range" id="setting-height-range" min="0" max="1000" step="1" value="' + (data.height || 40) + '" style="flex:1;accent-color:#6366f1;" />' +
          '<input type="text" class="settings-input" id="setting-height" value="' + (data.height || 40) + '" style="width:60px;text-align:center;" />' +
          '</div></div>',
      ]);
      break;

    case "divider":
      html += settingsSection("Style", [
        settingsSelectField("Style", "setting-style", data.style || "solid", ["solid", "dashed", "dotted"]),
        settingsColorField("Color", "setting-color", data.color || "#e2e8f0"),
      ]);
      break;

    case "gallery":
      html += settingsSection("Title", [
        settingsField("Section Title", "text", "setting-title", data.title || ""),
        settingsColorField("Title Color", "setting-titleColor", data.titleColor || "#ffffff"),
      ]);
      html += settingsSection("Style", [
        settingsSelectField("Columns", "setting-columns", String(data.columns || 4), ["2", "3", "4"]),
        settingsField("Image Height (px)", "text", "setting-imgHeight", String(data.imgHeight || 160)),
        settingsField("Gap (px)", "text", "setting-gap", String(data.gap || 8)),
        settingsField("Border Radius (px)", "text", "setting-radius", String(data.radius || 10)),
      ]);
      var gImages = data.images || [];
      for (var gi = 0; gi < gImages.length; gi++) {
        html += settingsSection("Image " + (gi + 1), [
          settingsImageUpload("Photo", "setting-gallery-img-" + gi, gImages[gi] || ""),
        ]);
      }
      html += '<div class="settings-section"><button class="btn-outline btn-sm" style="width:100%;justify-content:center;" onclick="addGalleryImage()"><i data-lucide="plus" style="width:10px;height:10px;"></i> เพิ่มรูป</button></div>';
      break;

    case "cards":
      html += settingsSection("Style", [
        settingsSelectField("Columns", "setting-columns", String(data.columns || 3), ["2", "3", "4"]),
        settingsColorField("Card BG", "setting-cardBg", data.cardBg || "#111111"),
        settingsColorField("Title Color", "setting-titleColor", data.titleColor || "#ffffff"),
        settingsColorField("Desc Color", "setting-descColor", data.descColor || "#94a3b8"),
        settingsColorField("Button Color", "setting-btnColor", data.btnColor || "#6366f1"),
        settingsField("Card Radius (px)", "text", "setting-cardRadius", String(data.cardRadius || 16)),
        settingsField("Image Height (px)", "text", "setting-imgHeight", String(data.imgHeight || 140)),
      ]);
      var cards = data.cards || [];
      for (var ci = 0; ci < cards.length; ci++) {
        html += settingsSection("Card " + (ci + 1), [
          settingsImageUpload("Image", "setting-card-image-" + ci, cards[ci].image || ""),
          settingsField("Title", "text", "setting-card-title-" + ci, cards[ci].title || ""),
          settingsField("Description", "textarea", "setting-card-desc-" + ci, cards[ci].desc || ""),
          settingsPageLinkField("Link", "setting-card-link-" + ci, cards[ci].link || "#"),
        ]);
      }
      html += '<div class="settings-section"><button class="btn-outline btn-sm" style="width:100%;justify-content:center;" onclick="addCardItem()"><i data-lucide="plus" style="width:10px;height:10px;"></i> เพิ่มการ์ด</button></div>';
      break;

    case "carousel":
      html += settingsSection("Settings", [
        settingsSelectField("Auto Play", "setting-autoPlay", data.autoPlay !== false ? "true" : "false", ["true", "false"]),
        settingsField("Interval (วินาที)", "text", "setting-interval", String(data.interval || 3)),
        settingsField("Height (px)", "text", "setting-slideHeight", String(data.slideHeight || 200)),
        settingsSelectField("Width", "setting-slideWidth", data.slideWidth || "100%", ["100%", "90%", "80%", "70%", "60%", "50%", "40%", "30%", "20%", "10%"]),
        settingsField("Border Radius (px)", "text", "setting-slideRadius", String(data.slideRadius || 10)),
      ]);
      var slides = data.slides || [];
      for (var si = 0; si < slides.length; si++) {
        html += settingsSection("Slide " + (si + 1), [
          settingsImageUpload("Image", "setting-slide-image-" + si, slides[si].image || ""),
          settingsField("Caption", "text", "setting-slide-caption-" + si, slides[si].caption || ""),
        ]);
      }
      html += '<div class="settings-section"><button class="btn-outline btn-sm" style="width:100%;justify-content:center;" onclick="addSlideItem()"><i data-lucide="plus" style="width:10px;height:10px;"></i> เพิ่ม Slide</button></div>';
      break;

    case "twocol":
      html += settingsSection("Layout", [
        settingsSelectField("Ratio", "setting-ratio", data.ratio || "50-50", ["50-50", "60-40", "40-60", "70-30", "30-70"]),
        settingsField("Gap (px)", "text", "setting-gap", String(data.gap || 24)),
      ]);
      html += settingsSection("Style", [
        settingsColorField("Title Color", "setting-titleColor", data.titleColor || "#ffffff"),
        settingsColorField("Text Color", "setting-textColor", data.textColor || "#94a3b8"),
        settingsColorField("Column BG", "setting-colBg", data.colBg || "transparent"),
        settingsField("Padding (px)", "text", "setting-colPadding", String(data.colPadding || 0)),
        settingsField("Border Radius (px)", "text", "setting-colRadius", String(data.colRadius || 0)),
      ]);
      html += settingsSection("Left Column", [
        settingsImageUpload("Image", "setting-leftImage", data.leftImage || ""),
        settingsField("Title", "text", "setting-leftTitle", data.leftTitle || ""),
        settingsField("Content", "textarea", "setting-leftContent", data.leftContent || ""),
      ]);
      html += settingsSection("Right Column", [
        settingsImageUpload("Image", "setting-rightImage", data.rightImage || ""),
        settingsField("Title", "text", "setting-rightTitle", data.rightTitle || ""),
        settingsField("Content", "textarea", "setting-rightContent", data.rightContent || ""),
      ]);
      break;

    case "testimonial":
      html += settingsSection("Style", [
        settingsColorField("Card BG", "setting-cardBg", data.cardBg || "#111111"),
        settingsColorField("Text Color", "setting-textColor", data.textColor || "#ffffff"),
        settingsColorField("Star Color", "setting-starColor", data.starColor || "#f59e0b"),
        settingsColorField("Accent Color", "setting-accentColor", data.accentColor || "#6366f1"),
        settingsSelectField("Columns", "setting-columns", String(data.columns || 3), ["1", "2", "3"]),
      ]);
      var reviews = data.reviews || [];
      for (var ri = 0; ri < reviews.length; ri++) {
        html += settingsSection("Review " + (ri + 1), [
          settingsImageUpload("Avatar", "setting-review-avatar-" + ri, reviews[ri].avatar || ""),
          settingsField("Name", "text", "setting-review-name-" + ri, reviews[ri].name || ""),
          settingsField("Role", "text", "setting-review-role-" + ri, reviews[ri].role || ""),
          settingsField("Review", "textarea", "setting-review-text-" + ri, reviews[ri].text || ""),
          settingsSelectField("Rating", "setting-review-rating-" + ri, String(reviews[ri].rating || 5), ["1", "2", "3", "4", "5"]),
        ]);
      }
      html += '<div class="settings-section"><button class="btn-outline btn-sm" style="width:100%;justify-content:center;" onclick="addReviewItem()"><i data-lucide="plus" style="width:10px;height:10px;"></i> เพิ่มรีวิว</button></div>';
      break;

    case "video":
      html += settingsSection("Content", [
        settingsField("Video URL", "text", "setting-url", data.url || ""),
        settingsField("Title", "text", "setting-title", data.title || ""),
      ]);
      break;

    default:
      html += '<div class="settings-section"><p style="font-size:10px;color:#94a3b8;">No settings available for this block type.</p></div>';
  }

  return html;
}

// Settings field helpers
function settingsSection(title, fieldsHtml) {
  return '<div class="settings-section">' +
    '<div class="settings-section-title">' + title + '</div>' +
    fieldsHtml.join("") +
    '</div>';
}

function settingsField(label, type, id, value) {
  var input = type === "textarea"
    ? '<textarea class="settings-textarea" id="' + id + '" rows="3">' + escapeHtml(value) + '</textarea>'
    : '<input type="text" class="settings-input" id="' + id + '" value="' + escapeHtml(value) + '" />';
  return '<div class="settings-field">' +
    '<label class="settings-label">' + label + '</label>' +
    input +
    '</div>';
}

function settingsImageUpload(label, id, value) {
  var preview = value
    ? '<div class="settings-img-preview" id="' + id + '-preview">' +
      '<img src="' + escapeHtml(value) + '" />' +
      '<button class="settings-img-remove" onclick="clearImageField(\'' + id + '\')" title="Remove">x</button>' +
      '</div>'
    : '';
  var dropzone = !value
    ? '<div class="settings-img-dropzone" id="' + id + '-dropzone">' +
      '<i data-lucide="upload" style="width:20px;height:20px;margin-bottom:4px;"></i>' +
      '<span>Drag & drop or click to upload</span>' +
      '</div>'
    : '';
  return '<div class="settings-field">' +
    '<label class="settings-label">' + label + '</label>' +
    preview + dropzone +
    '<input type="hidden" id="' + id + '" value="' + escapeHtml(value) + '" />' +
    '<input type="file" id="' + id + '-file" accept="image/*" style="display:none;" />' +
    '</div>';
}

function settingsSelectField(label, id, value, options) {
  var optionsHtml = options.map(function (opt) {
    var optVal = typeof opt === "object" ? opt.value : opt;
    var optLabel = typeof opt === "object" ? opt.label : opt.charAt(0).toUpperCase() + opt.slice(1);
    return '<option value="' + optVal + '"' + (optVal === value ? ' selected' : '') + '>' + optLabel + '</option>';
  }).join("");
  return '<div class="settings-field">' +
    '<label class="settings-label">' + label + '</label>' +
    '<select class="settings-select" id="' + id + '">' + optionsHtml + '</select>' +
    '</div>';
}

function settingsPageLinkField(label, id, value) {
  var optionsHtml = '<option value="#">-- ไม่มี link --</option>';
  pagesData.forEach(function (p) {
    optionsHtml += '<option value="' + p.slug + '"' + (value === p.slug ? ' selected' : '') + '>' + p.name + ' (/' + p.slug + ')</option>';
  });
  return '<div class="settings-field">' +
    '<label class="settings-label">' + label + '</label>' +
    '<select class="settings-select" id="' + id + '">' + optionsHtml + '</select>' +
    '</div>';
}

function settingsColorFieldWithTransparent(label, id, value) {
  var isTransparent = !value || value === "transparent";
  var colorVal = isTransparent ? "#000000" : value;
  return '<div class="settings-field">' +
    '<label class="settings-label">' + label + '</label>' +
    '<div class="settings-color-transparent-wrap">' +
    '<label class="settings-transparent-toggle' + (isTransparent ? ' active' : '') + '">' +
    '<input type="checkbox" id="' + id + '-transparent"' + (isTransparent ? ' checked' : '') + ' /> พื้นหลังใส' +
    '</label>' +
    '<div class="settings-color-row' + (isTransparent ? ' disabled' : '') + '" id="' + id + '-row">' +
    '<div class="settings-color-swatch" style="background:' + (isTransparent ? 'repeating-conic-gradient(#d1d5db 0% 25%, transparent 0% 50%) 50% / 12px 12px' : colorVal) + ';">' +
    '<input type="color" id="' + id + '" value="' + colorVal + '"' + (isTransparent ? ' disabled' : '') + ' />' +
    '</div>' +
    '<input type="text" class="settings-input" style="flex:1;" value="' + (isTransparent ? 'transparent' : colorVal) + '" data-color-text="' + id + '"' + (isTransparent ? ' disabled' : '') + ' />' +
    '</div>' +
    '</div>' +
    '</div>';
}

function settingsColorField(label, id, value) {
  return '<div class="settings-field">' +
    '<label class="settings-label">' + label + '</label>' +
    '<div class="settings-color-row">' +
    '<div class="settings-color-swatch" style="background:' + value + ';">' +
    '<input type="color" id="' + id + '" value="' + value + '" />' +
    '</div>' +
    '<input type="text" class="settings-input" style="flex:1;" value="' + value + '" data-color-text="' + id + '" />' +
    '</div>' +
    '</div>';
}

function bindSettingsEvents(block) {
  var page = getCurrentPage();
  if (!page || !block) return;

  // Generic input/textarea/select change handler
  document.querySelectorAll("#blockSettingsContent .settings-input, #blockSettingsContent .settings-textarea, #blockSettingsContent .settings-select, #blockSettingsContent input[type='color']").forEach(function (el) {
    var eventType = el.tagName === "SELECT" ? "change" : "input";
    el.addEventListener(eventType, function () {
      // Sync color picker <-> text input
      if (this.type === "color") {
        var textInput = document.querySelector('[data-color-text="' + this.id + '"]');
        if (textInput) textInput.value = this.value;
        var swatch = this.closest(".settings-color-swatch");
        if (swatch) swatch.style.background = this.value;
      }
      if (this.dataset.colorText) {
        var colorInput = document.getElementById(this.dataset.colorText);
        if (colorInput) {
          colorInput.value = this.value;
          var swatch = colorInput.closest(".settings-color-swatch");
          if (swatch) swatch.style.background = this.value;
        }
      }
      updateBlockData(block);
      renderCanvasBlocks();
    });
  });

  // Product mode toggle
  document.querySelectorAll("[data-prod-mode]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll("[data-prod-mode]").forEach(function (b) { b.classList.remove("active"); });
      this.classList.add("active");
      var m = this.dataset.prodMode;
      var autoSec = document.getElementById("prodAutoSection");
      var manualSec = document.getElementById("prodManualSection");
      if (autoSec) autoSec.style.display = m === "auto" ? "" : "none";
      if (manualSec) manualSec.style.display = m === "manual" ? "" : "none";
      updateBlockData(block);
      renderCanvasBlocks();
    });
  });

  // Product picker checkboxes
  document.querySelectorAll(".product-picker-item input[type='checkbox']").forEach(function (cb) {
    cb.addEventListener("change", function () {
      var label = this.closest(".product-picker-item");
      if (this.checked) { label.classList.add("checked"); } else { label.classList.remove("checked"); }
      updateBlockData(block);
      renderCanvasBlocks();
    });
  });

  // Generic settings checkboxes (btn1Show, btn2Show, etc.) — excludes color transparent toggles
  document.querySelectorAll("#blockSettingsContent input[type='checkbox']").forEach(function (cb) {
    if (cb.id && cb.id.indexOf("-transparent") !== -1) return;
    if (cb.closest(".product-picker-item")) return;
    cb.addEventListener("change", function () {
      updateBlockData(block);
      renderCanvasBlocks();
    });
  });

  // Range + text input sync (spacer height etc.)
  var heightRange = document.getElementById("setting-height-range");
  var heightInput = document.getElementById("setting-height");
  if (heightRange && heightInput) {
    heightRange.addEventListener("input", function () {
      heightInput.value = this.value;
      updateBlockData(block);
      renderCanvasBlocks();
    });
    heightInput.addEventListener("input", function () {
      var v = parseInt(this.value) || 0;
      if (v > 1000) v = 1000;
      heightRange.value = v;
      updateBlockData(block);
      renderCanvasBlocks();
    });
  }

  // Transparent checkbox toggle
  document.querySelectorAll("#blockSettingsContent input[id$='-transparent']").forEach(function (cb) {
    cb.addEventListener("change", function () {
      var baseId = this.id.replace("-transparent", "");
      var colorInput = document.getElementById(baseId);
      var textInput = document.querySelector('[data-color-text="' + baseId + '"]');
      var row = document.getElementById(baseId + "-row");
      var swatch = row ? row.querySelector(".settings-color-swatch") : null;
      var label = this.closest(".settings-transparent-toggle");

      if (this.checked) {
        if (colorInput) colorInput.disabled = true;
        if (textInput) { textInput.disabled = true; textInput.value = "transparent"; }
        if (row) row.classList.add("disabled");
        if (swatch) swatch.style.background = "repeating-conic-gradient(#d1d5db 0% 25%, transparent 0% 50%) 50% / 12px 12px";
        if (label) label.classList.add("active");
      } else {
        var color = colorInput ? colorInput.value : "#000000";
        if (colorInput) colorInput.disabled = false;
        if (textInput) { textInput.disabled = false; textInput.value = color; }
        if (row) row.classList.remove("disabled");
        if (swatch) swatch.style.background = color;
        if (label) label.classList.remove("active");
      }
      updateBlockData(block);
      renderCanvasBlocks();
    });
  });

  // Nav slot inputs
  document.querySelectorAll(".nav-slot-input, .nav-slot-page").forEach(function (el) {
    var eventType = el.tagName === "SELECT" ? "change" : "input";
    el.addEventListener(eventType, function () {
      updateBlockData(block);
      // Update row active state
      var idx = this.dataset.slot;
      var row = this.closest(".nav-slot-row");
      var nameInput = document.querySelector('.nav-slot-input[data-slot="' + idx + '"]');
      var statusEl = row.querySelector(".nav-slot-status");
      if (nameInput && nameInput.value.trim()) {
        row.classList.add("active");
        statusEl.innerHTML = "&#9679;";
      } else {
        row.classList.remove("active");
        statusEl.innerHTML = "";
      }
    });
  });

  // Nav slot drag-to-reorder
  var navList = document.getElementById("navSlotsList");
  if (navList) {
    var dragIdx = null;
    navList.querySelectorAll(".nav-slot-row").forEach(function (row) {
      row.addEventListener("dragstart", function () {
        dragIdx = parseInt(this.dataset.slotIndex);
        this.classList.add("dragging");
      });
      row.addEventListener("dragend", function () {
        this.classList.remove("dragging");
        dragIdx = null;
        navList.querySelectorAll(".nav-slot-row").forEach(function (r) { r.classList.remove("drag-over"); });
      });
      row.addEventListener("dragover", function (e) {
        e.preventDefault();
        this.classList.add("drag-over");
      });
      row.addEventListener("dragleave", function () {
        this.classList.remove("drag-over");
      });
      row.addEventListener("drop", function (e) {
        e.preventDefault();
        this.classList.remove("drag-over");
        var targetIdx = parseInt(this.dataset.slotIndex);
        if (dragIdx !== null && dragIdx !== targetIdx) {
          // Swap slots in data
          var slots = block.data.navSlots || [];
          while (slots.length < 10) slots.push({ name: "", slug: "" });
          var temp = slots[dragIdx];
          slots[dragIdx] = slots[targetIdx];
          slots[targetIdx] = temp;
          block.data.navSlots = slots;
          block.data.navItems = slots.filter(function (s) { return s.name; }).map(function (s) { return s.name; });
          // Re-render
          renderBlockSettings();
          renderCanvasBlocks();
        }
      });
    });
  }

  // Image upload dropzones
  document.querySelectorAll("#blockSettingsContent .settings-img-dropzone").forEach(function (dropzone) {
    var fieldId = dropzone.id.replace("-dropzone", "");
    var fileInput = document.getElementById(fieldId + "-file");

    // Click to open file picker
    dropzone.addEventListener("click", function () {
      fileInput.click();
    });

    // Drag events
    dropzone.addEventListener("dragover", function (e) {
      e.preventDefault();
      this.style.borderColor = "#6366f1";
      this.style.background = "#eef2ff";
    });

    dropzone.addEventListener("dragleave", function () {
      this.style.borderColor = "";
      this.style.background = "";
    });

    dropzone.addEventListener("drop", function (e) {
      e.preventDefault();
      this.style.borderColor = "";
      this.style.background = "";
      var file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) {
        handleImageUpload(file, fieldId, block);
      }
    });

    // File input change
    fileInput.addEventListener("change", function () {
      if (this.files[0]) {
        handleImageUpload(this.files[0], fieldId, block);
      }
    });
  });
}

function handleImageUpload(file, fieldId, block) {
  var dropzone = document.getElementById(fieldId + "-dropzone");
  if (dropzone) {
    dropzone.innerHTML = '<i data-lucide="loader" style="width:16px;height:16px;animation:spin 1s linear infinite;"></i><span>Uploading...</span>';
  }

  var folder = fieldId.indexOf("logo") !== -1 ? "logos" : "images";
  uploadFileToStorage(file, folder).then(function (url) {
    // Set hidden input value
    var hidden = document.getElementById(fieldId);
    if (hidden) hidden.value = url;

    // Update block data
    updateBlockData(block);

    // Re-render settings to show preview + canvas
    renderBlockSettings();
    renderCanvasBlocks();
  }).catch(function (err) {
    console.error("Upload error:", err);
    showToast("Upload Failed", "ไม่สามารถอัพโหลดรูปได้");
    if (dropzone) {
      dropzone.innerHTML = '<i data-lucide="upload" style="width:20px;height:20px;margin-bottom:4px;"></i><span>Drag & drop or click</span>';
    }
  });
}

// Add item functions for dynamic lists
function addGalleryImage() {
  var block = getCurrentPage().blocks.find(function (b) { return b.id === selectedBlockId; });
  if (!block || block.type !== "gallery") return;
  block.data.images = block.data.images || [];
  block.data.images.push("");
  renderBlockSettings();
  renderCanvasBlocks();
}

function addFeatureItem() {
  var block = getCurrentPage().blocks.find(function (b) { return b.id === selectedBlockId; });
  if (!block || block.type !== "features") return;
  block.data.features = block.data.features || [];
  block.data.features.push({ name: "New Feature", desc: "Description", icon: "check-circle" });
  renderBlockSettings();
  renderCanvasBlocks();
}

function addCardItem() {
  var block = getCurrentPage().blocks.find(function (b) { return b.id === selectedBlockId; });
  if (!block || block.type !== "cards") return;
  block.data.cards = block.data.cards || [];
  block.data.cards.push({ title: "New Card", desc: "Description", image: "", link: "#" });
  renderBlockSettings();
  renderCanvasBlocks();
}

function addSlideItem() {
  var block = getCurrentPage().blocks.find(function (b) { return b.id === selectedBlockId; });
  if (!block || block.type !== "carousel") return;
  block.data.slides = block.data.slides || [];
  block.data.slides.push({ image: "", caption: "New Slide" });
  renderBlockSettings();
  renderCanvasBlocks();
}

function addReviewItem() {
  var block = getCurrentPage().blocks.find(function (b) { return b.id === selectedBlockId; });
  if (!block || block.type !== "testimonial") return;
  block.data.reviews = block.data.reviews || [];
  block.data.reviews.push({ name: "Customer", text: "Great product!", rating: 5 });
  renderBlockSettings();
  renderCanvasBlocks();
}

function clearImageField(fieldId) {
  var hidden = document.getElementById(fieldId);
  if (hidden) hidden.value = "";

  var block = getCurrentPage().blocks.find(function (b) { return b.id === selectedBlockId; });
  if (block) {
    updateBlockData(block);
    renderBlockSettings();
  }
}

function updateBlockData(block) {
  markDirty();
  var data = block.data;

  switch (block.type) {
    case "hero":
      data.title = getVal("setting-title");
      data.subtitle = getVal("setting-subtitle");
      data.buttonText = getVal("setting-buttonText");
      data.buttonLink = getVal("setting-buttonLink") || "#";
      data.bgColor = getVal("setting-bgColor") || data.bgColor;
      data.fontColor = getVal("setting-fontColor") || data.fontColor || "#ffffff";
      data.subColor = getVal("setting-subColor") || data.subColor || "#ffffff";
      data.btnColor = getVal("setting-btnColor") || data.btnColor || "#ef4444";
      data.btnFontColor = getVal("setting-btnFontColor") || data.btnFontColor || "#ffffff";
      data.textAlign = getVal("setting-textAlign") || data.textAlign;
      break;
    case "text":
      data.heading = getVal("setting-heading");
      data.content = getVal("setting-content");
      data.fontColor = getVal("setting-fontColor") || data.fontColor || "#ffffff";
      data.contentColor = getVal("setting-contentColor") || data.contentColor || "#ffffff";
      data.headingSize = getVal("setting-headingSize") || data.headingSize;
      data.textAlign = getVal("setting-textAlign") || data.textAlign;
      data.image = getVal("setting-image") || "";
      data.imagePos = getVal("setting-imagePos") || "none";
      var b1cb = document.getElementById("setting-btn1Show");
      data.btn1Show = b1cb ? b1cb.checked : false;
      data.btn1Text = getVal("setting-btn1Text") || data.btn1Text || "Learn More";
      data.btn1Link = getVal("setting-btn1Link") || data.btn1Link || "#";
      data.btn1Color = getVal("setting-btn1Color") || data.btn1Color || "#ef4444";
      data.btn1FontColor = getVal("setting-btn1FontColor") || data.btn1FontColor || "#ffffff";
      var b2cb = document.getElementById("setting-btn2Show");
      data.btn2Show = b2cb ? b2cb.checked : false;
      data.btn2Text = getVal("setting-btn2Text") || data.btn2Text || "Contact";
      data.btn2Link = getVal("setting-btn2Link") || data.btn2Link || "#";
      data.btn2Color = getVal("setting-btn2Color") || data.btn2Color || "#222222";
      data.btn2FontColor = getVal("setting-btn2FontColor") || data.btn2FontColor || "#ffffff";
      break;
    case "image":
      data.src = getVal("setting-src");
      data.alt = getVal("setting-alt");
      var transparentCb = document.getElementById("setting-bgColor-transparent");
      data.bgColor = (transparentCb && transparentCb.checked) ? "transparent" : (getVal("setting-bgColor") || data.bgColor);
      data.size = getVal("setting-size") || data.size;
      data.align = getVal("setting-align") || data.align;
      data.borderRadius = getVal("setting-borderRadius") || data.borderRadius;
      break;
    case "imagetext":
      data.image = getVal("setting-image");
      data.title = getVal("setting-title");
      data.content = getVal("setting-content");
      data.layout = getVal("setting-layout") || data.layout || "image-left";
      data.titleColor = getVal("setting-titleColor") || data.titleColor || "#ffffff";
      data.contentColor = getVal("setting-contentColor") || data.contentColor || "#94a3b8";
      var itTransCb = document.getElementById("setting-bgColor-transparent");
      data.bgColor = (itTransCb && itTransCb.checked) ? "transparent" : (getVal("setting-bgColor") || data.bgColor);
      data.imgRadius = getVal("setting-imgRadius") || data.imgRadius || "16";
      data.imgHeight = getVal("setting-imgHeight") || data.imgHeight || "300";
      var itB1 = document.getElementById("setting-btn1Show");
      data.btn1Show = itB1 ? itB1.checked : false;
      data.btn1Text = getVal("setting-btn1Text") || data.btn1Text || "Learn More";
      data.btn1Link = getVal("setting-btn1Link") || data.btn1Link || "#";
      data.btn1Color = getVal("setting-btn1Color") || data.btn1Color || "#ef4444";
      data.btn1FontColor = getVal("setting-btn1FontColor") || data.btn1FontColor || "#ffffff";
      var itB2 = document.getElementById("setting-btn2Show");
      data.btn2Show = itB2 ? itB2.checked : false;
      data.btn2Text = getVal("setting-btn2Text") || data.btn2Text || "Contact";
      data.btn2Link = getVal("setting-btn2Link") || data.btn2Link || "#";
      data.btn2Color = getVal("setting-btn2Color") || data.btn2Color || "#222222";
      data.btn2FontColor = getVal("setting-btn2FontColor") || data.btn2FontColor || "#ffffff";
      break;
    case "products":
      data.title = getVal("setting-title");
      data.titleColor = getVal("setting-titleColor") || data.titleColor || "#14b8a6";
      data.columns = parseInt(getVal("setting-columns")) || data.columns;
      data.limit = parseInt(getVal("setting-limit")) || data.limit;
      data.categoryId = getVal("setting-category") || "";
      data.cardBg = getVal("setting-cardBg") || data.cardBg || "#111111";
      data.priceColor = getVal("setting-priceColor") || data.priceColor || "#ef4444";
      data.cardRadius = getVal("setting-cardRadius") || data.cardRadius || "16";
      data.imgHeight = getVal("setting-imgHeight") || data.imgHeight || "120";
      data.showBtn = getVal("setting-showBtn") || data.showBtn || "false";
      data.btnText = getVal("setting-btnText") || data.btnText || "Add to Cart";
      data.btnColor = getVal("setting-btnColor") || data.btnColor || "#14b8a6";
      // mode + selectedProducts are updated via button clicks
      var activeMode = document.querySelector("[data-prod-mode].active");
      if (activeMode) data.mode = activeMode.dataset.prodMode;
      var checks = document.querySelectorAll(".product-picker-item input[type='checkbox']");
      if (checks.length > 0) {
        data.selectedProducts = [];
        checks.forEach(function (cb) { if (cb.checked) data.selectedProducts.push(parseInt(cb.value)); });
      }
      break;
    case "features":
      data.title = getVal("setting-title");
      data.titleColor = getVal("setting-titleColor") || data.titleColor || "#ffffff";
      data.cardBg = getVal("setting-cardBg") || data.cardBg || "#111111";
      data.iconColor = getVal("setting-iconColor") || data.iconColor || "#14b8a6";
      data.textColor = getVal("setting-textColor") || data.textColor || "#ffffff";
      data.columns = parseInt(getVal("setting-columns")) || data.columns || 4;
      var featCount = (data.features || []).length;
      data.features = [];
      for (var fi = 0; fi < featCount; fi++) {
        data.features.push({
          name: getVal("setting-feat-name-" + fi) || "",
          desc: getVal("setting-feat-desc-" + fi) || "",
          icon: getVal("setting-feat-icon-" + fi) || "check",
        });
      }
      break;
    case "contact":
      data.title = getVal("setting-title");
      data.titleColor = getVal("setting-titleColor") || data.titleColor || "#ffffff";
      data.phone = getVal("setting-phone");
      data.line = getVal("setting-line");
      data.email = getVal("setting-email");
      data.address = getVal("setting-address");
      data.website = getVal("setting-website");
      data.facebook = getVal("setting-facebook");
      data.layout = getVal("setting-layout") || data.layout || "vertical";
      data.cardBg = getVal("setting-cardBg") || data.cardBg || "#111111";
      data.iconColor = getVal("setting-iconColor") || data.iconColor || "#14b8a6";
      data.textColor = getVal("setting-textColor") || data.textColor || "#ffffff";
      break;
    case "cta":
      data.heading = getVal("setting-heading");
      data.description = getVal("setting-description");
      data.buttonText = getVal("setting-buttonText");
      data.buttonLink = getVal("setting-buttonLink");
      data.bgColor = getVal("setting-bgColor") || data.bgColor || "#0f172a";
      data.fontColor = getVal("setting-fontColor") || data.fontColor || "#ffffff";
      data.descColor = getVal("setting-descColor") || data.descColor || "#ffffff";
      data.btnColor = getVal("setting-btnColor") || data.btnColor || "#14b8a6";
      data.btnFontColor = getVal("setting-btnFontColor") || data.btnFontColor || "#ffffff";
      break;
    case "header":
      data.logoImage = getVal("setting-logoImage");
      data.logoText = getVal("setting-logoText");
      data.logoSize = getVal("setting-logoSize") || "medium";
      data.bgColor = getVal("setting-bgColor") || data.bgColor || "#0a0a0a";
      data.fontColor = getVal("setting-fontColor") || data.fontColor || "#ffffff";
      data.navSlots = readNavSlots();
      // Keep navItems for backward compat
      data.navItems = data.navSlots.filter(function (s) { return s.name; }).map(function (s) { return s.name; });
      break;
    case "footer":
      data.text = getVal("setting-text");
      data.bgColor = getVal("setting-bgColor") || data.bgColor || "#0a0a0a";
      data.fontColor = getVal("setting-fontColor") || data.fontColor || "#ffffff";
      break;
    case "spacer":
      data.height = parseInt(getVal("setting-height")) || 40;
      break;
    case "divider":
      data.style = getVal("setting-style") || data.style;
      data.color = getVal("setting-color") || data.color;
      break;
    case "gallery":
      data.title = getVal("setting-title");
      data.titleColor = getVal("setting-titleColor") || data.titleColor || "#ffffff";
      data.columns = parseInt(getVal("setting-columns")) || data.columns;
      data.imgHeight = getVal("setting-imgHeight") || data.imgHeight || "160";
      data.gap = getVal("setting-gap") || data.gap || "8";
      data.radius = getVal("setting-radius") || data.radius || "10";
      var imgCount = (data.images || []).length;
      data.images = [];
      for (var gi = 0; gi < imgCount; gi++) {
        data.images.push(getVal("setting-gallery-img-" + gi) || "");
      }
      break;
    case "cards":
      data.columns = parseInt(getVal("setting-columns")) || data.columns;
      data.cardBg = getVal("setting-cardBg") || data.cardBg || "#111111";
      data.titleColor = getVal("setting-titleColor") || data.titleColor || "#ffffff";
      data.descColor = getVal("setting-descColor") || data.descColor || "#94a3b8";
      data.btnColor = getVal("setting-btnColor") || data.btnColor || "#6366f1";
      data.cardRadius = getVal("setting-cardRadius") || data.cardRadius || "16";
      data.imgHeight = getVal("setting-imgHeight") || data.imgHeight || "140";
      var cardCount = (data.cards || []).length;
      data.cards = [];
      for (var ci = 0; ci < cardCount; ci++) {
        data.cards.push({
          title: getVal("setting-card-title-" + ci),
          desc: getVal("setting-card-desc-" + ci),
          image: getVal("setting-card-image-" + ci),
          link: getVal("setting-card-link-" + ci) || "#",
        });
      }
      break;
    case "carousel":
      data.autoPlay = getVal("setting-autoPlay") === "true";
      data.interval = parseInt(getVal("setting-interval")) || 3;
      data.slideHeight = getVal("setting-slideHeight") || data.slideHeight || "200";
      data.slideWidth = getVal("setting-slideWidth") || data.slideWidth || "100%";
      data.slideRadius = getVal("setting-slideRadius") || data.slideRadius || "10";
      var slideCount = (data.slides || []).length;
      data.slides = [];
      for (var si = 0; si < slideCount; si++) {
        data.slides.push({
          image: getVal("setting-slide-image-" + si),
          caption: getVal("setting-slide-caption-" + si),
        });
      }
      break;
    case "twocol":
      data.ratio = getVal("setting-ratio") || "50-50";
      data.gap = getVal("setting-gap") || data.gap || "24";
      data.titleColor = getVal("setting-titleColor") || data.titleColor || "#ffffff";
      data.textColor = getVal("setting-textColor") || data.textColor || "#94a3b8";
      data.colBg = getVal("setting-colBg") || data.colBg || "transparent";
      data.colPadding = getVal("setting-colPadding") || data.colPadding || "0";
      data.colRadius = getVal("setting-colRadius") || data.colRadius || "0";
      data.leftImage = getVal("setting-leftImage") || "";
      data.leftTitle = getVal("setting-leftTitle");
      data.leftContent = getVal("setting-leftContent");
      data.rightImage = getVal("setting-rightImage") || "";
      data.rightTitle = getVal("setting-rightTitle");
      data.rightContent = getVal("setting-rightContent");
      break;
    case "testimonial":
      data.cardBg = getVal("setting-cardBg") || data.cardBg || "#111111";
      data.textColor = getVal("setting-textColor") || data.textColor || "#ffffff";
      data.starColor = getVal("setting-starColor") || data.starColor || "#f59e0b";
      data.accentColor = getVal("setting-accentColor") || data.accentColor || "#6366f1";
      data.columns = parseInt(getVal("setting-columns")) || data.columns || 3;
      var revCount = (data.reviews || []).length;
      data.reviews = [];
      for (var ri = 0; ri < revCount; ri++) {
        data.reviews.push({
          avatar: getVal("setting-review-avatar-" + ri) || "",
          name: getVal("setting-review-name-" + ri),
          role: getVal("setting-review-role-" + ri) || "",
          text: getVal("setting-review-text-" + ri),
          rating: parseInt(getVal("setting-review-rating-" + ri)) || 5,
        });
      }
      break;
    case "video":
      data.url = getVal("setting-url");
      data.title = getVal("setting-title");
      break;
  }

  // Re-render only the affected block content (not full re-render to keep focus)
  var blockEl = document.querySelector('.canvas-block[data-block-id="' + block.id + '"] .block-content');
  if (blockEl) {
    blockEl.innerHTML = generateBlockPreview(block);
    if (typeof lucide !== "undefined") lucide.createIcons();
  }
}

function getVal(id) {
  var el = document.getElementById(id);
  return el ? el.value : "";
}

// ===================== Block Preview Generation =====================
function generateBlockPreview(block) {
  var d = block.data || {};

  switch (block.type) {
    case "hero":
      return '<div class="block-preview-hero" style="background:' + (d.bgColor || '#0a0a0a') + ';text-align:' + (d.textAlign || 'center') + ';">' +
        '<h2 style="color:' + (d.fontColor || '#fff') + ';">' + escapeHtml(d.title || "Hero Title") + '</h2>' +
        '<p style="color:' + (d.subColor || d.fontColor || '#fff') + ';opacity:0.7;">' + escapeHtml(d.subtitle || "Subtitle text here") + '</p>' +
        '<span class="hero-cta" style="background:' + (d.btnColor || '#ef4444') + ';color:' + (d.btnFontColor || '#fff') + ';">' + escapeHtml(d.buttonText || "Button") + '</span>' +
        '</div>';

    case "text":
      var hSize = d.headingSize === "large" ? "18px" : d.headingSize === "small" ? "12px" : "14px";
      var tFontColor = d.fontColor || '#ffffff';
      var tContentColor = d.contentColor || tFontColor;
      var tImgPos = d.imagePos || "none";
      var tBtns = "";
      if (d.btn1Show) {
        tBtns += '<span style="display:inline-block;background:' + (d.btn1Color || '#ef4444') + ';color:' + (d.btn1FontColor || '#fff') + ';padding:4px 12px;border-radius:99px;font-size:8px;font-weight:700;">' + escapeHtml(d.btn1Text || 'Button') + '</span> ';
      }
      if (d.btn2Show) {
        var b2bg = d.btn2Color === "transparent" ? "transparent" : (d.btn2Color || "transparent");
        tBtns += '<span style="display:inline-block;background:' + b2bg + ';color:' + (d.btn2FontColor || '#fff') + ';padding:4px 12px;border-radius:99px;font-size:8px;font-weight:700;border:1px solid ' + (d.btn2FontColor || '#fff') + ';">' + escapeHtml(d.btn2Text || 'Button') + '</span>';
      }
      if (tBtns) tBtns = '<div style="margin-top:8px;">' + tBtns + '</div>';
      var tImgHtml = "";
      if (d.image && tImgPos !== "none") {
        tImgHtml = '<img src="' + escapeHtml(d.image) + '" style="width:100%;height:auto;max-height:120px;object-fit:cover;border-radius:8px;" />';
      }
      var tInnerText = (d.heading ? '<h3 style="font-size:' + hSize + ';color:' + tFontColor + ';">' + escapeHtml(d.heading) + '</h3>' : '') +
        '<p style="color:' + tContentColor + ';opacity:0.7;">' + escapeHtml(d.content || "Text content here...") + '</p>' + tBtns;
      if (tImgHtml && tImgPos === "top") {
        return '<div class="block-preview-text" style="padding:12px 16px;">' + tImgHtml + '<div style="margin-top:8px;text-align:' + (d.textAlign || 'left') + ';">' + tInnerText + '</div></div>';
      }
      if (tImgHtml && (tImgPos === "left" || tImgPos === "right")) {
        var tFlexDir = tImgPos === "right" ? "flex-direction:row-reverse;" : "";
        return '<div style="display:flex;gap:12px;padding:12px 16px;align-items:center;' + tFlexDir + '">' +
          '<div style="flex:1;min-width:0;">' + tImgHtml + '</div>' +
          '<div style="flex:1;min-width:0;text-align:' + (d.textAlign || 'left') + ';">' + tInnerText + '</div></div>';
      }
      return '<div class="block-preview-text" style="text-align:' + (d.textAlign || 'left') + ';">' + tInnerText + '</div>';

    case "image":
      var imgBg = d.bgColor && d.bgColor !== "transparent" ? 'background:' + d.bgColor + ';' : '';
      if (d.src) {
        return '<div class="block-preview-image" style="text-align:' + (d.align || 'center') + ';' + imgBg + 'padding:16px;border-radius:8px;">' +
          '<img src="' + escapeHtml(d.src) + '" alt="' + escapeHtml(d.alt || '') + '" style="border-radius:' + (d.borderRadius || 10) + 'px;max-width:' + (d.size === 'small' ? '50%' : d.size === 'medium' ? '75%' : '100%') + ';" />' +
          '</div>';
      }
      return '<div class="block-preview-image" style="' + imgBg + '"><div class="img-placeholder"><i data-lucide="image"></i></div></div>';

    case "imagetext":
      var itLayout = d.layout || "image-left";
      var itBg = d.bgColor && d.bgColor !== "transparent" ? 'background:' + d.bgColor + ';' : '';
      var itRad = d.imgRadius || 16;
      var itImgH = d.imgHeight || 300;
      var itBtns = "";
      if (d.btn1Show) {
        itBtns += '<span style="display:inline-block;background:' + (d.btn1Color || '#ef4444') + ';color:' + (d.btn1FontColor || '#fff') + ';padding:4px 12px;border-radius:99px;font-size:8px;font-weight:700;">' + escapeHtml(d.btn1Text || 'Button') + '</span> ';
      }
      if (d.btn2Show) {
        itBtns += '<span style="display:inline-block;background:' + (d.btn2Color || '#222') + ';color:' + (d.btn2FontColor || '#fff') + ';padding:4px 12px;border-radius:99px;font-size:8px;font-weight:700;border:1px solid ' + (d.btn2FontColor || '#fff') + ';">' + escapeHtml(d.btn2Text || 'Button') + '</span>';
      }
      if (itBtns) itBtns = '<div style="margin-top:8px;">' + itBtns + '</div>';
      var itImg = d.image
        ? '<img src="' + escapeHtml(d.image) + '" style="width:100%;height:' + (itImgH / 2) + 'px;object-fit:cover;border-radius:' + itRad + 'px;" />'
        : '<div style="width:100%;height:' + (itImgH / 2) + 'px;background:linear-gradient(135deg,#1a1a2e,#0f172a);border-radius:' + itRad + 'px;display:flex;align-items:center;justify-content:center;color:#334155;"><i data-lucide="image" style="width:24px;height:24px;"></i></div>';
      var itText = '<div style="' + (itLayout === 'image-top' ? 'text-align:center;' : '') + '">' +
        '<div style="font-size:12px;font-weight:800;color:' + (d.titleColor || '#fff') + ';margin-bottom:6px;">' + escapeHtml(d.title || "Title") + '</div>' +
        '<div style="font-size:9px;color:' + (d.contentColor || '#94a3b8') + ';line-height:1.5;">' + escapeHtml(d.content || "Content here...") + '</div>' +
        itBtns + '</div>';
      if (itLayout === "image-top") {
        return '<div style="padding:16px;' + itBg + '">' + itImg + '<div style="margin-top:12px;">' + itText + '</div></div>';
      }
      var itFlexDir = itLayout === "image-right" ? "flex-direction:row-reverse;" : "";
      return '<div style="display:flex;gap:12px;padding:16px;align-items:center;' + itFlexDir + itBg + '">' +
        '<div style="flex:1;min-width:0;">' + itImg + '</div>' +
        '<div style="flex:1;min-width:0;">' + itText + '</div>' +
        '</div>';

    case "products":
      var cols = d.columns || 3;
      var prods = getProductsForBlock(d);
      var cards = "";
      var cBg = d.cardBg || "#111";
      var cRad = d.cardRadius || 16;
      var iH = d.imgHeight || 120;
      var pColor = d.priceColor || "#ef4444";
      if (prods.length > 0) {
        prods.forEach(function (p) {
          var imgHtml = p.image
            ? '<img src="' + escapeHtml(p.image) + '" style="width:100%;height:' + iH + 'px;object-fit:cover;border-radius:' + Math.max(cRad - 4, 0) + 'px;" />'
            : '<div style="width:100%;height:' + iH + 'px;background:#1a1a2e;border-radius:' + Math.max(cRad - 4, 0) + 'px;"></div>';
          var btnHtml = d.showBtn === "true" ? '<div style="margin-top:6px;"><span style="background:' + (d.btnColor || '#14b8a6') + ';color:#fff;font-size:7px;padding:2px 8px;border-radius:99px;">' + escapeHtml(d.btnText || 'Add to Cart') + '</span></div>' : '';
          cards += '<div style="background:' + cBg + ';border-radius:' + cRad + 'px;padding:8px;text-align:center;">' +
            imgHtml +
            '<div style="font-size:10px;font-weight:700;color:#fff;margin-top:6px;">' + escapeHtml(p.name) + '</div>' +
            '<div style="font-size:10px;font-weight:800;color:' + pColor + ';margin-top:2px;">฿' + p.price + '</div>' +
            btnHtml +
            '</div>';
        });
      } else {
        for (var i = 0; i < Math.min(cols, d.limit || 6); i++) {
          cards += '<div style="background:' + cBg + ';border-radius:' + cRad + 'px;padding:8px;text-align:center;">' +
            '<div style="width:100%;height:' + iH + 'px;background:#1a1a2e;border-radius:' + Math.max(cRad - 4, 0) + 'px;"></div>' +
            '<div style="font-size:10px;font-weight:700;color:#fff;margin-top:6px;">Product ' + (i + 1) + '</div>' +
            '<div style="font-size:10px;font-weight:800;color:' + pColor + ';margin-top:2px;">฿0</div></div>';
        }
      }
      return '<div class="block-preview-products">' +
        '<h3 style="color:' + (d.titleColor || '#14b8a6') + ';">' + escapeHtml(d.title || "Products") + '</h3>' +
        '<div class="product-grid-preview" style="grid-template-columns:repeat(' + cols + ',1fr);">' + cards + '</div>' +
        '</div>';

    case "features":
      var fFeats = d.features || (d.items || []).map(function (n, i) { var ic = ["shield-check","sparkles","truck","star"]; return { name: n, desc: "", icon: ic[i] || "check" }; });
      var fCardBg = d.cardBg || "#111";
      var fIconColor = d.iconColor || "#14b8a6";
      var fTextColor = d.textColor || "#fff";
      var fCols = d.columns || 4;
      var featureCards = fFeats.map(function (f) {
        return '<div style="background:' + fCardBg + ';border-radius:14px;padding:14px 10px;text-align:center;">' +
          '<div style="width:36px;height:36px;background:rgba(20,184,166,0.12);border-radius:10px;display:flex;align-items:center;justify-content:center;margin:0 auto 8px;color:' + fIconColor + ';"><i data-lucide="' + (f.icon || 'check') + '" style="width:18px;height:18px;"></i></div>' +
          '<div style="font-size:10px;font-weight:700;color:' + fTextColor + ';">' + escapeHtml(f.name) + '</div>' +
          (f.desc ? '<div style="font-size:8px;color:' + fTextColor + ';opacity:0.5;margin-top:2px;">' + escapeHtml(f.desc) + '</div>' : '') +
          '</div>';
      }).join("");
      return '<div class="block-preview-features">' +
        '<h3 style="color:' + (d.titleColor || '#fff') + ';">' + escapeHtml(d.title || "Features") + '</h3>' +
        '<div class="features-grid" style="grid-template-columns:repeat(' + fCols + ',1fr);">' + featureCards + '</div>' +
        '</div>';

    case "contact":
      var cBg = d.cardBg || "#111";
      var cIc = d.iconColor || "#14b8a6";
      var cTx = d.textColor || "#fff";
      var contactItems = [];
      if (d.phone) contactItems.push({ icon: "phone", label: "Phone", value: d.phone });
      if (d.line) contactItems.push({ icon: "message-circle", label: "Line", value: d.line });
      if (d.email) contactItems.push({ icon: "mail", label: "Email", value: d.email });
      if (d.address) contactItems.push({ icon: "map-pin", label: "Address", value: d.address });
      if (d.website) contactItems.push({ icon: "globe", label: "Website", value: d.website });
      if (d.facebook) contactItems.push({ icon: "facebook", label: "Facebook", value: d.facebook });
      if (contactItems.length === 0) contactItems = [
        { icon: "phone", label: "Phone", value: "-" },
        { icon: "message-circle", label: "Line", value: "-" },
        { icon: "mail", label: "Email", value: "-" },
      ];
      var cLayout = d.layout || "vertical";
      var cRows;
      if (cLayout === "horizontal") {
        cRows = contactItems.map(function (ci) {
          return '<div style="flex:1;text-align:center;padding:10px 6px;background:' + cBg + ';border-radius:10px;">' +
            '<div style="width:28px;height:28px;background:rgba(20,184,166,0.12);border-radius:8px;display:flex;align-items:center;justify-content:center;margin:0 auto 4px;color:' + cIc + ';"><i data-lucide="' + ci.icon + '" style="width:14px;height:14px;"></i></div>' +
            '<div style="font-size:7px;color:' + cTx + ';opacity:0.5;">' + ci.label + '</div>' +
            '<div style="font-size:8px;font-weight:700;color:' + cTx + ';">' + escapeHtml(ci.value) + '</div></div>';
        }).join("");
        return '<div style="padding:16px;">' +
          '<h3 style="font-size:12px;font-weight:800;color:' + (d.titleColor || '#fff') + ';text-align:center;margin-bottom:10px;">' + escapeHtml(d.title || "Contact Us") + '</h3>' +
          '<div style="display:flex;gap:4px;">' + cRows + '</div></div>';
      } else {
        cRows = contactItems.map(function (ci) {
          return '<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:' + cBg + ';border-radius:10px;">' +
            '<div style="width:28px;height:28px;background:rgba(20,184,166,0.12);border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:' + cIc + ';"><i data-lucide="' + ci.icon + '" style="width:14px;height:14px;"></i></div>' +
            '<div><div style="font-size:7px;color:' + cTx + ';opacity:0.5;">' + ci.label + '</div>' +
            '<div style="font-size:9px;font-weight:700;color:' + cTx + ';">' + escapeHtml(ci.value) + '</div></div></div>';
        }).join("");
        return '<div style="padding:16px;">' +
          '<h3 style="font-size:12px;font-weight:800;color:' + (d.titleColor || '#fff') + ';text-align:center;margin-bottom:10px;">' + escapeHtml(d.title || "Contact Us") + '</h3>' +
          '<div style="display:flex;flex-direction:column;gap:4px;">' + cRows + '</div></div>';
      }

    case "cta":
      return '<div class="block-preview-cta" style="background:' + (d.bgColor || '#0f172a') + ';">' +
        '<h3 style="color:' + (d.fontColor || '#fff') + ';">' + escapeHtml(d.heading || "Call to Action") + '</h3>' +
        '<p style="color:' + (d.descColor || d.fontColor || '#fff') + ';opacity:0.7;">' + escapeHtml(d.description || "Description text") + '</p>' +
        '<span class="cta-button" style="background:' + (d.btnColor || '#14b8a6') + ';color:' + (d.btnFontColor || '#fff') + ';">' + escapeHtml(d.buttonText || "Click Here") + '</span>' +
        '</div>';

    case "header":
      var activeSlots = (d.navSlots || []).filter(function (s) { return s.name; });
      var navHtml = activeSlots.length > 0
        ? activeSlots.map(function (s) { return '<span>' + escapeHtml(s.name) + '</span>'; }).join("")
        : (d.navItems || []).map(function (item) { return '<span>' + escapeHtml(item) + '</span>'; }).join("");
      var lh = getLogoHeight(d.logoSize, true);
      var logoHtml = d.logoImage
        ? '<img src="' + escapeHtml(d.logoImage) + '" style="height:' + lh + 'px;border-radius:6px;" />'
        : '<div style="width:' + lh + 'px;height:' + lh + 'px;background:#ef4444;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:10px;color:#fff;">TL</div>';
      var hFontColor = d.fontColor || '#ffffff';
      return '<div class="block-preview-header" style="background:' + (d.bgColor || '#0a0a0a') + ';color:' + hFontColor + ';">' +
        '<div style="display:flex;align-items:center;gap:8px;">' + logoHtml + '<span class="header-logo" style="color:' + hFontColor + ';">' + escapeHtml(d.logoText || "LOGO") + '</span></div>' +
        '<div class="header-nav" style="color:' + hFontColor + ';">' + navHtml + '</div>' +
        '</div>';

    case "footer":
      return '<div class="block-preview-footer" style="background:' + (d.bgColor || '#0a0a0a') + ';color:' + (d.fontColor || '#ffffff') + ';">' + escapeHtml(d.text || "Footer text") + '</div>';

    case "spacer":
      return '<div class="block-preview-spacer" style="min-height:' + (d.height || 40) + 'px;">' +
        '<span>' + (d.height || 40) + 'px</span></div>';

    case "divider":
      return '<div class="block-preview-divider">' +
        '<hr style="border-top-style:' + (d.style || 'solid') + ';border-top-color:' + (d.color || '#e2e8f0') + ';" />' +
        '</div>';

    case "gallery":
      var gCols = d.columns || 4;
      var gH = d.imgHeight || 160;
      var gGap = d.gap || 8;
      var gRad = d.radius || 10;
      var gImgs = d.images || [];
      var gItems = "";
      if (gImgs.length > 0) {
        gImgs.forEach(function (img) {
          if (img) {
            gItems += '<div style="height:' + (gH / 2) + 'px;border-radius:' + gRad + 'px;overflow:hidden;"><img src="' + escapeHtml(img) + '" style="width:100%;height:100%;object-fit:cover;" /></div>';
          } else {
            gItems += '<div style="height:' + (gH / 2) + 'px;background:linear-gradient(135deg,#1a1a2e,#0f172a);border-radius:' + gRad + 'px;display:flex;align-items:center;justify-content:center;color:#334155;"><i data-lucide="image" style="width:16px;height:16px;"></i></div>';
          }
        });
      } else {
        for (var g = 0; g < gCols * 2; g++) {
          gItems += '<div style="height:' + (gH / 2) + 'px;background:linear-gradient(135deg,#1a1a2e,#0f172a);border-radius:' + gRad + 'px;"></div>';
        }
      }
      return '<div style="padding:16px;">' +
        '<h3 style="font-size:12px;font-weight:800;color:' + (d.titleColor || '#fff') + ';text-align:center;margin-bottom:10px;">' + escapeHtml(d.title || "Gallery") + '</h3>' +
        '<div style="display:grid;grid-template-columns:repeat(' + gCols + ',1fr);gap:' + gGap + 'px;">' + gItems + '</div></div>';

    case "video":
      var vidEmbed = getYouTubeEmbedUrl(d.url);
      if (vidEmbed) {
        return '<div class="block-preview-video">' +
          '<iframe src="' + vidEmbed + '" style="width:100%;height:100%;border:none;border-radius:8px;" allowfullscreen></iframe>' +
          '</div>';
      }
      return '<div class="block-preview-video">' +
        '<div class="video-placeholder"><i data-lucide="play-circle"></i></div>' +
        '</div>';

    case "cards":
      var cCols = d.columns || 3;
      var ccBg = d.cardBg || "#111";
      var ccTitleColor = d.titleColor || "#fff";
      var ccDescColor = d.descColor || "#94a3b8";
      var ccRad = d.cardRadius || 16;
      var ccImgH = d.imgHeight || 140;
      var cardItems = (d.cards || []).map(function (card) {
        var imgHtml = card.image
          ? '<img src="' + escapeHtml(card.image) + '" style="width:100%;height:' + (ccImgH / 2) + 'px;object-fit:cover;" />'
          : '<div style="width:100%;height:' + (ccImgH / 2) + 'px;background:linear-gradient(135deg,#1a1a2e,#0f172a);display:flex;align-items:center;justify-content:center;color:#334155;"><i data-lucide="image" style="width:16px;height:16px;"></i></div>';
        return '<div style="background:' + ccBg + ';border-radius:' + ccRad + 'px;overflow:hidden;border:1px solid rgba(255,255,255,0.05);">' +
          imgHtml +
          '<div style="padding:8px 10px;">' +
          '<div style="font-size:10px;font-weight:700;color:' + ccTitleColor + ';">' + escapeHtml(card.title || "") + '</div>' +
          '<div style="font-size:8px;color:' + ccDescColor + ';margin-top:2px;">' + escapeHtml(card.desc || "") + '</div>' +
          '</div></div>';
      }).join("");
      return '<div style="padding:16px;">' +
        '<div style="display:grid;grid-template-columns:repeat(' + cCols + ',1fr);gap:10px;">' + cardItems + '</div>' +
        '</div>';

    case "carousel":
      var csH = d.slideHeight || 200;
      var csW = d.slideWidth || "100%";
      var csRad = d.slideRadius || 10;
      var csSlides = d.slides || [];
      var csId = 'carousel-' + (block.id || Math.random().toString(36).substr(2, 5));
      var slidesHtml = '';
      csSlides.forEach(function (slide, idx) {
        var vis = idx === 0 ? '' : 'display:none;';
        if (slide.image) {
          slidesHtml += '<div class="carousel-slide" style="' + vis + '"><img src="' + escapeHtml(slide.image) + '" style="width:100%;height:' + csH + 'px;object-fit:cover;border-radius:' + csRad + 'px;" /></div>';
        } else {
          slidesHtml += '<div class="carousel-slide" style="' + vis + '"><div style="width:100%;height:' + csH + 'px;background:linear-gradient(135deg,#6366f1,#4338ca);border-radius:' + csRad + 'px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:700;">' + escapeHtml(slide.caption || 'Slide ' + (idx + 1)) + '</div></div>';
        }
      });
      var dotCount = csSlides.length;
      var dotsHtml = '';
      for (var di = 0; di < dotCount; di++) {
        dotsHtml += '<div class="carousel-dot" style="width:6px;height:6px;border-radius:50%;background:' + (di === 0 ? '#6366f1' : '#cbd5e1') + ';cursor:pointer;"></div>';
      }
      var interval = (d.interval || 3) * 1000;
      var autoPlayJs = d.autoPlay !== false
        ? '<script>!function(){var c=document.getElementById("' + csId + '");if(!c)return;var s=c.querySelectorAll(".carousel-slide"),d=c.querySelectorAll(".carousel-dot"),i=0;function go(){s.forEach(function(e){e.style.display="none"});d.forEach(function(e){e.style.background="#cbd5e1"});i=(i+1)%s.length;s[i].style.display="";if(d[i])d[i].style.background="#6366f1";}setInterval(go,' + interval + ');}()<\/script>'
        : '';
      return '<div style="padding:16px;position:relative;width:' + csW + ';margin:0 auto;" id="' + csId + '">' +
        slidesHtml +
        '<div style="display:flex;justify-content:center;gap:4px;margin-top:8px;">' + dotsHtml + '</div>' +
        '</div>' + autoPlayJs;

    case "twocol":
      var ratioMap = { "50-50": ["1fr","1fr"], "60-40": ["3fr","2fr"], "40-60": ["2fr","3fr"], "70-30": ["7fr","3fr"], "30-70": ["3fr","7fr"] };
      var tcCols = ratioMap[d.ratio] || ["1fr","1fr"];
      var tcBg = d.colBg && d.colBg !== "transparent" ? "background:" + d.colBg + ";" : "";
      var tcPad = d.colPadding && d.colPadding !== "0" ? "padding:" + d.colPadding + "px;" : "";
      var tcRad = d.colRadius && d.colRadius !== "0" ? "border-radius:" + d.colRadius + "px;" : "";
      var tcColStyle = tcBg + tcPad + tcRad;
      var tcTitleC = d.titleColor || "#fff";
      var tcTextC = d.textColor || "#94a3b8";
      var tcGap = d.gap || 24;

      function renderTcCol(img, title, content) {
        var h = '';
        if (img) h += '<img src="' + escapeHtml(img) + '" style="width:100%;height:80px;object-fit:cover;border-radius:6px;margin-bottom:8px;" />';
        if (title) h += '<div style="font-size:11px;font-weight:800;color:' + tcTitleC + ';margin-bottom:4px;">' + escapeHtml(title) + '</div>';
        if (content) h += '<div style="font-size:9px;color:' + tcTextC + ';line-height:1.6;">' + escapeHtml(content) + '</div>';
        return '<div style="' + tcColStyle + '">' + (h || '<div style="color:#475569;font-size:9px;">Column</div>') + '</div>';
      }

      return '<div style="padding:16px;">' +
        '<div style="display:grid;grid-template-columns:' + tcCols.join(" ") + ';gap:' + tcGap + 'px;">' +
        renderTcCol(d.leftImage, d.leftTitle, d.leftContent) +
        renderTcCol(d.rightImage, d.rightTitle, d.rightContent) +
        '</div></div>';

    case "testimonial":
      var tmBg = d.cardBg || "#111";
      var tmTx = d.textColor || "#fff";
      var tmStar = d.starColor || "#f59e0b";
      var tmAccent = d.accentColor || "#6366f1";
      var tmCols = d.columns || 3;
      var revItems = (d.reviews || []).map(function (rev) {
        var stars = '';
        for (var s = 0; s < (rev.rating || 5); s++) stars += '&#9733;';
        var avatarHtml = rev.avatar
          ? '<img src="' + escapeHtml(rev.avatar) + '" style="width:28px;height:28px;border-radius:50%;object-fit:cover;" />'
          : '<div style="width:28px;height:28px;border-radius:50%;background:' + tmAccent + ';display:flex;align-items:center;justify-content:center;color:#fff;font-size:10px;font-weight:700;">' + (rev.name ? rev.name.charAt(0) : '?') + '</div>';
        return '<div style="background:' + tmBg + ';border-radius:12px;padding:14px;border:1px solid rgba(255,255,255,0.05);">' +
          '<div style="font-size:10px;color:' + tmStar + ';margin-bottom:6px;">' + stars + '</div>' +
          '<div style="font-size:9px;color:' + tmTx + ';opacity:0.8;font-style:italic;margin-bottom:8px;line-height:1.5;">"' + escapeHtml(rev.text || "") + '"</div>' +
          '<div style="display:flex;align-items:center;gap:6px;border-top:1px solid rgba(255,255,255,0.05);padding-top:8px;">' +
          avatarHtml +
          '<div><div style="font-size:9px;font-weight:700;color:' + tmTx + ';">' + escapeHtml(rev.name || "") + '</div>' +
          (rev.role ? '<div style="font-size:7px;color:' + tmTx + ';opacity:0.5;">' + escapeHtml(rev.role) + '</div>' : '') +
          '</div></div></div>';
      }).join("");
      return '<div style="padding:16px;">' +
        '<div style="display:grid;grid-template-columns:repeat(' + Math.min((d.reviews || []).length, tmCols) + ',1fr);gap:10px;">' + revItems + '</div>' +
        '</div>';

    default:
      return '<div style="padding:16px;color:#94a3b8;font-size:10px;">Unknown block: ' + block.type + '</div>';
  }
}

// ===================== Page CRUD =====================
function createNewPage() {
  var name = document.getElementById("inputPageName").value.trim();
  var slug = document.getElementById("inputPageSlug").value.trim();
  var template = document.getElementById("inputPageTemplate").value;
  var desc = document.getElementById("inputPageDesc").value.trim();

  if (!name) {
    document.getElementById("inputPageName").focus();
    return;
  }

  if (!slug) {
    slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  // สร้างใน Supabase
  createPageDB({
    name: name,
    slug: slug,
    status: "draft",
    template: template,
    description: desc,
  }).then(function (result) {
    if (!result || result.length === 0) throw new Error("Create failed");
    var newPage = result[0];
    var templateBlocks = getTemplateBlocks(template);

    // บันทึก template blocks ลง Supabase
    return saveBlocksDB(newPage.id, templateBlocks).then(function () {
      newPage.blocks = templateBlocks;
      newPage.lastModified = newPage.last_modified;
      pagesData.push(newPage);

      closeModalById("newPageModal");

      // Clear form
      document.getElementById("inputPageName").value = "";
      document.getElementById("inputPageSlug").value = "";
      document.getElementById("inputPageDesc").value = "";
      document.getElementById("inputPageTemplate").value = "blank";

      showEditorView();
      openEditor(newPage.id);
      showToast("Page Created!", name + " has been created");
    });
  }).catch(function (err) {
    console.error("Create page error:", err);
    showToast("Error", "ไม่สามารถสร้างหน้าได้");
  });
}

function getTemplateBlocks(template) {
  var headerBlock = { id: "b" + (nextBlockId++), type: "header", data: { logoText: "TOUR LONG", navItems: ["Home", "Products", "About", "Contact"] } };
  var footerBlock = { id: "b" + (nextBlockId++), type: "footer", data: { text: "© 2026 Tour Long. All rights reserved." } };

  switch (template) {
    case "landing":
      return [
        headerBlock,
        { id: "b" + (nextBlockId++), type: "hero", data: { title: "Page Title", subtitle: "Description here", buttonText: "Learn More", bgColor: "#0a0a0a" } },
        { id: "b" + (nextBlockId++), type: "features", data: { title: "Our Features", items: ["Feature 1", "Feature 2", "Feature 3", "Feature 4"] } },
        { id: "b" + (nextBlockId++), type: "cta", data: { heading: "Ready to start?", description: "Join us today", buttonText: "Get Started", buttonLink: "#" } },
        footerBlock,
      ];
    case "product":
      return [
        headerBlock,
        { id: "b" + (nextBlockId++), type: "products", data: { title: "Our Products", columns: 3, limit: 6 } },
        footerBlock,
      ];
    case "content":
      return [
        headerBlock,
        { id: "b" + (nextBlockId++), type: "text", data: { heading: "Page Title", content: "Content goes here..." } },
        footerBlock,
      ];
    default: // blank
      return [];
  }
}

function deleteCurrentPage() {
  var page = getCurrentPage();
  if (!page) return;

  if (pagesData.length <= 1) {
    showToast("Cannot Delete", "You must have at least one page");
    return;
  }

  showConfirm(
    "Delete Page",
    'Are you sure you want to delete "' + page.name + '"? This action cannot be undone.',
    function () {
      deletePageDB(page.id).then(function () {
        pagesData = pagesData.filter(function (p) { return p.id !== page.id; });
        closeModalById("pageSettingsModal");
        openEditor(pagesData[0].id);
        showToast("Page Deleted!", page.name + " has been removed");
      }).catch(function (err) {
        console.error("Delete error:", err);
        showToast("Error", "ไม่สามารถลบหน้าได้");
      });
    }
  );
}

// ===================== Save / Publish =====================
function saveDraft() {
  var page = getCurrentPage();
  if (!page) return;

  page.name = document.getElementById("editorPageTitle").value.trim() || page.name;
  var today = new Date().toISOString().split("T")[0];
  page.lastModified = today;

  // Clean bgSettings for save (remove _open)
  var bgToSave = Object.assign({}, page.bgSettings || {});
  delete bgToSave._open;

  // บันทึกลง Supabase
  Promise.all([
    updatePageDB(page.id, { name: page.name, last_modified: today, bg_settings: bgToSave }),
    saveBlocksDB(page.id, page.blocks),
  ]).then(function () {
    updatePageSelector();
    markClean();
    showToast("Draft Saved!", page.name + " has been saved");
  }).catch(function (err) {
    console.error("Save error:", err);
    showToast("Error", "ไม่สามารถบันทึกได้");
  });
}

function publishPage() {
  var page = getCurrentPage();
  if (!page) return;

  page.name = document.getElementById("editorPageTitle").value.trim() || page.name;
  page.status = "published";
  var today = new Date().toISOString().split("T")[0];
  page.lastModified = today;

  // บันทึกลง Supabase
  Promise.all([
    updatePageDB(page.id, { name: page.name, status: "published", last_modified: today, bg_settings: (function(){ var b = Object.assign({}, page.bgSettings || {}); delete b._open; return b; })() }),
    saveBlocksDB(page.id, page.blocks),
  ]).then(function () {
    updatePageSelector();

    // Open live site in new tab
    window.open("https://tour-long.com", "_blank");
    markClean();
    showToast("Page Published!", page.name + " is now live");
  }).catch(function (err) {
    console.error("Publish error:", err);
    showToast("Error", "ไม่สามารถ publish ได้");
  });
}

// ===================== Preview =====================
function openPreview() {
  var page = getCurrentPage();
  if (!page) return;

  openModalById("previewModal");

  var iframe = document.getElementById("previewFrame");
  var previewHtml = generatePreviewHtml(page);
  iframe.srcdoc = previewHtml;
}

function generatePreviewHtml(page) {
  var bg = page.bgSettings || {};
  var bgType = bg.type || "color";
  var bodyBg = "";
  var overlayHtml = "";

  if (bgType === "color") {
    bodyBg = "background:" + (bg.color || "#0a0a0a") + ";";
  } else if (bgType === "gradient") {
    var gCols = (bg.gradient || "#0a0a0a,#1e293b").split(",");
    bodyBg = "background:linear-gradient(" + (bg.gradientDir || "135deg") + "," + gCols[0] + "," + (gCols[1] || "#1e293b") + ");";
  } else if (bgType === "image" && bg.image) {
    var mode = bg.mode || "scroll";
    var attachment = mode === "fixed" || mode === "parallax" ? "fixed" : "scroll";
    bodyBg = "background:url('" + bg.image + "') center/cover no-repeat " + attachment + ";";
    if (mode === "parallax") {
      bodyBg += "background-attachment:fixed;";
    }
    var ov = bg.overlay !== undefined ? bg.overlay : 0.5;
    if (ov > 0) {
      overlayHtml = '<div style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,' + ov + ');pointer-events:none;z-index:0;"></div>';
    }
  } else {
    bodyBg = "background:#0a0a0a;";
  }

  var html = '<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">';
  html += '<script src="https://cdn.tailwindcss.com"><\/script>';
  html += '<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">';
  html += '<style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:"Plus Jakarta Sans",sans-serif;' + bodyBg + 'color:#fff;position:relative;min-height:100vh;}a{pointer-events:none;}.page-content{position:relative;z-index:1;}</style>';
  html += '</head><body>' + overlayHtml + '<div class="page-content">';

  page.blocks.forEach(function (block) {
    html += generatePreviewBlock(block);
  });

  html += '</div></body></html>';
  return html;
}

function generatePreviewBlock(block) {
  var d = block.data || {};

  switch (block.type) {
    case "header":
      var previewSlots = (d.navSlots || []).filter(function (s) { return s.name; });
      var navLinks = previewSlots.length > 0
        ? previewSlots.map(function (s) {
            var href = s.slug ? "/modules/frontend/page.html?slug=" + s.slug : "#";
            return '<a href="' + href + '" style="color:rgba(255,255,255,0.7);text-decoration:none;font-size:14px;">' + escapeHtml(s.name) + '</a>';
          }).join("")
        : (d.navItems || []).map(function (item) {
            var slugLink = item.toLowerCase().replace(/[^a-z0-9]+/g, "-");
            return '<a href="/modules/frontend/page.html?slug=' + slugLink + '" style="color:rgba(255,255,255,0.7);text-decoration:none;font-size:14px;">' + escapeHtml(item) + '</a>';
          }).join("");
      var plh = getLogoHeight(d.logoSize, false);
      var previewLogo = d.logoImage
        ? '<img src="' + escapeHtml(d.logoImage) + '" style="height:' + plh + 'px;border-radius:8px;" />'
        : '<div style="width:' + plh + 'px;height:' + plh + 'px;background:#ef4444;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;">TL</div>';
      var pFontColor = d.fontColor || '#ffffff';
      return '<header style="display:flex;align-items:center;justify-content:space-between;padding:20px 40px;background:' + (d.bgColor || '#0a0a0a') + ';color:' + pFontColor + ';">' +
        '<div style="display:flex;align-items:center;gap:10px;">' +
        previewLogo +
        '<span style="font-weight:800;font-size:18px;color:' + pFontColor + ';">' + escapeHtml(d.logoText || "LOGO") + '</span>' +
        '</div>' +
        '<nav style="display:flex;gap:24px;">' + navLinks.replace(/color:rgba\(255,255,255,0\.7\)/g, 'color:' + pFontColor) + '</nav>' +
        '</header>';

    case "hero":
      var heroLink = d.buttonLink && d.buttonLink !== "#" ? "/modules/frontend/page.html?slug=" + d.buttonLink : "#";
      var hFC = d.fontColor || '#ffffff';
      var hSC = d.subColor || hFC;
      return '<section style="background:' + (d.bgColor || '#0a0a0a') + ';padding:80px 40px;text-align:' + (d.textAlign || 'center') + ';">' +
        '<h1 style="font-size:48px;font-weight:800;margin-bottom:16px;color:' + hFC + ';">' + escapeHtml(d.title || "") + '</h1>' +
        '<p style="font-size:18px;color:' + hSC + ';opacity:0.7;margin-bottom:24px;max-width:600px;' + (d.textAlign === 'center' ? 'margin-left:auto;margin-right:auto;' : '') + '">' + escapeHtml(d.subtitle || "") + '</p>' +
        '<a href="' + heroLink + '" style="display:inline-block;background:' + (d.btnColor || '#ef4444') + ';color:' + (d.btnFontColor || '#fff') + ';padding:14px 36px;border-radius:999px;font-weight:700;text-decoration:none;">' + escapeHtml(d.buttonText || "Button") + '</a>' +
        '</section>';

    case "text":
      var fs = d.headingSize === "large" ? "36px" : d.headingSize === "small" ? "20px" : "28px";
      var tFC = d.fontColor || '#ffffff';
      var tCC = d.contentColor || tFC;
      var ptBtns = "";
      if (d.btn1Show) {
        var pb1Link = escapeHtml(d.btn1Link || "#");
        ptBtns += '<a href="' + pb1Link + '" style="display:inline-block;background:' + (d.btn1Color || '#ef4444') + ';color:' + (d.btn1FontColor || '#fff') + ';padding:12px 28px;border-radius:999px;font-weight:700;font-size:14px;text-decoration:none;">' + escapeHtml(d.btn1Text || 'Button') + '</a> ';
      }
      if (d.btn2Show) {
        var pb2Link = escapeHtml(d.btn2Link || "#");
        ptBtns += '<a href="' + pb2Link + '" style="display:inline-block;background:' + (d.btn2Color || '#222') + ';color:' + (d.btn2FontColor || '#fff') + ';padding:12px 28px;border-radius:999px;font-weight:700;font-size:14px;text-decoration:none;border:2px solid ' + (d.btn2FontColor || '#fff') + ';">' + escapeHtml(d.btn2Text || 'Button') + '</a>';
      }
      if (ptBtns) ptBtns = '<div style="margin-top:24px;">' + ptBtns + '</div>';
      var ptImgPos = d.imagePos || "none";
      var ptImgHtml = "";
      if (d.image && ptImgPos !== "none") {
        ptImgHtml = '<img src="' + escapeHtml(d.image) + '" style="width:100%;border-radius:12px;object-fit:cover;max-height:400px;" />';
      }
      var ptTextHtml = (d.heading ? '<h2 style="font-size:' + fs + ';font-weight:800;margin-bottom:16px;color:' + tFC + ';">' + escapeHtml(d.heading) + '</h2>' : '') +
        '<p style="font-size:16px;color:' + tCC + ';opacity:0.7;line-height:1.8;max-width:800px;' + (d.textAlign === 'center' ? 'margin:0 auto;' : '') + '">' + escapeHtml(d.content || "") + '</p>' + ptBtns;
      if (ptImgHtml && ptImgPos === "top") {
        return '<section style="padding:60px 40px;text-align:' + (d.textAlign || 'left') + ';">' +
          ptImgHtml + '<div style="margin-top:24px;">' + ptTextHtml + '</div></section>';
      }
      if (ptImgHtml && (ptImgPos === "left" || ptImgPos === "right")) {
        var ptDir = ptImgPos === "right" ? "flex-direction:row-reverse;" : "";
        return '<section style="padding:60px 40px;"><div style="display:flex;gap:40px;align-items:center;max-width:1000px;margin:0 auto;' + ptDir + '">' +
          '<div style="flex:1;min-width:0;">' + ptImgHtml + '</div>' +
          '<div style="flex:1;min-width:0;text-align:' + (d.textAlign || 'left') + ';">' + ptTextHtml + '</div>' +
          '</div></section>';
      }
      return '<section style="padding:60px 40px;text-align:' + (d.textAlign || 'left') + ';">' + ptTextHtml + '</section>';

    case "products":
      var pCols = d.columns || 3;
      var pProds = getProductsForBlock(d);
      var pcBg = d.cardBg || "#111";
      var pcRad = d.cardRadius || 16;
      var piH = d.imgHeight || 120;
      var ppColor = d.priceColor || "#ef4444";
      var pCards = "";
      if (pProds.length > 0) {
        pProds.forEach(function (p) {
          var pImg = p.image
            ? '<img src="' + escapeHtml(p.image) + '" style="width:100%;height:' + piH + 'px;object-fit:cover;border-radius:' + Math.max(pcRad - 4, 0) + 'px;margin-bottom:12px;" />'
            : '<div style="width:100%;height:' + piH + 'px;background:#1a1a2e;border-radius:' + Math.max(pcRad - 4, 0) + 'px;margin-bottom:12px;"></div>';
          var pBtnHtml = d.showBtn === "true" ? '<a style="display:inline-block;background:' + (d.btnColor || '#14b8a6') + ';color:#fff;padding:8px 20px;border-radius:999px;font-size:12px;font-weight:700;text-decoration:none;margin-top:8px;">' + escapeHtml(d.btnText || 'Add to Cart') + '</a>' : '';
          pCards += '<div style="background:' + pcBg + ';border-radius:' + pcRad + 'px;padding:16px;text-align:center;">' +
            pImg +
            '<p style="font-weight:700;font-size:14px;">' + escapeHtml(p.name) + '</p>' +
            '<p style="color:' + ppColor + ';font-weight:800;font-size:16px;margin-top:4px;">฿' + p.price + '</p>' +
            pBtnHtml +
            '</div>';
        });
      } else {
        for (var i = 0; i < Math.min(pCols, d.limit || 6); i++) {
          pCards += '<div style="background:' + pcBg + ';border-radius:' + pcRad + 'px;padding:16px;text-align:center;">' +
            '<div style="width:100%;height:' + piH + 'px;background:#1a1a2e;border-radius:' + Math.max(pcRad - 4, 0) + 'px;margin-bottom:12px;"></div>' +
            '<p style="font-weight:700;font-size:14px;">Product ' + (i + 1) + '</p>' +
            '<p style="color:' + ppColor + ';font-weight:800;font-size:16px;margin-top:4px;">฿0</p></div>';
        }
      }
      return '<section style="padding:60px 40px;">' +
        '<h2 style="font-size:28px;font-weight:800;text-align:center;margin-bottom:32px;color:' + (d.titleColor || '#14b8a6') + ';">' + escapeHtml(d.title || "Products") + '</h2>' +
        '<div style="display:grid;grid-template-columns:repeat(' + pCols + ',1fr);gap:20px;max-width:900px;margin:0 auto;">' + pCards + '</div>' +
        '</section>';

    case "features":
      var pfFeats = d.features || (d.items || []).map(function (n) { return { name: n, desc: "", icon: "check" }; });
      var pfCardBg = d.cardBg || "#111";
      var pfIconColor = d.iconColor || "#14b8a6";
      var pfTextColor = d.textColor || "#fff";
      var pfCols = d.columns || 4;
      var pfItems = pfFeats.map(function (f) {
        return '<div style="text-align:center;padding:28px 20px;background:' + pfCardBg + ';border-radius:16px;border:1px solid rgba(255,255,255,0.05);">' +
          '<div style="width:56px;height:56px;background:linear-gradient(135deg,rgba(20,184,166,0.15),rgba(20,184,166,0.05));border-radius:14px;display:flex;align-items:center;justify-content:center;margin:0 auto 14px;">' +
          '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="' + pfIconColor + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>' +
          '</div>' +
          '<p style="font-weight:700;font-size:15px;color:' + pfTextColor + ';">' + escapeHtml(f.name) + '</p>' +
          (f.desc ? '<p style="font-size:12px;color:' + pfTextColor + ';opacity:0.5;margin-top:6px;">' + escapeHtml(f.desc) + '</p>' : '') +
          '</div>';
      }).join("");
      return '<section style="padding:60px 40px;">' +
        '<h2 style="font-size:28px;font-weight:800;text-align:center;margin-bottom:32px;color:' + (d.titleColor || '#fff') + ';">' + escapeHtml(d.title || "Features") + '</h2>' +
        '<div style="display:grid;grid-template-columns:repeat(' + pfCols + ',1fr);gap:20px;max-width:900px;margin:0 auto;">' + pfItems + '</div>' +
        '</section>';

    case "contact":
      var pcBg = d.cardBg || "#111";
      var pcIc = d.iconColor || "#14b8a6";
      var pcTx = d.textColor || "#fff";
      var pcItems = [];
      if (d.phone) pcItems.push({ emoji: "📞", label: "Phone", value: d.phone });
      if (d.line) pcItems.push({ emoji: "💬", label: "Line", value: d.line });
      if (d.email) pcItems.push({ emoji: "📧", label: "Email", value: d.email });
      if (d.address) pcItems.push({ emoji: "📍", label: "Address", value: d.address });
      if (d.website) pcItems.push({ emoji: "🌐", label: "Website", value: d.website });
      if (d.facebook) pcItems.push({ emoji: "📘", label: "Facebook", value: d.facebook });
      var pcLayout = d.layout || "vertical";
      if (pcLayout === "horizontal") {
        var pcCols = pcItems.length <= 3 ? pcItems.length : 3;
        var pcCards = pcItems.map(function (ci) {
          return '<div style="background:' + pcBg + ';border-radius:16px;padding:28px 20px;text-align:center;border:1px solid rgba(255,255,255,0.05);">' +
            '<div style="width:56px;height:56px;background:linear-gradient(135deg,rgba(20,184,166,0.15),rgba(20,184,166,0.05));border-radius:14px;display:flex;align-items:center;justify-content:center;margin:0 auto 14px;font-size:24px;">' + ci.emoji + '</div>' +
            '<p style="font-size:12px;color:' + pcTx + ';opacity:0.5;margin-bottom:6px;">' + ci.label + '</p>' +
            '<p style="font-weight:700;font-size:15px;color:' + pcTx + ';">' + escapeHtml(ci.value) + '</p>' +
            '</div>';
        }).join("");
        return '<section style="padding:60px 40px;text-align:center;">' +
          '<h2 style="font-size:28px;font-weight:800;margin-bottom:32px;color:' + (d.titleColor || '#fff') + ';">' + escapeHtml(d.title || "Contact") + '</h2>' +
          '<div style="display:grid;grid-template-columns:repeat(' + pcCols + ',1fr);gap:20px;max-width:800px;margin:0 auto;">' + pcCards + '</div>' +
          '</section>';
      } else {
        var pcRows = pcItems.map(function (ci) {
          return '<div style="display:flex;align-items:center;gap:16px;padding:16px 20px;background:' + pcBg + ';border-radius:12px;border:1px solid rgba(255,255,255,0.05);">' +
            '<div style="width:48px;height:48px;background:linear-gradient(135deg,rgba(20,184,166,0.15),rgba(20,184,166,0.05));border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:22px;">' + ci.emoji + '</div>' +
            '<div><p style="font-size:12px;color:' + pcTx + ';opacity:0.5;margin-bottom:4px;">' + ci.label + '</p>' +
            '<p style="font-weight:700;font-size:16px;color:' + pcTx + ';">' + escapeHtml(ci.value) + '</p></div></div>';
        }).join("");
        return '<section style="padding:60px 40px;">' +
          '<h2 style="font-size:28px;font-weight:800;text-align:center;margin-bottom:32px;color:' + (d.titleColor || '#fff') + ';">' + escapeHtml(d.title || "Contact") + '</h2>' +
          '<div style="display:flex;flex-direction:column;gap:12px;max-width:600px;margin:0 auto;">' + pcRows + '</div>' +
          '</section>';
      }

    case "cta":
      var cFC = d.fontColor || '#ffffff';
      var cDC = d.descColor || cFC;
      return '<section style="padding:60px 40px;text-align:center;background:' + (d.bgColor || 'linear-gradient(135deg,#0f172a,#1e293b)') + ';">' +
        '<h2 style="font-size:32px;font-weight:800;margin-bottom:12px;color:' + cFC + ';">' + escapeHtml(d.heading || "CTA") + '</h2>' +
        '<p style="font-size:16px;color:' + cDC + ';opacity:0.7;margin-bottom:24px;">' + escapeHtml(d.description || "") + '</p>' +
        '<a href="' + escapeHtml(d.buttonLink || "#") + '" style="display:inline-block;background:' + (d.btnColor || '#14b8a6') + ';color:' + (d.btnFontColor || '#fff') + ';padding:14px 36px;border-radius:999px;font-weight:700;text-decoration:none;">' + escapeHtml(d.buttonText || "Button") + '</a>' +
        '</section>';

    case "footer":
      return '<footer style="padding:32px 40px;background:' + (d.bgColor || '#0a0a0a') + ';text-align:center;border-top:1px solid #1e293b;">' +
        '<p style="color:' + (d.fontColor || 'rgba(255,255,255,0.5)') + ';font-size:13px;">' + escapeHtml(d.text || "") + '</p>' +
        '</footer>';

    case "spacer":
      return '<div style="height:' + (d.height || 40) + 'px;"></div>';

    case "divider":
      return '<div style="padding:0 40px;"><hr style="border:none;border-top:2px ' + (d.style || 'solid') + ' ' + (d.color || '#1e293b') + ';margin:20px 0;" /></div>';

    case "image":
      if (d.src) {
        var imgMaxW = d.size === "small" ? "400px" : d.size === "medium" ? "600px" : "100%";
        var pImgBg = d.bgColor && d.bgColor !== "transparent" ? 'background:' + d.bgColor + ';' : '';
        return '<section style="padding:40px;text-align:' + (d.align || 'center') + ';' + pImgBg + '">' +
          '<img src="' + escapeHtml(d.src) + '" alt="' + escapeHtml(d.alt || '') + '" style="max-width:' + imgMaxW + ';width:100%;border-radius:' + (d.borderRadius || '10') + 'px;' + (d.align === 'center' ? 'margin:0 auto;display:block;' : '') + '" />' +
          '</section>';
      }
      return '';

    case "imagetext":
      var pitLayout = d.layout || "image-left";
      var pitBg = d.bgColor && d.bgColor !== "transparent" ? 'background:' + d.bgColor + ';' : '';
      var pitRad = d.imgRadius || 16;
      var pitImgH = d.imgHeight || 300;
      var pitBtns = "";
      if (d.btn1Show) {
        var pb1Link = d.btn1Link && d.btn1Link !== "#" ? "/modules/frontend/page.html?slug=" + d.btn1Link : "#";
        pitBtns += '<a href="' + pb1Link + '" style="display:inline-block;background:' + (d.btn1Color || '#ef4444') + ';color:' + (d.btn1FontColor || '#fff') + ';padding:12px 28px;border-radius:999px;font-weight:700;font-size:14px;text-decoration:none;">' + escapeHtml(d.btn1Text || 'Button') + '</a> ';
      }
      if (d.btn2Show) {
        var pb2Link = d.btn2Link && d.btn2Link !== "#" ? "/modules/frontend/page.html?slug=" + d.btn2Link : "#";
        pitBtns += '<a href="' + pb2Link + '" style="display:inline-block;background:' + (d.btn2Color || '#222') + ';color:' + (d.btn2FontColor || '#fff') + ';padding:12px 28px;border-radius:999px;font-weight:700;font-size:14px;text-decoration:none;border:2px solid ' + (d.btn2FontColor || '#fff') + ';">' + escapeHtml(d.btn2Text || 'Button') + '</a>';
      }
      if (pitBtns) pitBtns = '<div style="margin-top:24px;">' + pitBtns + '</div>';
      var pitImg = d.image
        ? '<img src="' + escapeHtml(d.image) + '" style="width:100%;height:' + pitImgH + 'px;object-fit:cover;border-radius:' + pitRad + 'px;" />'
        : '<div style="width:100%;height:' + pitImgH + 'px;background:linear-gradient(135deg,#1a1a2e,#0f172a);border-radius:' + pitRad + 'px;"></div>';
      var pitText = '<div style="' + (pitLayout === 'image-top' ? 'text-align:center;' : '') + '">' +
        '<h2 style="font-size:28px;font-weight:800;margin-bottom:12px;color:' + (d.titleColor || '#fff') + ';">' + escapeHtml(d.title || "") + '</h2>' +
        '<p style="font-size:16px;line-height:1.8;color:' + (d.contentColor || '#94a3b8') + ';">' + escapeHtml(d.content || "") + '</p>' +
        pitBtns + '</div>';
      if (pitLayout === "image-top") {
        return '<section style="padding:60px 40px;max-width:800px;margin:0 auto;' + pitBg + '">' + pitImg + '<div style="margin-top:24px;">' + pitText + '</div></section>';
      }
      var pitDir = pitLayout === "image-right" ? "flex-direction:row-reverse;" : "";
      return '<section style="padding:60px 40px;' + pitBg + '">' +
        '<div style="display:flex;gap:40px;align-items:center;max-width:1000px;margin:0 auto;' + pitDir + '">' +
        '<div style="flex:1;min-width:0;">' + pitImg + '</div>' +
        '<div style="flex:1;min-width:0;">' + pitText + '</div>' +
        '</div></section>';

    case "gallery":
      var pgCols = d.columns || 4;
      var pgH = d.imgHeight || 160;
      var pgGap = d.gap || 8;
      var pgRad = d.radius || 10;
      var pgImgs = d.images || [];
      var pgItems = "";
      if (pgImgs.length > 0) {
        pgImgs.forEach(function (img) {
          if (img) {
            pgItems += '<div style="height:' + pgH + 'px;border-radius:' + pgRad + 'px;overflow:hidden;"><img src="' + escapeHtml(img) + '" style="width:100%;height:100%;object-fit:cover;" /></div>';
          } else {
            pgItems += '<div style="height:' + pgH + 'px;background:linear-gradient(135deg,#111,#1a1a2e);border-radius:' + pgRad + 'px;"></div>';
          }
        });
      } else {
        for (var pg = 0; pg < pgCols * 2; pg++) {
          pgItems += '<div style="height:' + pgH + 'px;background:linear-gradient(135deg,#111,#1a1a2e);border-radius:' + pgRad + 'px;"></div>';
        }
      }
      return '<section style="padding:60px 40px;">' +
        '<h2 style="font-size:28px;font-weight:800;text-align:center;margin-bottom:32px;color:' + (d.titleColor || '#fff') + ';">' + escapeHtml(d.title || "Gallery") + '</h2>' +
        '<div style="display:grid;grid-template-columns:repeat(' + pgCols + ',1fr);gap:' + pgGap + 'px;max-width:900px;margin:0 auto;">' + pgItems + '</div>' +
        '</section>';

    case "video":
      var pVidEmbed = getYouTubeEmbedUrl(d.url);
      if (pVidEmbed) {
        return '<section style="padding:40px;">' +
          '<div style="max-width:800px;margin:0 auto;border-radius:16px;overflow:hidden;aspect-ratio:16/9;">' +
          '<iframe src="' + pVidEmbed + '" style="width:100%;height:100%;border:none;" allowfullscreen></iframe>' +
          '</div></section>';
      }
      return '<section style="padding:60px 40px;text-align:center;">' +
        '<div style="max-width:800px;margin:0 auto;height:400px;background:#111;border-radius:16px;display:flex;align-items:center;justify-content:center;">' +
        '<span style="font-size:48px;opacity:0.3;">▶</span>' +
        '</div></section>';

    case "cards":
      var pcCols = d.columns || 3;
      var pccBg = d.cardBg || "#111";
      var pccTitleC = d.titleColor || "#fff";
      var pccDescC = d.descColor || "#94a3b8";
      var pccBtnC = d.btnColor || "#6366f1";
      var pccRad = d.cardRadius || 16;
      var pccImgH = d.imgHeight || 140;
      var pcCards = (d.cards || []).map(function (card) {
        var cImg = card.image
          ? '<img src="' + escapeHtml(card.image) + '" style="width:100%;height:' + pccImgH + 'px;object-fit:cover;" />'
          : '<div style="width:100%;height:' + pccImgH + 'px;background:linear-gradient(135deg,#1a1a2e,#0f172a);"></div>';
        var cLink = card.link && card.link !== "#" ? "/modules/frontend/page.html?slug=" + card.link : "#";
        return '<div style="background:' + pccBg + ';border-radius:' + pccRad + 'px;overflow:hidden;text-align:center;border:1px solid rgba(255,255,255,0.05);">' +
          cImg +
          '<div style="padding:20px;">' +
          '<p style="font-weight:700;font-size:16px;margin-bottom:6px;color:' + pccTitleC + ';">' + escapeHtml(card.title || "") + '</p>' +
          '<p style="font-size:13px;color:' + pccDescC + ';margin-bottom:14px;line-height:1.5;">' + escapeHtml(card.desc || "") + '</p>' +
          '<a href="' + cLink + '" style="display:inline-block;background:' + pccBtnC + ';color:#fff;padding:10px 24px;border-radius:999px;font-size:12px;font-weight:700;text-decoration:none;">Read More</a>' +
          '</div></div>';
      }).join("");
      return '<section style="padding:60px 40px;">' +
        '<div style="display:grid;grid-template-columns:repeat(' + pcCols + ',1fr);gap:20px;max-width:1000px;margin:0 auto;">' + pcCards + '</div>' +
        '</section>';

    case "carousel":
      var pcsH = d.slideHeight ? (parseInt(d.slideHeight) * 2.5) : 400;
      var pcsRad = d.slideRadius || 16;
      var pcsSlides = d.slides || [];
      var pcsId = 'pcs-' + Math.random().toString(36).substr(2, 5);
      var pcsSlidesHtml = '';
      pcsSlides.forEach(function (slide, idx) {
        var vis = idx === 0 ? '' : 'display:none;';
        if (slide.image) {
          pcsSlidesHtml += '<div class="pcs-slide" style="' + vis + '"><img src="' + escapeHtml(slide.image) + '" style="width:100%;height:' + pcsH + 'px;object-fit:cover;border-radius:' + pcsRad + 'px;" /></div>';
        } else {
          pcsSlidesHtml += '<div class="pcs-slide" style="' + vis + '"><div style="width:100%;height:' + pcsH + 'px;background:linear-gradient(135deg,#1a1a2e,#0f172a);border-radius:' + pcsRad + 'px;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:800;">' + escapeHtml(slide.caption || 'Slide') + '</div></div>';
        }
      });
      var pcsDotsHtml = '';
      for (var pdi = 0; pdi < pcsSlides.length; pdi++) {
        pcsDotsHtml += '<div class="pcs-dot" style="width:10px;height:10px;border-radius:50%;background:' + (pdi === 0 ? '#fff' : 'rgba(255,255,255,0.3)') + ';cursor:pointer;"></div>';
      }
      var pcsInterval = (d.interval || 3) * 1000;
      var pcsAutoJs = d.autoPlay !== false
        ? '<script>!function(){var c=document.getElementById("' + pcsId + '");if(!c)return;var s=c.querySelectorAll(".pcs-slide"),d=c.querySelectorAll(".pcs-dot"),i=0;function go(){s.forEach(function(e){e.style.display="none"});d.forEach(function(e){e.style.background="rgba(255,255,255,0.3)"});i=(i+1)%s.length;s[i].style.display="";if(d[i])d[i].style.background="#fff";}setInterval(go,' + pcsInterval + ');}()<\/script>'
        : '';
      var pcsW = d.slideWidth || "100%";
      return '<section style="padding:40px;width:' + pcsW + ';max-width:900px;margin:0 auto;position:relative;" id="' + pcsId + '">' +
        pcsSlidesHtml +
        '<div style="display:flex;justify-content:center;gap:6px;margin-top:12px;">' + pcsDotsHtml + '</div>' +
        '</section>' + pcsAutoJs;

    case "twocol":
      var pcRatioMap = { "50-50": ["1fr","1fr"], "60-40": ["3fr","2fr"], "40-60": ["2fr","3fr"], "70-30": ["7fr","3fr"], "30-70": ["3fr","7fr"] };
      var pcCols2 = pcRatioMap[d.ratio] || ["1fr","1fr"];
      var ptcBg = d.colBg && d.colBg !== "transparent" ? "background:" + d.colBg + ";" : "";
      var ptcPad = d.colPadding && d.colPadding !== "0" ? "padding:" + d.colPadding + "px;" : "padding:20px;";
      var ptcRad = d.colRadius && d.colRadius !== "0" ? "border-radius:" + d.colRadius + "px;" : "";
      var ptcColStyle = ptcBg + ptcPad + ptcRad;
      var ptcTitleC = d.titleColor || "#fff";
      var ptcTextC = d.textColor || "rgba(255,255,255,0.7)";
      var ptcGap = d.gap || 32;

      function renderPtcCol(img, title, content) {
        var h = '';
        if (img) h += '<img src="' + escapeHtml(img) + '" style="width:100%;border-radius:12px;margin-bottom:16px;" />';
        if (title) h += '<h2 style="font-size:28px;font-weight:800;margin-bottom:12px;color:' + ptcTitleC + ';">' + escapeHtml(title) + '</h2>';
        if (content) h += '<p style="font-size:16px;color:' + ptcTextC + ';line-height:1.8;">' + escapeHtml(content) + '</p>';
        return '<div style="' + ptcColStyle + '">' + h + '</div>';
      }

      return '<section style="padding:60px 40px;">' +
        '<div style="display:grid;grid-template-columns:' + pcCols2.join(" ") + ';gap:' + ptcGap + 'px;max-width:900px;margin:0 auto;">' +
        renderPtcCol(d.leftImage, d.leftTitle, d.leftContent) +
        renderPtcCol(d.rightImage, d.rightTitle, d.rightContent) +
        '</div></section>';

    case "testimonial":
      var ptmBg = d.cardBg || "#111";
      var ptmTx = d.textColor || "#fff";
      var ptmStar = d.starColor || "#f59e0b";
      var ptmAccent = d.accentColor || "#6366f1";
      var ptmCols = d.columns || 3;
      var pcRevs = (d.reviews || []).map(function (rev) {
        var pcStars = '';
        for (var ps = 0; ps < (rev.rating || 5); ps++) pcStars += '&#9733;';
        var pcAvatar = rev.avatar
          ? '<img src="' + escapeHtml(rev.avatar) + '" style="width:48px;height:48px;border-radius:50%;object-fit:cover;" />'
          : '<div style="width:48px;height:48px;border-radius:50%;background:' + ptmAccent + ';display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px;font-weight:700;">' + (rev.name ? rev.name.charAt(0) : '?') + '</div>';
        return '<div style="background:' + ptmBg + ';border-radius:16px;padding:28px;border:1px solid rgba(255,255,255,0.05);">' +
          '<div style="font-size:18px;color:' + ptmStar + ';margin-bottom:14px;">' + pcStars + '</div>' +
          '<p style="font-size:15px;color:' + ptmTx + ';opacity:0.85;font-style:italic;margin-bottom:20px;line-height:1.7;">"' + escapeHtml(rev.text || "") + '"</p>' +
          '<div style="display:flex;align-items:center;gap:12px;border-top:1px solid rgba(255,255,255,0.08);padding-top:16px;">' +
          pcAvatar +
          '<div><p style="font-weight:700;font-size:14px;color:' + ptmTx + ';">' + escapeHtml(rev.name || "") + '</p>' +
          (rev.role ? '<p style="font-size:12px;color:' + ptmTx + ';opacity:0.5;">' + escapeHtml(rev.role) + '</p>' : '') +
          '</div></div></div>';
      }).join("");
      return '<section style="padding:60px 40px;">' +
        '<div style="display:grid;grid-template-columns:repeat(' + Math.min((d.reviews || []).length, ptmCols) + ',1fr);gap:20px;max-width:900px;margin:0 auto;">' + pcRevs + '</div>' +
        '</section>';

    default:
      return '';
  }
}

// ===================== Events Binding =====================
function bindEvents() {
  // Delete selected block with Delete key
  document.addEventListener("keydown", function (e) {
    if (e.key === "Delete" && selectedBlockId) {
      var active = document.activeElement;
      var isTyping = active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable);
      if (!isTyping) {
        removeBlock(selectedBlockId);
      }
    }
  });

  // Sidebar collapse/expand
  var collapseBtn = document.getElementById("sidebarCollapseBtn");
  if (collapseBtn) {
    collapseBtn.addEventListener("click", function () {
      var sidebar = document.getElementById("mainSidebar");
      sidebar.classList.add("collapsed");
      // Create expand button
      var expandBtn = document.createElement("button");
      expandBtn.className = "sidebar-expand-btn";
      expandBtn.id = "sidebarExpandBtn";
      expandBtn.title = "แสดง Sidebar";
      expandBtn.innerHTML = '<i data-lucide="chevrons-right" style="width:14px;height:14px;"></i>';
      document.body.appendChild(expandBtn);
      if (typeof lucide !== "undefined") lucide.createIcons();
      expandBtn.addEventListener("click", function () {
        sidebar.classList.remove("collapsed");
        this.remove();
      });
    });
  }

  // Welcome Screen buttons
  var welcomeCreateBtn = document.getElementById("welcomeCreateBtn");
  if (welcomeCreateBtn) {
    welcomeCreateBtn.addEventListener("click", function () {
      openModalById("newPageModal");
    });
  }

  document.querySelectorAll(".welcome-template-card").forEach(function (card) {
    card.addEventListener("click", function () {
      var template = this.dataset.template;
      document.getElementById("inputPageTemplate").value = template;
      // Pre-fill name based on template
      var names = { landing: "Home Page", product: "Products", content: "About Us" };
      document.getElementById("inputPageName").value = names[template] || "";
      var slugs = { landing: "home-page", product: "products", content: "about" };
      document.getElementById("inputPageSlug").value = slugs[template] || "";
      openModalById("newPageModal");
    });
  });

  // Page Settings button
  document.getElementById("pageSettingsBtn").addEventListener("click", function () {
    var page = getCurrentPage();
    if (!page) return;
    document.getElementById("settingsPageTitle").value = page.name;
    document.getElementById("settingsPageSlug").value = page.slug;
    document.getElementById("settingsMetaDesc").value = page.description || "";
    document.getElementById("settingsStatus").checked = page.status === "published";
    document.getElementById("settingsStatusLabel").textContent = page.status === "published" ? "Published" : "Draft";
    openModalById("pageSettingsModal");
  });

  // Status toggle label update
  document.getElementById("settingsStatus").addEventListener("change", function () {
    document.getElementById("settingsStatusLabel").textContent = this.checked ? "Published" : "Draft";
  });

  // Save / Publish
  document.getElementById("saveDraftBtn").addEventListener("click", saveDraft);
  document.getElementById("publishBtn").addEventListener("click", publishPage);

  // Preview
  document.getElementById("previewBtn").addEventListener("click", openPreview);

  // Preview device buttons
  document.querySelectorAll(".preview-device").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".preview-device").forEach(function (b) { b.classList.remove("active"); });
      this.classList.add("active");
      var device = this.dataset.device;
      var wrapper = document.getElementById("previewFrameWrapper");
      wrapper.className = "preview-frame-wrapper" + (device !== "desktop" ? " " + device : "");
    });
  });

  // Title input -> update slug
  document.getElementById("editorPageTitle").addEventListener("input", function () {
    var page = getCurrentPage();
    if (page) {
      page.name = this.value;
      var slug = this.value.toLowerCase().replace(/[^a-z0-9ก-๙]+/g, "-").replace(/^-|-$/g, "");
      document.getElementById("editorPageSlug").textContent = "/" + (slug || "page-slug");
    }
  });
}

// ===================== Helpers =====================
function readNavSlots() {
  var slots = [];
  for (var i = 0; i < 10; i++) {
    var nameInput = document.querySelector('.nav-slot-input[data-slot="' + i + '"]');
    var pageSelect = document.querySelector('.nav-slot-page[data-slot="' + i + '"]');
    slots.push({
      name: nameInput ? nameInput.value.trim() : "",
      slug: pageSelect ? pageSelect.value : "",
    });
  }
  return slots;
}

function getLogoHeight(size, isCanvas) {
  // isCanvas = true → smaller for editor canvas, false → full size for preview/page
  var sizes = {
    small:  { canvas: 20, full: 28 },
    medium: { canvas: 28, full: 40 },
    large:  { canvas: 36, full: 56 },
    xlarge: { canvas: 48, full: 72 },
  };
  var s = sizes[size] || sizes.medium;
  return isCanvas ? s.canvas : s.full;
}

function getBlockTemplate(type) {
  if (typeof blockTemplates === "undefined") return null;
  return blockTemplates.find(function (t) { return t.type === type; });
}

function getProductsForBlock(d) {
  var mode = d.mode || "auto";
  if (mode === "manual") {
    var ids = d.selectedProducts || [];
    return allProducts.filter(function (p) { return ids.indexOf(p.id) !== -1; });
  }
  // auto mode
  var filtered = allProducts;
  if (d.categoryId) {
    filtered = allProducts.filter(function (p) { return String(p.category_id) === String(d.categoryId); });
  }
  return filtered.slice(0, d.limit || 6);
}

function getYouTubeEmbedUrl(url) {
  if (!url) return null;
  var match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (match) return "https://www.youtube.com/embed/" + match[1];
  return null;
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function showToast(title, msg) {
  var toast = document.getElementById("toast");
  document.getElementById("toastTitle").textContent = title;
  document.getElementById("toastMsg").textContent = msg || "";
  toast.classList.add("show");
  setTimeout(function () { toast.classList.remove("show"); }, 3000);
}

function showConfirm(title, message, onConfirm) {
  document.getElementById("confirmTitle").textContent = title;
  document.getElementById("confirmMessage").textContent = message;
  openModalById("confirmModal");

  var okBtn = document.getElementById("confirmOkBtn");
  var cancelBtn = document.getElementById("confirmCancelBtn");

  var handler = function () {
    closeModalById("confirmModal");
    okBtn.removeEventListener("click", handler);
    if (onConfirm) onConfirm();
  };

  var cancelHandler = function () {
    closeModalById("confirmModal");
    okBtn.removeEventListener("click", handler);
    cancelBtn.removeEventListener("click", cancelHandler);
  };

  okBtn.addEventListener("click", handler);
  cancelBtn.addEventListener("click", cancelHandler);
}

// Page settings modal
function savePageSettings() {
  var page = getCurrentPage();
  if (!page) return;

  page.name = document.getElementById("settingsPageTitle").value.trim() || page.name;
  page.slug = document.getElementById("settingsPageSlug").value.trim() || page.slug;
  page.description = document.getElementById("settingsMetaDesc").value.trim();
  page.status = document.getElementById("settingsStatus").checked ? "published" : "draft";

  updatePageDB(page.id, {
    name: page.name,
    slug: page.slug,
    description: page.description,
    status: page.status,
  }).then(function () {
    closeModalById("pageSettingsModal");
    updatePageSelector();
    document.getElementById("editorPageTitle").value = page.name;
    document.getElementById("editorPageSlug").textContent = "/" + page.slug;
    showToast("Settings Saved!", page.name);
  }).catch(function (err) {
    console.error("Save settings error:", err);
    showToast("Error", "ไม่สามารถบันทึกได้");
  });
}
