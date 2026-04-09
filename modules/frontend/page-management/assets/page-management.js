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
var nextBlockId = 100;

// ===================== Init =====================
document.addEventListener("DOMContentLoaded", function () {
  renderBlockLibrary();
  bindEvents();
  // โหลดข้อมูลจาก Supabase แล้วเปิด editor
  loadAllPages();
});

/** โหลด pages ทั้งหมดจาก Supabase แล้วเปิดหน้าแรก */
function loadAllPages() {
  fetchPages().then(function (pages) {
    // โหลด blocks สำหรับแต่ละ page
    var promises = pages.map(function (page) {
      return fetchBlocks(page.id).then(function (blocks) {
        page.blocks = blocks.map(function (b) {
          return { id: "b" + b.id, dbId: b.id, type: b.type, data: b.data };
        });
        page.lastModified = page.last_modified;
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
  updateSidebarPages();
}

function showEditorView() {
  document.getElementById("welcomeView").style.display = "none";
  document.getElementById("editorView").style.display = "";
  document.getElementById("editorView").style.flexDirection = "column";
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
    groups[groupName].forEach(function (block) {
      html += '<div class="block-library-item" draggable="true" data-block-type="' + block.type + '">';
      html += '<div class="block-library-icon ' + block.iconBg + '"><i data-lucide="' + block.icon + '"></i></div>';
      html += '<div class="block-library-info">';
      html += '<span class="block-library-name">' + block.name + '</span>';
      html += '<span class="block-library-desc">' + block.desc + '</span>';
      html += '</div>';
      if (block.tip) {
        html += '<div class="block-library-tip" title="' + escapeHtml(block.tip) + '">';
        html += '<i data-lucide="info" style="width:12px;height:12px;"></i>';
        html += '<div class="block-library-tip-popup">' + escapeHtml(block.tip) + '</div>';
        html += '</div>';
      }
      html += '</div>';
    });
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

  renderCanvasBlocks();
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
  html += '<div class="settings-section">';
  html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">';
  if (template) {
    html += '<div class="block-library-icon ' + template.iconBg + '" style="width:24px;height:24px;border-radius:6px;">';
    html += '<i data-lucide="' + template.icon + '" style="width:12px;height:12px;"></i>';
    html += '</div>';
  }
  html += '<span style="font-size:11px;font-weight:800;color:#1e293b;">' + (template ? template.name : block.type) + '</span>';
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
      var heroPageOptions = ["#"].concat(pagesData.map(function (p) { return p.slug; }));
      html += settingsSection("Content", [
        settingsField("Title", "text", "setting-title", data.title || ""),
        settingsField("Subtitle", "textarea", "setting-subtitle", data.subtitle || ""),
        settingsField("Button Text", "text", "setting-buttonText", data.buttonText || ""),
        settingsPageLinkField("Button Link", "setting-buttonLink", data.buttonLink || "#"),
      ]);
      html += settingsSection("Style", [
        settingsColorField("Background", "setting-bgColor", data.bgColor || "#0a0a0a"),
        settingsSelectField("Text Align", "setting-textAlign", data.textAlign || "center", ["left", "center", "right"]),
      ]);
      break;

    case "text":
      html += settingsSection("Content", [
        settingsField("Heading", "text", "setting-heading", data.heading || ""),
        settingsField("Content", "textarea", "setting-content", data.content || ""),
      ]);
      html += settingsSection("Style", [
        settingsSelectField("Heading Size", "setting-headingSize", data.headingSize || "medium", ["small", "medium", "large"]),
        settingsSelectField("Text Align", "setting-textAlign", data.textAlign || "left", ["left", "center", "right"]),
      ]);
      break;

    case "image":
      html += settingsSection("Image", [
        settingsField("Image URL", "text", "setting-src", data.src || ""),
        settingsField("Alt Text", "text", "setting-alt", data.alt || ""),
      ]);
      html += settingsSection("Style", [
        settingsSelectField("Size", "setting-size", data.size || "full", ["small", "medium", "full"]),
        settingsSelectField("Alignment", "setting-align", data.align || "center", ["left", "center", "right"]),
        settingsField("Border Radius (px)", "text", "setting-borderRadius", data.borderRadius || "10"),
      ]);
      break;

    case "products":
      html += settingsSection("Content", [
        settingsField("Section Title", "text", "setting-title", data.title || ""),
        settingsSelectField("Columns", "setting-columns", String(data.columns || 3), ["2", "3", "4"]),
        settingsField("Max Products", "text", "setting-limit", String(data.limit || 6)),
      ]);
      break;

    case "features":
      html += settingsSection("Content", [
        settingsField("Section Title", "text", "setting-title", data.title || ""),
        settingsField("Item 1", "text", "setting-item0", (data.items && data.items[0]) || ""),
        settingsField("Item 2", "text", "setting-item1", (data.items && data.items[1]) || ""),
        settingsField("Item 3", "text", "setting-item2", (data.items && data.items[2]) || ""),
        settingsField("Item 4", "text", "setting-item3", (data.items && data.items[3]) || ""),
      ]);
      break;

    case "contact":
      html += settingsSection("Content", [
        settingsField("Section Title", "text", "setting-title", data.title || ""),
        settingsField("Phone", "text", "setting-phone", data.phone || ""),
        settingsField("Line ID", "text", "setting-line", data.line || ""),
        settingsField("Email", "text", "setting-email", data.email || ""),
      ]);
      break;

    case "cta":
      html += settingsSection("Content", [
        settingsField("Heading", "text", "setting-heading", data.heading || ""),
        settingsField("Description", "textarea", "setting-description", data.description || ""),
        settingsField("Button Text", "text", "setting-buttonText", data.buttonText || ""),
        settingsPageLinkField("Button Link", "setting-buttonLink", data.buttonLink || "#"),
      ]);
      break;

    case "header":
      html += settingsSection("Logo", [
        settingsImageUpload("Logo Image", "setting-logoImage", data.logoImage || ""),
        settingsField("Logo Text", "text", "setting-logoText", data.logoText || ""),
        settingsSelectField("Logo Size", "setting-logoSize", data.logoSize || "medium", ["small", "medium", "large", "xlarge"]),
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
      break;

    case "spacer":
      html += settingsSection("Style", [
        settingsField("Height (px)", "text", "setting-height", String(data.height || 40)),
      ]);
      break;

    case "divider":
      html += settingsSection("Style", [
        settingsSelectField("Style", "setting-style", data.style || "solid", ["solid", "dashed", "dotted"]),
        settingsColorField("Color", "setting-color", data.color || "#e2e8f0"),
      ]);
      break;

    case "gallery":
      html += settingsSection("Content", [
        settingsField("Section Title", "text", "setting-title", data.title || ""),
        settingsSelectField("Columns", "setting-columns", String(data.columns || 4), ["2", "3", "4"]),
      ]);
      break;

    case "cards":
      html += settingsSection("Layout", [
        settingsSelectField("Columns", "setting-columns", String(data.columns || 3), ["2", "3", "4"]),
      ]);
      var cards = data.cards || [];
      for (var ci = 0; ci < cards.length; ci++) {
        html += settingsSection("Card " + (ci + 1), [
          settingsField("Title", "text", "setting-card-title-" + ci, cards[ci].title || ""),
          settingsField("Description", "textarea", "setting-card-desc-" + ci, cards[ci].desc || ""),
          settingsField("Image URL", "text", "setting-card-image-" + ci, cards[ci].image || ""),
          settingsPageLinkField("Link", "setting-card-link-" + ci, cards[ci].link || "#"),
        ]);
      }
      html += '<div class="settings-section"><button class="btn-outline btn-sm" style="width:100%;justify-content:center;" onclick="addCardItem()"><i data-lucide="plus" style="width:10px;height:10px;"></i> เพิ่มการ์ด</button></div>';
      break;

    case "carousel":
      html += settingsSection("Settings", [
        settingsSelectField("Auto Play", "setting-autoPlay", data.autoPlay ? "true" : "false", ["true", "false"]),
        settingsField("Interval (วินาที)", "text", "setting-interval", String(data.interval || 3)),
      ]);
      var slides = data.slides || [];
      for (var si = 0; si < slides.length; si++) {
        html += settingsSection("Slide " + (si + 1), [
          settingsField("Image URL", "text", "setting-slide-image-" + si, slides[si].image || ""),
          settingsField("Caption", "text", "setting-slide-caption-" + si, slides[si].caption || ""),
        ]);
      }
      html += '<div class="settings-section"><button class="btn-outline btn-sm" style="width:100%;justify-content:center;" onclick="addSlideItem()"><i data-lucide="plus" style="width:10px;height:10px;"></i> เพิ่ม Slide</button></div>';
      break;

    case "twocol":
      html += settingsSection("Layout", [
        settingsSelectField("Ratio", "setting-ratio", data.ratio || "50-50", ["50-50", "60-40", "40-60", "70-30", "30-70"]),
      ]);
      html += settingsSection("Left Column", [
        settingsField("Title", "text", "setting-leftTitle", data.leftTitle || ""),
        settingsField("Content", "textarea", "setting-leftContent", data.leftContent || ""),
      ]);
      html += settingsSection("Right Column", [
        settingsField("Title", "text", "setting-rightTitle", data.rightTitle || ""),
        settingsField("Content", "textarea", "setting-rightContent", data.rightContent || ""),
      ]);
      break;

    case "testimonial":
      var reviews = data.reviews || [];
      for (var ri = 0; ri < reviews.length; ri++) {
        html += settingsSection("Review " + (ri + 1), [
          settingsField("Name", "text", "setting-review-name-" + ri, reviews[ri].name || ""),
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
    return '<option value="' + opt + '"' + (opt === value ? ' selected' : '') + '>' + opt.charAt(0).toUpperCase() + opt.slice(1) + '</option>';
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
      updateBlockData(block);
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

  uploadFileToStorage(file, "logos").then(function (url) {
    // Set hidden input value
    var hidden = document.getElementById(fieldId);
    if (hidden) hidden.value = url;

    // Update block data
    updateBlockData(block);

    // Re-render settings to show preview
    renderBlockSettings();
  }).catch(function (err) {
    console.error("Upload error:", err);
    showToast("Upload Failed", "ไม่สามารถอัพโหลดรูปได้");
    if (dropzone) {
      dropzone.innerHTML = '<i data-lucide="upload" style="width:20px;height:20px;margin-bottom:4px;"></i><span>Drag & drop or click</span>';
    }
  });
}

// Add item functions for dynamic lists
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
  var data = block.data;

  switch (block.type) {
    case "hero":
      data.title = getVal("setting-title");
      data.subtitle = getVal("setting-subtitle");
      data.buttonText = getVal("setting-buttonText");
      data.buttonLink = getVal("setting-buttonLink") || "#";
      data.bgColor = getVal("setting-bgColor") || data.bgColor;
      data.textAlign = getVal("setting-textAlign") || data.textAlign;
      break;
    case "text":
      data.heading = getVal("setting-heading");
      data.content = getVal("setting-content");
      data.headingSize = getVal("setting-headingSize") || data.headingSize;
      data.textAlign = getVal("setting-textAlign") || data.textAlign;
      break;
    case "image":
      data.src = getVal("setting-src");
      data.alt = getVal("setting-alt");
      data.size = getVal("setting-size") || data.size;
      data.align = getVal("setting-align") || data.align;
      data.borderRadius = getVal("setting-borderRadius") || data.borderRadius;
      break;
    case "products":
      data.title = getVal("setting-title");
      data.columns = parseInt(getVal("setting-columns")) || data.columns;
      data.limit = parseInt(getVal("setting-limit")) || data.limit;
      break;
    case "features":
      data.title = getVal("setting-title");
      data.items = [
        getVal("setting-item0"),
        getVal("setting-item1"),
        getVal("setting-item2"),
        getVal("setting-item3"),
      ].filter(Boolean);
      break;
    case "contact":
      data.title = getVal("setting-title");
      data.phone = getVal("setting-phone");
      data.line = getVal("setting-line");
      data.email = getVal("setting-email");
      break;
    case "cta":
      data.heading = getVal("setting-heading");
      data.description = getVal("setting-description");
      data.buttonText = getVal("setting-buttonText");
      data.buttonLink = getVal("setting-buttonLink");
      break;
    case "header":
      data.logoImage = getVal("setting-logoImage");
      data.logoText = getVal("setting-logoText");
      data.logoSize = getVal("setting-logoSize") || "medium";
      data.navSlots = readNavSlots();
      // Keep navItems for backward compat
      data.navItems = data.navSlots.filter(function (s) { return s.name; }).map(function (s) { return s.name; });
      break;
    case "footer":
      data.text = getVal("setting-text");
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
      data.columns = parseInt(getVal("setting-columns")) || data.columns;
      break;
    case "cards":
      data.columns = parseInt(getVal("setting-columns")) || data.columns;
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
      data.leftTitle = getVal("setting-leftTitle");
      data.leftContent = getVal("setting-leftContent");
      data.rightTitle = getVal("setting-rightTitle");
      data.rightContent = getVal("setting-rightContent");
      break;
    case "testimonial":
      var revCount = (data.reviews || []).length;
      data.reviews = [];
      for (var ri = 0; ri < revCount; ri++) {
        data.reviews.push({
          name: getVal("setting-review-name-" + ri),
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
        '<h2>' + escapeHtml(d.title || "Hero Title") + '</h2>' +
        '<p>' + escapeHtml(d.subtitle || "Subtitle text here") + '</p>' +
        '<span class="hero-cta">' + escapeHtml(d.buttonText || "Button") + '</span>' +
        '</div>';

    case "text":
      var hSize = d.headingSize === "large" ? "18px" : d.headingSize === "small" ? "12px" : "14px";
      return '<div class="block-preview-text" style="text-align:' + (d.textAlign || 'left') + ';">' +
        (d.heading ? '<h3 style="font-size:' + hSize + ';">' + escapeHtml(d.heading) + '</h3>' : '') +
        '<p>' + escapeHtml(d.content || "Text content here...") + '</p>' +
        '</div>';

    case "image":
      if (d.src) {
        return '<div class="block-preview-image" style="text-align:' + (d.align || 'center') + ';">' +
          '<img src="' + escapeHtml(d.src) + '" alt="' + escapeHtml(d.alt || '') + '" style="border-radius:' + (d.borderRadius || 10) + 'px;max-width:' + (d.size === 'small' ? '50%' : d.size === 'medium' ? '75%' : '100%') + ';" />' +
          '</div>';
      }
      return '<div class="block-preview-image"><div class="img-placeholder"><i data-lucide="image"></i></div></div>';

    case "products":
      var cols = d.columns || 3;
      var cards = "";
      for (var i = 0; i < Math.min(cols, d.limit || 6); i++) {
        cards += '<div class="product-card-preview">' +
          '<div class="product-img"></div>' +
          '<div class="product-name">Product ' + (i + 1) + '</div>' +
          '<div class="product-price">฿69</div>' +
          '</div>';
      }
      return '<div class="block-preview-products">' +
        '<h3>' + escapeHtml(d.title || "Products") + '</h3>' +
        '<div class="product-grid-preview" style="grid-template-columns:repeat(' + cols + ',1fr);">' + cards + '</div>' +
        '</div>';

    case "features":
      var items = d.items || ["Feature 1", "Feature 2", "Feature 3", "Feature 4"];
      var fIcons = ["shield-check", "sparkles", "truck", "star"];
      var featureCards = items.map(function (item, i) {
        return '<div class="feature-item">' +
          '<div class="feature-icon"><i data-lucide="' + (fIcons[i] || 'check') + '"></i></div>' +
          '<div class="feature-name">' + escapeHtml(item) + '</div>' +
          '</div>';
      }).join("");
      return '<div class="block-preview-features">' +
        '<h3>' + escapeHtml(d.title || "Features") + '</h3>' +
        '<div class="features-grid">' + featureCards + '</div>' +
        '</div>';

    case "contact":
      return '<div class="block-preview-contact">' +
        '<h3>' + escapeHtml(d.title || "Contact") + '</h3>' +
        '<div class="contact-cards">' +
        '<div class="contact-card"><i data-lucide="phone"></i><div class="contact-label">Phone</div><div class="contact-value">' + escapeHtml(d.phone || "-") + '</div></div>' +
        '<div class="contact-card"><i data-lucide="message-circle"></i><div class="contact-label">Line</div><div class="contact-value">' + escapeHtml(d.line || "-") + '</div></div>' +
        '<div class="contact-card"><i data-lucide="mail"></i><div class="contact-label">Email</div><div class="contact-value">' + escapeHtml(d.email || "-") + '</div></div>' +
        '</div></div>';

    case "cta":
      return '<div class="block-preview-cta">' +
        '<h3>' + escapeHtml(d.heading || "Call to Action") + '</h3>' +
        '<p>' + escapeHtml(d.description || "Description text") + '</p>' +
        '<span class="cta-button">' + escapeHtml(d.buttonText || "Click Here") + '</span>' +
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
      return '<div class="block-preview-header">' +
        '<div style="display:flex;align-items:center;gap:8px;">' + logoHtml + '<span class="header-logo">' + escapeHtml(d.logoText || "LOGO") + '</span></div>' +
        '<div class="header-nav">' + navHtml + '</div>' +
        '</div>';

    case "footer":
      return '<div class="block-preview-footer">' + escapeHtml(d.text || "Footer text") + '</div>';

    case "spacer":
      return '<div class="block-preview-spacer" style="min-height:' + (d.height || 40) + 'px;">' +
        '<span>' + (d.height || 40) + 'px</span></div>';

    case "divider":
      return '<div class="block-preview-divider">' +
        '<hr style="border-top-style:' + (d.style || 'solid') + ';border-top-color:' + (d.color || '#e2e8f0') + ';" />' +
        '</div>';

    case "gallery":
      var gCols = d.columns || 4;
      var gItems = "";
      for (var g = 0; g < gCols * 2; g++) {
        gItems += '<div class="gallery-item"></div>';
      }
      return '<div class="block-preview-gallery">' +
        '<h3>' + escapeHtml(d.title || "Gallery") + '</h3>' +
        '<div class="gallery-grid" style="grid-template-columns:repeat(' + gCols + ',1fr);">' + gItems + '</div>' +
        '</div>';

    case "video":
      return '<div class="block-preview-video">' +
        '<div class="video-placeholder"><i data-lucide="play-circle"></i></div>' +
        '</div>';

    case "cards":
      var cCols = d.columns || 3;
      var cardItems = (d.cards || []).map(function (card) {
        var imgHtml = card.image
          ? '<img src="' + escapeHtml(card.image) + '" style="width:100%;height:60px;object-fit:cover;border-radius:6px;margin-bottom:6px;" />'
          : '<div style="width:100%;height:60px;background:#e2e8f0;border-radius:6px;margin-bottom:6px;"></div>';
        return '<div style="background:#f8fafc;border-radius:10px;padding:12px;text-align:center;">' +
          imgHtml +
          '<div style="font-size:10px;font-weight:700;color:#1e293b;">' + escapeHtml(card.title || "") + '</div>' +
          '<div style="font-size:8px;color:#64748b;margin-top:2px;">' + escapeHtml(card.desc || "") + '</div>' +
          '</div>';
      }).join("");
      return '<div style="padding:16px;">' +
        '<div style="display:grid;grid-template-columns:repeat(' + cCols + ',1fr);gap:10px;">' + cardItems + '</div>' +
        '</div>';

    case "carousel":
      var firstSlide = (d.slides && d.slides[0]) || {};
      var slideImg = firstSlide.image
        ? '<img src="' + escapeHtml(firstSlide.image) + '" style="width:100%;height:160px;object-fit:cover;border-radius:10px;" />'
        : '<div style="width:100%;height:160px;background:linear-gradient(135deg,#6366f1,#4338ca);border-radius:10px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:700;">Slide 1</div>';
      var dotCount = (d.slides || []).length;
      var dotsHtml = '';
      for (var di = 0; di < dotCount; di++) {
        dotsHtml += '<div style="width:6px;height:6px;border-radius:50%;background:' + (di === 0 ? '#6366f1' : '#cbd5e1') + ';"></div>';
      }
      return '<div style="padding:16px;position:relative;">' +
        slideImg +
        '<div style="display:flex;justify-content:center;gap:4px;margin-top:8px;">' + dotsHtml + '</div>' +
        '<div style="position:absolute;top:50%;left:24px;transform:translateY(-50%);width:20px;height:20px;background:rgba(0,0,0,0.3);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:10px;">&#10094;</div>' +
        '<div style="position:absolute;top:50%;right:24px;transform:translateY(-50%);width:20px;height:20px;background:rgba(0,0,0,0.3);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:10px;">&#10095;</div>' +
        '</div>';

    case "twocol":
      var ratioMap = { "50-50": ["1fr","1fr"], "60-40": ["3fr","2fr"], "40-60": ["2fr","3fr"], "70-30": ["7fr","3fr"], "30-70": ["3fr","7fr"] };
      var cols = ratioMap[d.ratio] || ["1fr","1fr"];
      return '<div style="padding:16px;">' +
        '<div style="display:grid;grid-template-columns:' + cols.join(" ") + ';gap:12px;">' +
        '<div style="background:#f8fafc;border-radius:8px;padding:14px;">' +
          '<div style="font-size:11px;font-weight:800;color:#1e293b;margin-bottom:4px;">' + escapeHtml(d.leftTitle || "Left") + '</div>' +
          '<div style="font-size:9px;color:#64748b;line-height:1.5;">' + escapeHtml(d.leftContent || "") + '</div>' +
        '</div>' +
        '<div style="background:#f8fafc;border-radius:8px;padding:14px;">' +
          '<div style="font-size:11px;font-weight:800;color:#1e293b;margin-bottom:4px;">' + escapeHtml(d.rightTitle || "Right") + '</div>' +
          '<div style="font-size:9px;color:#64748b;line-height:1.5;">' + escapeHtml(d.rightContent || "") + '</div>' +
        '</div>' +
        '</div></div>';

    case "testimonial":
      var revItems = (d.reviews || []).map(function (rev) {
        var stars = '';
        for (var s = 0; s < (rev.rating || 5); s++) stars += '&#9733;';
        return '<div style="background:#f8fafc;border-radius:10px;padding:14px;text-align:center;">' +
          '<div style="font-size:12px;color:#f59e0b;margin-bottom:4px;">' + stars + '</div>' +
          '<div style="font-size:9px;color:#64748b;font-style:italic;margin-bottom:6px;">"' + escapeHtml(rev.text || "") + '"</div>' +
          '<div style="font-size:9px;font-weight:700;color:#1e293b;">' + escapeHtml(rev.name || "") + '</div>' +
          '</div>';
      }).join("");
      return '<div style="padding:16px;">' +
        '<div style="display:grid;grid-template-columns:repeat(' + Math.min((d.reviews || []).length, 3) + ',1fr);gap:10px;">' + revItems + '</div>' +
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

  // บันทึกลง Supabase
  Promise.all([
    updatePageDB(page.id, { name: page.name, last_modified: today }),
    saveBlocksDB(page.id, page.blocks),
  ]).then(function () {
    updatePageSelector();
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
    updatePageDB(page.id, { name: page.name, status: "published", last_modified: today }),
    saveBlocksDB(page.id, page.blocks),
  ]).then(function () {
    updatePageSelector();

    // Open preview modal to show published page
    openPreview();
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
  var html = '<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">';
  html += '<script src="https://cdn.tailwindcss.com"><\/script>';
  html += '<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">';
  html += '<style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:"Plus Jakarta Sans",sans-serif;background:#0a0a0a;color:#fff;}</style>';
  html += '</head><body>';

  page.blocks.forEach(function (block) {
    html += generatePreviewBlock(block);
  });

  html += '</body></html>';
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
      return '<header style="display:flex;align-items:center;justify-content:space-between;padding:20px 40px;background:#0a0a0a;">' +
        '<div style="display:flex;align-items:center;gap:10px;">' +
        previewLogo +
        '<span style="font-weight:800;font-size:18px;">' + escapeHtml(d.logoText || "LOGO") + '</span>' +
        '</div>' +
        '<nav style="display:flex;gap:24px;">' + navLinks + '</nav>' +
        '</header>';

    case "hero":
      var heroLink = d.buttonLink && d.buttonLink !== "#" ? "/modules/frontend/page.html?slug=" + d.buttonLink : "#";
      return '<section style="background:' + (d.bgColor || '#0a0a0a') + ';padding:80px 40px;text-align:' + (d.textAlign || 'center') + ';">' +
        '<h1 style="font-size:48px;font-weight:800;margin-bottom:16px;">' + escapeHtml(d.title || "") + '</h1>' +
        '<p style="font-size:18px;color:rgba(255,255,255,0.7);margin-bottom:24px;max-width:600px;' + (d.textAlign === 'center' ? 'margin-left:auto;margin-right:auto;' : '') + '">' + escapeHtml(d.subtitle || "") + '</p>' +
        '<a href="' + heroLink + '" style="display:inline-block;background:#ef4444;color:#fff;padding:14px 36px;border-radius:999px;font-weight:700;text-decoration:none;">' + escapeHtml(d.buttonText || "Button") + '</a>' +
        '</section>';

    case "text":
      var fs = d.headingSize === "large" ? "36px" : d.headingSize === "small" ? "20px" : "28px";
      return '<section style="padding:60px 40px;text-align:' + (d.textAlign || 'left') + ';">' +
        (d.heading ? '<h2 style="font-size:' + fs + ';font-weight:800;margin-bottom:16px;">' + escapeHtml(d.heading) + '</h2>' : '') +
        '<p style="font-size:16px;color:rgba(255,255,255,0.7);line-height:1.8;max-width:800px;' + (d.textAlign === 'center' ? 'margin:0 auto;' : '') + '">' + escapeHtml(d.content || "") + '</p>' +
        '</section>';

    case "products":
      var pCols = d.columns || 3;
      var pCards = "";
      for (var i = 0; i < Math.min(pCols, d.limit || 6); i++) {
        pCards += '<div style="background:#111;border-radius:16px;padding:16px;text-align:center;">' +
          '<div style="width:100%;height:120px;background:#1a1a2e;border-radius:12px;margin-bottom:12px;"></div>' +
          '<p style="font-weight:700;font-size:14px;">Product ' + (i + 1) + '</p>' +
          '<p style="color:#ef4444;font-weight:800;font-size:16px;margin-top:4px;">฿69</p>' +
          '</div>';
      }
      return '<section style="padding:60px 40px;">' +
        '<h2 style="font-size:28px;font-weight:800;text-align:center;margin-bottom:32px;">' + escapeHtml(d.title || "Products") + '</h2>' +
        '<div style="display:grid;grid-template-columns:repeat(' + pCols + ',1fr);gap:20px;max-width:900px;margin:0 auto;">' + pCards + '</div>' +
        '</section>';

    case "features":
      var fItems = (d.items || []).map(function (item) {
        return '<div style="text-align:center;padding:24px;background:#111;border-radius:16px;">' +
          '<div style="width:48px;height:48px;background:#1a1a2e;border-radius:12px;display:flex;align-items:center;justify-content:center;margin:0 auto 12px;color:#14b8a6;font-size:20px;">✓</div>' +
          '<p style="font-weight:700;font-size:14px;">' + escapeHtml(item) + '</p>' +
          '</div>';
      }).join("");
      return '<section style="padding:60px 40px;">' +
        '<h2 style="font-size:28px;font-weight:800;text-align:center;margin-bottom:32px;">' + escapeHtml(d.title || "Features") + '</h2>' +
        '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:20px;max-width:900px;margin:0 auto;">' + fItems + '</div>' +
        '</section>';

    case "contact":
      return '<section style="padding:60px 40px;text-align:center;">' +
        '<h2 style="font-size:28px;font-weight:800;margin-bottom:32px;">' + escapeHtml(d.title || "Contact") + '</h2>' +
        '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px;max-width:700px;margin:0 auto;">' +
        '<div style="background:#111;border-radius:16px;padding:24px;"><p style="color:#14b8a6;font-size:24px;margin-bottom:8px;">📞</p><p style="font-size:12px;color:rgba(255,255,255,0.5);margin-bottom:4px;">Phone</p><p style="font-weight:700;">' + escapeHtml(d.phone || "-") + '</p></div>' +
        '<div style="background:#111;border-radius:16px;padding:24px;"><p style="color:#14b8a6;font-size:24px;margin-bottom:8px;">💬</p><p style="font-size:12px;color:rgba(255,255,255,0.5);margin-bottom:4px;">Line</p><p style="font-weight:700;">' + escapeHtml(d.line || "-") + '</p></div>' +
        '<div style="background:#111;border-radius:16px;padding:24px;"><p style="color:#14b8a6;font-size:24px;margin-bottom:8px;">📧</p><p style="font-size:12px;color:rgba(255,255,255,0.5);margin-bottom:4px;">Email</p><p style="font-weight:700;">' + escapeHtml(d.email || "-") + '</p></div>' +
        '</div></section>';

    case "cta":
      return '<section style="padding:60px 40px;text-align:center;background:linear-gradient(135deg,#0f172a,#1e293b);">' +
        '<h2 style="font-size:32px;font-weight:800;margin-bottom:12px;">' + escapeHtml(d.heading || "CTA") + '</h2>' +
        '<p style="font-size:16px;color:rgba(255,255,255,0.7);margin-bottom:24px;">' + escapeHtml(d.description || "") + '</p>' +
        '<a href="' + escapeHtml(d.buttonLink || "#") + '" style="display:inline-block;background:#14b8a6;color:#fff;padding:14px 36px;border-radius:999px;font-weight:700;text-decoration:none;">' + escapeHtml(d.buttonText || "Button") + '</a>' +
        '</section>';

    case "footer":
      return '<footer style="padding:32px 40px;background:#0a0a0a;text-align:center;border-top:1px solid #1e293b;">' +
        '<p style="color:rgba(255,255,255,0.5);font-size:13px;">' + escapeHtml(d.text || "") + '</p>' +
        '</footer>';

    case "spacer":
      return '<div style="height:' + (d.height || 40) + 'px;"></div>';

    case "divider":
      return '<div style="padding:0 40px;"><hr style="border:none;border-top:2px ' + (d.style || 'solid') + ' ' + (d.color || '#1e293b') + ';margin:20px 0;" /></div>';

    case "gallery":
      var gCols = d.columns || 4;
      var gItems = "";
      for (var g = 0; g < gCols * 2; g++) {
        gItems += '<div style="height:120px;background:linear-gradient(135deg,#111,#1a1a2e);border-radius:12px;"></div>';
      }
      return '<section style="padding:60px 40px;">' +
        '<h2 style="font-size:28px;font-weight:800;text-align:center;margin-bottom:32px;">' + escapeHtml(d.title || "Gallery") + '</h2>' +
        '<div style="display:grid;grid-template-columns:repeat(' + gCols + ',1fr);gap:12px;max-width:900px;margin:0 auto;">' + gItems + '</div>' +
        '</section>';

    case "video":
      return '<section style="padding:60px 40px;text-align:center;">' +
        '<div style="max-width:800px;margin:0 auto;height:400px;background:#111;border-radius:16px;display:flex;align-items:center;justify-content:center;">' +
        '<span style="font-size:48px;opacity:0.3;">▶</span>' +
        '</div></section>';

    case "cards":
      var pcCols = d.columns || 3;
      var pcCards = (d.cards || []).map(function (card) {
        var cImg = card.image
          ? '<img src="' + escapeHtml(card.image) + '" style="width:100%;height:140px;object-fit:cover;border-radius:12px;margin-bottom:12px;" />'
          : '<div style="width:100%;height:140px;background:#1a1a2e;border-radius:12px;margin-bottom:12px;"></div>';
        var cLink = card.link && card.link !== "#" ? "/modules/frontend/page.html?slug=" + card.link : "#";
        return '<div style="background:#111;border-radius:16px;padding:20px;text-align:center;">' +
          cImg +
          '<p style="font-weight:700;font-size:16px;margin-bottom:4px;">' + escapeHtml(card.title || "") + '</p>' +
          '<p style="font-size:13px;color:rgba(255,255,255,0.6);margin-bottom:12px;">' + escapeHtml(card.desc || "") + '</p>' +
          '<a href="' + cLink + '" style="display:inline-block;background:#6366f1;color:#fff;padding:8px 20px;border-radius:999px;font-size:12px;font-weight:700;text-decoration:none;">Read More</a>' +
          '</div>';
      }).join("");
      return '<section style="padding:60px 40px;">' +
        '<div style="display:grid;grid-template-columns:repeat(' + pcCols + ',1fr);gap:20px;max-width:1000px;margin:0 auto;">' + pcCards + '</div>' +
        '</section>';

    case "carousel":
      var pcSlide = (d.slides && d.slides[0]) || {};
      var pcSlideImg = pcSlide.image
        ? '<img src="' + escapeHtml(pcSlide.image) + '" style="width:100%;height:400px;object-fit:cover;border-radius:16px;" />'
        : '<div style="width:100%;height:400px;background:linear-gradient(135deg,#1a1a2e,#0f172a);border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:800;">' + escapeHtml(pcSlide.caption || "Slide") + '</div>';
      return '<section style="padding:40px;max-width:900px;margin:0 auto;">' + pcSlideImg + '</section>';

    case "twocol":
      var pcRatioMap = { "50-50": ["1fr","1fr"], "60-40": ["3fr","2fr"], "40-60": ["2fr","3fr"], "70-30": ["7fr","3fr"], "30-70": ["3fr","7fr"] };
      var pcCols2 = pcRatioMap[d.ratio] || ["1fr","1fr"];
      return '<section style="padding:60px 40px;">' +
        '<div style="display:grid;grid-template-columns:' + pcCols2.join(" ") + ';gap:32px;max-width:900px;margin:0 auto;">' +
        '<div>' +
          (d.leftTitle ? '<h2 style="font-size:28px;font-weight:800;margin-bottom:12px;">' + escapeHtml(d.leftTitle) + '</h2>' : '') +
          '<p style="font-size:16px;color:rgba(255,255,255,0.7);line-height:1.8;">' + escapeHtml(d.leftContent || "") + '</p>' +
        '</div>' +
        '<div>' +
          (d.rightTitle ? '<h2 style="font-size:28px;font-weight:800;margin-bottom:12px;">' + escapeHtml(d.rightTitle) + '</h2>' : '') +
          '<p style="font-size:16px;color:rgba(255,255,255,0.7);line-height:1.8;">' + escapeHtml(d.rightContent || "") + '</p>' +
        '</div>' +
        '</div></section>';

    case "testimonial":
      var pcRevs = (d.reviews || []).map(function (rev) {
        var pcStars = '';
        for (var ps = 0; ps < (rev.rating || 5); ps++) pcStars += '&#9733;';
        return '<div style="background:#111;border-radius:16px;padding:28px;text-align:center;">' +
          '<div style="font-size:20px;color:#f59e0b;margin-bottom:12px;">' + pcStars + '</div>' +
          '<p style="font-size:15px;color:rgba(255,255,255,0.8);font-style:italic;margin-bottom:16px;line-height:1.6;">"' + escapeHtml(rev.text || "") + '"</p>' +
          '<p style="font-weight:700;font-size:14px;">' + escapeHtml(rev.name || "") + '</p>' +
          '</div>';
      }).join("");
      return '<section style="padding:60px 40px;">' +
        '<div style="display:grid;grid-template-columns:repeat(' + Math.min((d.reviews || []).length, 3) + ',1fr);gap:20px;max-width:900px;margin:0 auto;">' + pcRevs + '</div>' +
        '</section>';

    default:
      return '';
  }
}

// ===================== Events Binding =====================
function bindEvents() {
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
