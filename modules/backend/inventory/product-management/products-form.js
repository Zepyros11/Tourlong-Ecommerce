// ============================================================
// products-form.js — Add/Edit Product (Dynamic Blocks)
// ============================================================

var blockCounter = 0;
var allUnits = []; // units จาก DB สำหรับ dropdown
var allProducts = []; // products จาก DB สำหรับ auto SKU
var allCategories = []; // categories จาก DB

function generateBarcode() {
  // สร้าง EAN-13: prefix 885 (Thailand) + 9 หลักสุ่ม + check digit
  var maxNum = 0;
  // เช็คจาก DB
  allProducts.forEach(function (p) {
    var match = (p.barcode || "").match(/^885(\d{9})\d$/);
    if (match) { var n = parseInt(match[1], 10); if (n > maxNum) maxNum = n; }
  });
  // เช็คจาก fields ที่กรอกอยู่
  document.querySelectorAll(".b-barcode, .v-barcode").forEach(function (input) {
    var match = (input.value || "").match(/^885(\d{9})\d$/);
    if (match) { var n = parseInt(match[1], 10); if (n > maxNum) maxNum = n; }
  });
  var next = maxNum + 1;
  var body = "885" + String(next).padStart(9, "0"); // 12 digits
  // EAN-13 check digit
  var sum = 0;
  for (var i = 0; i < 12; i++) {
    sum += parseInt(body[i], 10) * (i % 2 === 0 ? 1 : 3);
  }
  var check = (10 - (sum % 10)) % 10;
  return body + check;
}

function renderBarcodeToSvg(container, val, opts) {
  try {
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    container.innerHTML = "";
    container.appendChild(svg);
    JsBarcode(svg, val, Object.assign({ format: "EAN13", displayValue: true }, opts));
  } catch (e) {
    try {
      var svg2 = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      container.innerHTML = "";
      container.appendChild(svg2);
      JsBarcode(svg2, val, Object.assign({ format: "CODE128", displayValue: true }, opts));
    } catch (e2) {
      container.innerHTML = '<span style="color:#cbd5e1;font-size:8px;">invalid</span>';
    }
  }
}

function renderBarcodePreview(input) {
  var preview = input.nextElementSibling;
  if (!preview || !preview.classList.contains("barcode-preview")) return;
  var val = (input.value || "").trim();
  if (!val) {
    preview.innerHTML = '';
    preview.style.display = 'none';
    return;
  }
  preview.style.display = 'inline-flex';
  renderBarcodeToSvg(preview, val, { width: 1, height: 20, fontSize: 0, margin: 1, displayValue: false });
}

function showBarcodePopup(input) {
  var val = (input.value || "").trim();
  if (!val) return;
  var overlay = document.createElement("div");
  overlay.className = "barcode-popup-overlay";
  function closePopup() { escClose.unregister(overlay); overlay.remove(); }
  overlay.onclick = closePopup;
  var popup = document.createElement("div");
  popup.className = "barcode-popup";
  popup.onclick = function (e) { e.stopPropagation(); };
  popup.innerHTML = '<div class="barcode-popup-header"><span style="font-size:11px;font-weight:700;color:#1e293b;">Barcode Preview</span><button class="barcode-popup-close">×</button></div><div class="barcode-popup-body"></div><p style="text-align:center;margin:6px 0 0;font-size:10px;color:#64748b;">' + val + '</p>';
  popup.querySelector(".barcode-popup-close").onclick = closePopup;
  overlay.appendChild(popup);
  document.body.appendChild(overlay);
  escClose.register(overlay, closePopup);
  renderBarcodeToSvg(popup.querySelector(".barcode-popup-body"), val, { width: 2, height: 80, fontSize: 14, margin: 10 });
}

function renderAllBarcodePreviews(blockEl) {
  blockEl.querySelectorAll(".b-barcode, .v-barcode").forEach(function (input) {
    renderBarcodePreview(input);
  });
}

function generateSku() {
  var maxNum = 0;
  // เช็คจาก DB
  allProducts.forEach(function (p) {
    var match = (p.sku || "").match(/^SKU-(\d+)/);
    if (match) { var n = parseInt(match[1], 10); if (n > maxNum) maxNum = n; }
  });
  // เช็คจาก blocks ที่กำลังกรอกอยู่ด้วย
  document.querySelectorAll(".b-sku").forEach(function (input) {
    var match = (input.value || "").match(/^SKU-(\d+)/);
    if (match) { var n = parseInt(match[1], 10); if (n > maxNum) maxNum = n; }
  });
  var next = maxNum + 1;
  return "SKU-" + String(next).padStart(5, "0");
}

// ============ Toast ============
function showToast(title, msg, onDone) {
  var toast = document.getElementById("toast");
  document.getElementById("toastTitle").textContent = title;
  document.getElementById("toastMsg").textContent = msg;
  lucide.createIcons();

  // เด้งลงมา
  toast.style.opacity = "1";
  toast.style.transform = "translateX(-50%) translateY(0)";

  // หายไปหลัง 2 วิ
  setTimeout(function() {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(-50%) translateY(-100px)";
    if (onDone) setTimeout(onDone, 400);
  }, 2000);
}
function buildCategoryOptions() {
  var active = allCategories.filter(function(c) { return c.status === "active"; });
  if (!active.length) return '<option value="">— ไม่มีหมวดหมู่ —</option>';
  return active.map(function(c) {
    var escaped = c.name.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
    return '<option value="' + escaped + '">' + escaped + '</option>';
  }).join("");
}

// ============ Add Product Block ============
function addProductBlock(data) {
  blockCounter++;
  var idx = blockCounter;
  var isFirst = document.getElementById("productBlocks").children.length === 0;
  var d = data || {};

  var html = '';
  if (!isFirst) html += '<hr class="block-divider" />';

  html += '<div class="product-block" id="block-' + idx + '" data-block="' + idx + '">';

  // Header
  html += '<div class="product-block-header">';
  html += '<p class="product-block-title"><i data-lucide="package"></i> สินค้าที่ ' + (document.getElementById("productBlocks").children.length + 1) + '</p>';
  if (!isFirst || d._isEdit) {
    // ซ่อนปุ่มลบถ้ามีแค่ block เดียว
  }
  html += '<button class="product-block-remove" onclick="removeProductBlock(' + idx + ')" title="ลบ">x</button>';
  html += '</div>';

  // Images (เฉพาะ block แรก)
  if (isFirst) {
    html += '<div style="margin-bottom:14px;">';
    html += '<label class="form-label" style="margin-bottom:6px;display:block;">รูปภาพสินค้า <span style="color:#94a3b8;">(สูงสุด 5 ภาพ)</span></label>';
    html += '<div class="img-grid" id="imgGrid-' + idx + '" style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;"></div>';
    html += '<input type="file" id="imgInput-' + idx + '" accept="image/*" multiple style="display:none;" onchange="handleImgSelect(' + idx + ',this)" />';
    html += '</div>';
  }

  // Name + Category
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:10px;">';
  html += '<div class="form-group" style="margin:0;"><label class="form-label">Product Name</label><input type="text" class="form-input b-name" placeholder="ชื่อสินค้า..." value="' + (d.name || '') + '" /></div>';
  html += '<div class="form-group" style="margin:0;"><label class="form-label">Category</label><select class="form-select b-category">' + buildCategoryOptions() + '</select></div>';
  html += '</div>';

  // Description (เฉพาะ block แรก)
  if (isFirst) {
    html += '<div class="form-group" style="margin-bottom:10px;"><label class="form-label">Description</label><textarea class="form-input b-desc" rows="2" placeholder="รายละเอียดสินค้า..." style="resize:vertical;">' + (d.description || '') + '</textarea></div>';
  }

  // Barcode & Price + Variant Toggle
  html += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;padding-top:8px;border-top:1px solid #f1f5f9;">';
  html += '<span style="font-size:10px;font-weight:800;color:#1e293b;">Barcode & ราคา</span>';
  html += '<label class="toggle"><input type="checkbox" class="b-variant-toggle" onchange="toggleBlockVariant(' + idx + ')" /><span class="toggle-slider"></span></label>';
  html += '<span style="font-size:10px;font-weight:700;color:#64748b;">มี Variants</span>';
  html += '<button class="btn-outline b-add-variant-btn" type="button" onclick="addBlockVariantRow(' + idx + ')" style="margin-left:auto;padding:4px 12px;font-size:9px;display:none;">+ เพิ่ม Variant</button>';
  html += '</div>';

  // Single SKU (hidden — auto-generated, saved to DB)
  html += '<div class="b-single-sku">';
  var autoSku = d.sku || (!d._isEdit ? generateSku() : '');
  html += '<input type="hidden" class="b-sku" value="' + autoSku + '" />';
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">';
  var autoBarcode = d.barcode || (!d._isEdit ? generateBarcode() : '');
  html += '<div class="form-group" style="margin:0;"><label class="form-label">Barcode</label><div class="barcode-input-wrap"><input type="text" class="form-input b-barcode" placeholder="EAN / UPC..." value="' + autoBarcode + '" oninput="renderBarcodePreview(this)" /><div class="barcode-preview b-barcode-preview" onclick="showBarcodePopup(this.previousElementSibling)"></div></div></div>';
  html += '<div class="form-group" style="margin:0;"><label class="form-label">Price (฿)</label><input type="number" class="form-input b-price" placeholder="0.00" min="0" step="0.01" value="' + (d.price || '') + '" /></div>';
  html += '</div></div>';

  // Variant section
  html += '<div class="b-variant-section" style="display:none;">';
  var autoBaseSku = d.baseSku || (!d._isEdit ? autoSku : '');
  html += '<input type="hidden" class="b-base-sku" value="' + autoBaseSku + '" />';
  html += '<div style="background:#f8fafc;border-radius:10px;padding:8px;overflow-x:auto;">';
  html += '<table class="variant-table"><thead><tr><th>Variant</th><th style="display:none;">SKU</th><th>Barcode</th><th>Price (฿)</th><th style="width:30px;"></th></tr></thead>';
  html += '<tbody class="b-variant-body"></tbody></table>';
  html += '<div style="text-align:center;padding-top:8px;"><button class="btn-outline" type="button" onclick="addBlockVariantRow(' + idx + ')" style="padding:4px 14px;font-size:9px;">+ เพิ่ม Variant</button></div>';
  html += '</div></div>';

  // ============ Unit Conversion Section ============
  html += '<div style="margin-top:12px;padding-top:10px;border-top:1px solid #f1f5f9;">';
  html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">';
  html += '<span style="font-size:10px;font-weight:800;color:#1e293b;"><i data-lucide="ruler" style="width:12px;height:12px;display:inline;vertical-align:-2px;color:#47b8b4;"></i> หน่วยนับสินค้า</span>';
  html += '</div>';

  // Base unit dropdown
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:8px;">';
  html += '<div class="form-group" style="margin:0;"><label class="form-label">หน่วยนับของสินค้า</label>';
  html += '<select class="form-select b-base-unit" onchange="onBaseUnitChange(' + idx + ')">';
  html += '<option value="">— เลือกหน่วยหลัก —</option>';
  html += '</select></div>';
  html += '<div></div></div>';

  // Additional unit conversions
  html += '<div class="b-unit-conversions">';
  html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">';
  html += '<label class="form-label" style="margin:0;font-size:9px;color:#64748b;">หน่วยนับเพิ่มเติม (เช่น ลัง, โหล)</label>';
  html += '<button class="btn-outline b-add-conv-btn" type="button" onclick="addUnitConversionRow(' + idx + ')" style="padding:3px 10px;font-size:9px;display:none;">+ เพิ่มหน่วย</button>';
  html += '</div>';
  html += '<div class="b-conv-rows"></div>';
  html += '</div>';

  html += '</div>';

  html += '</div>';

  document.getElementById("productBlocks").insertAdjacentHTML("beforeend", html);

  // Set category
  if (d.category) {
    var block = document.getElementById("block-" + idx);
    var catSelect = block.querySelector(".b-category");
    if (catSelect) catSelect.value = d.category;
  }

  // Render images
  if (isFirst) {
    window["images_" + idx] = d.images || [];
    renderBlockImages(idx);
  }

  // Load variants
  if (d.variants && d.variants.length) {
    var block = document.getElementById("block-" + idx);
    block.querySelector(".b-variant-toggle").checked = true;
    toggleBlockVariant(idx);
    d.variants.forEach(function(v) {
      addBlockVariantRow(idx, v);
    });
  }

  // Populate unit dropdown
  populateUnitDropdowns(idx);

  // Load unit conversions if editing
  if (d.unitConversions && d.unitConversions.length) {
    var baseConv = d.unitConversions.find(function (c) { return c.is_base; });
    if (baseConv) {
      var block = document.getElementById("block-" + idx);
      block.querySelector(".b-base-unit").value = String(baseConv.unit_id);
      onBaseUnitChange(idx);
      d.unitConversions.forEach(function (c) {
        if (c.is_base) return;
        var unitName = "";
        allUnits.forEach(function (u) { if (u.id === c.unit_id) unitName = u.name; });
        addUnitConversionRow(idx, { unit_id: c.unit_id, factor: c.factor, _unitName: unitName });
      });
    }
  }

  lucide.createIcons();
  updateBlockNumbers();
  renderAllBarcodePreviews(document.getElementById("block-" + idx));
}

function removeProductBlock(idx) {
  var block = document.getElementById("block-" + idx);
  if (!block) return;
  // ลบ divider ด้วย
  var prev = block.previousElementSibling;
  if (prev && prev.classList.contains("block-divider")) prev.remove();
  block.remove();
  updateBlockNumbers();
}

function updateBlockNumbers() {
  var blocks = document.querySelectorAll(".product-block");
  blocks.forEach(function(block, i) {
    var title = block.querySelector(".product-block-title");
    if (title) title.innerHTML = '<i data-lucide="package"></i> สินค้าที่ ' + (i + 1);
  });
  // ซ่อนปุ่มลบถ้าเหลือ block เดียว
  blocks.forEach(function(block) {
    var removeBtn = block.querySelector(".product-block-remove");
    if (removeBtn) removeBtn.style.display = blocks.length <= 1 ? "none" : "flex";
  });
  lucide.createIcons();
}

// ============ Block Variant Toggle ============
function toggleBlockVariant(idx) {
  var block = document.getElementById("block-" + idx);
  if (!block) return;
  var on = block.querySelector(".b-variant-toggle").checked;
  block.querySelector(".b-single-sku").style.display = on ? "none" : "block";
  block.querySelector(".b-variant-section").style.display = on ? "block" : "none";
  block.querySelector(".b-add-variant-btn").style.display = on ? "inline-flex" : "none";

  if (on && block.querySelector(".b-variant-body").children.length === 0) {
    addBlockVariantRow(idx);
  }
}

function addBlockVariantRow(idx, data) {
  var block = document.getElementById("block-" + idx);
  if (!block) return;
  var tbody = block.querySelector(".b-variant-body");
  var tr = document.createElement("tr");
  var d = data || {};
  tr.innerHTML =
    '<td><input type="text" class="form-input v-name" placeholder="S, M, L..." value="' + (d.variant || '') + '" oninput="autoFillBlockSku(' + idx + ')" /></td>' +
    '<td style="display:none;"><input type="text" class="form-input v-sku" value="' + (d.sku || '') + '" /></td>' +
    '<td><div class="barcode-input-wrap"><input type="text" class="form-input v-barcode" placeholder="EAN..." value="' + (d.barcode || generateBarcode()) + '" oninput="renderBarcodePreview(this)" /><div class="barcode-preview v-barcode-preview" onclick="showBarcodePopup(this.previousElementSibling)"></div></div></td>' +
    '<td><input type="number" class="form-input v-price" placeholder="0" min="0" step="0.01" value="' + (d.price || '') + '" /></td>' +
    '<td><button class="btn-icon-sm btn-danger" onclick="this.closest(\'tr\').remove()" style="width:20px;height:20px;"><i data-lucide="x" style="width:10px;height:10px;"></i></button></td>';
  tbody.appendChild(tr);
  lucide.createIcons();
  var barcodeInput = tr.querySelector(".v-barcode");
  if (barcodeInput) renderBarcodePreview(barcodeInput);
}

function autoFillBlockSku(idx) {
  var block = document.getElementById("block-" + idx);
  if (!block) return;
  var baseSku = (block.querySelector(".b-base-sku").value || "").trim().toUpperCase();
  if (!baseSku) return;
  block.querySelectorAll(".b-variant-body tr").forEach(function(tr) {
    var name = tr.querySelector(".v-name").value.trim().toUpperCase();
    var skuInput = tr.querySelector(".v-sku");
    if (name) skuInput.value = baseSku + "-" + name.replace(/\s+/g, "");
  });
}

// ============ Block Images ============
function handleImgSelect(idx, input) {
  var images = window["images_" + idx] || [];
  for (var i = 0; i < input.files.length; i++) {
    if (images.length >= 5) break;
    if (!input.files[i].type.startsWith("image/")) continue;
    (function(file) {
      var reader = new FileReader();
      reader.onload = function(e) {
        images.push(e.target.result);
        window["images_" + idx] = images;
        renderBlockImages(idx);
      };
      reader.readAsDataURL(file);
    })(input.files[i]);
  }
  input.value = "";
}

function removeBlockImage(idx, imgIdx) {
  var images = window["images_" + idx] || [];
  images.splice(imgIdx, 1);
  window["images_" + idx] = images;
  renderBlockImages(idx);
}

function renderBlockImages(idx) {
  var grid = document.getElementById("imgGrid-" + idx);
  if (!grid) return;
  var images = window["images_" + idx] || [];
  var html = "";

  for (var i = 0; i < 5; i++) {
    if (i < images.length) {
      html += '<div class="img-card" style="width:auto;height:auto;aspect-ratio:1;" draggable="true" data-img-idx="' + i + '">' +
        '<img src="' + images[i] + '" style="pointer-events:none;" />' +
        '<button class="img-card-remove" onclick="removeBlockImage(' + idx + ',' + i + ')">x</button>' +
      '</div>';
    } else {
      html += '<div class="img-add" style="width:auto;height:auto;aspect-ratio:1;" onclick="document.getElementById(\'imgInput-' + idx + '\').click()">' +
        '<span class="img-add-icon">+</span>' +
        '<span class="img-add-text">' + (i === 0 ? 'Main' : 'รูป ' + (i + 1)) + '</span>' +
      '</div>';
    }
  }
  grid.innerHTML = html;
  initImageDragDrop(idx);
}

// ============ Drag & Drop for Images ============
function initImageDragDrop(idx) {
  var grid = document.getElementById("imgGrid-" + idx);
  if (!grid) return;

  // --- Drop files from desktop --- (register once)
  if (!grid.dataset.fileDropBound) {
    grid.dataset.fileDropBound = "1";
    grid.addEventListener("dragover", function(e) {
      e.preventDefault();
      grid.classList.add("drag-over");
    });
    grid.addEventListener("dragleave", function(e) {
      if (!grid.contains(e.relatedTarget)) grid.classList.remove("drag-over");
    });
    grid.addEventListener("drop", function(e) {
      e.preventDefault();
      grid.classList.remove("drag-over");
      var files = e.dataTransfer.files;
      if (files && files.length) {
        handleImgDrop(idx, files);
        return;
      }
    });
  }

  // --- Reorder by dragging within grid ---
  var dragSrcIdx = null;
  grid.querySelectorAll(".img-card[draggable]").forEach(function(card) {
    card.addEventListener("dragstart", function(e) {
      dragSrcIdx = Number(card.dataset.imgIdx);
      card.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(dragSrcIdx));
    });
    card.addEventListener("dragend", function() {
      card.classList.remove("dragging");
      grid.querySelectorAll(".img-card").forEach(function(c) { c.classList.remove("drag-target"); });
    });
    card.addEventListener("dragover", function(e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      card.classList.add("drag-target");
    });
    card.addEventListener("dragleave", function() {
      card.classList.remove("drag-target");
    });
    card.addEventListener("drop", function(e) {
      e.preventDefault();
      e.stopPropagation();
      grid.classList.remove("drag-over");
      card.classList.remove("drag-target");
      var fromIdx = Number(e.dataTransfer.getData("text/plain"));
      var toIdx = Number(card.dataset.imgIdx);
      if (isNaN(fromIdx) || fromIdx === toIdx) return;
      var images = window["images_" + idx] || [];
      var moved = images.splice(fromIdx, 1)[0];
      images.splice(toIdx, 0, moved);
      window["images_" + idx] = images;
      renderBlockImages(idx);
    });
  });
}

function handleImgDrop(idx, files) {
  var images = window["images_" + idx] || [];
  var pending = [];
  for (var i = 0; i < files.length; i++) {
    if (images.length + pending.length >= 5) break;
    if (!files[i].type.startsWith("image/")) continue;
    pending.push(files[i]);
  }
  if (!pending.length) return;
  var loaded = 0;
  pending.forEach(function(file) {
    var reader = new FileReader();
    reader.onload = function(e) {
      images.push(e.target.result);
      window["images_" + idx] = images;
      loaded++;
      if (loaded === pending.length) renderBlockImages(idx);
    };
    reader.readAsDataURL(file);
  });
}

// ============ Unit Conversion Helpers ============
function populateUnitDropdowns(idx) {
  var block = document.getElementById("block-" + idx);
  if (!block) return;
  var baseSelect = block.querySelector(".b-base-unit");
  var currentVal = baseSelect.value;
  var html = '<option value="">— เลือกหน่วยหลัก —</option>';
  allUnits.forEach(function (u) {
    if (u.status !== "active") return;
    html += '<option value="' + u.id + '">' + u.name + (u.abbr ? ' (' + u.abbr + ')' : '') + '</option>';
  });
  baseSelect.innerHTML = html;
  if (currentVal) baseSelect.value = currentVal;
}

function onBaseUnitChange(idx) {
  var block = document.getElementById("block-" + idx);
  if (!block) return;
  var baseId = block.querySelector(".b-base-unit").value;
  var addBtn = block.querySelector(".b-add-conv-btn");
  addBtn.style.display = baseId ? "inline-flex" : "none";
  if (!baseId) {
    block.querySelector(".b-conv-rows").innerHTML = "";
  }
}

function addUnitConversionRow(idx, data) {
  var block = document.getElementById("block-" + idx);
  if (!block) return;
  var baseId = block.querySelector(".b-base-unit").value;
  if (!baseId) return;
  var baseName = "";
  allUnits.forEach(function (u) { if (u.id === Number(baseId)) baseName = u.name; });

  var d = data || {};
  var container = block.querySelector(".b-conv-rows");
  var row = document.createElement("div");
  row.className = "conv-row";
  row.style.cssText = "display:grid;grid-template-columns:1fr auto 80px auto auto;gap:8px;align-items:center;margin-bottom:6px;";

  // Unit dropdown (ไม่รวม base unit)
  var unitOpts = '';
  allUnits.forEach(function (u) {
    if (u.status !== "active") return;
    if (u.id === Number(baseId)) return;
    unitOpts += '<option value="' + u.id + '"' + (d.unit_id && d.unit_id === u.id ? ' selected' : '') + '>' + u.name + (u.abbr ? ' (' + u.abbr + ')' : '') + '</option>';
  });

  row.innerHTML =
    '<select class="form-select cv-unit" style="font-size:10px;padding:6px 8px;">' + unitOpts + '</select>' +
    '<span style="font-size:9px;color:#64748b;white-space:nowrap;">1 <span class="cv-unit-label">' + (d._unitName || '') + '</span> =</span>' +
    '<input type="number" class="form-input cv-factor" placeholder="จำนวน" min="0.000001" step="any" value="' + (d.factor || '') + '" style="font-size:10px;padding:6px 8px;" />' +
    '<span style="font-size:9px;color:#64748b;white-space:nowrap;">' + baseName + '</span>' +
    '<button class="btn-icon-sm btn-danger" onclick="this.closest(\'.conv-row\').remove()" style="width:20px;height:20px;" type="button"><i data-lucide="x" style="width:10px;height:10px;"></i></button>';

  container.appendChild(row);

  // Update label when unit changes
  var unitSelect = row.querySelector(".cv-unit");
  var unitLabel = row.querySelector(".cv-unit-label");
  function updateLabel() {
    var selOpt = unitSelect.options[unitSelect.selectedIndex];
    unitLabel.textContent = selOpt ? selOpt.textContent.split(" (")[0] : "";
  }
  unitSelect.addEventListener("change", updateLabel);
  updateLabel();

  lucide.createIcons();
}

// ============ Collect & Save ============
function collectBlockData(block) {
  var name = block.querySelector(".b-name").value.trim();
  if (!name) return null;

  var category = block.querySelector(".b-category").value;
  var descEl = block.querySelector(".b-desc");
  var desc = descEl ? descEl.value.trim() : "";
  var hasVariants = block.querySelector(".b-variant-toggle").checked;

  var result = { name: name, category: category, description: desc, status: "active" };

  if (hasVariants) {
    result.sku = (block.querySelector(".b-base-sku").value || "").trim().toUpperCase();
    result.barcode = "";
    result.variants = [];
    block.querySelectorAll(".b-variant-body tr").forEach(function(tr) {
      var v = tr.querySelector(".v-name").value.trim();
      if (v) result.variants.push({
        variant: v,
        sku: tr.querySelector(".v-sku").value.trim(),
        barcode: tr.querySelector(".v-barcode").value.trim(),
        price: parseFloat(tr.querySelector(".v-price").value) || 0
      });
    });
    result.price = result.variants.length ? Math.min.apply(null, result.variants.map(function(v) { return v.price; })) : 0;
  } else {
    result.sku = block.querySelector(".b-sku").value.trim();
    result.barcode = block.querySelector(".b-barcode").value.trim();
    result.price = parseFloat(block.querySelector(".b-price").value) || 0;
    result.variants = [];
  }

  // Images from first block
  var blockIdx = block.dataset.block;
  result.images = window["images_" + blockIdx] || [];

  // Unit conversions
  var baseUnitId = block.querySelector(".b-base-unit").value;
  if (baseUnitId) {
    result.unitConversions = [{ unit_id: Number(baseUnitId), factor: 1, is_base: true }];
    block.querySelectorAll(".conv-row").forEach(function (row) {
      var unitId = row.querySelector(".cv-unit").value;
      var factor = parseFloat(row.querySelector(".cv-factor").value);
      if (unitId && factor > 0) {
        result.unitConversions.push({ unit_id: Number(unitId), factor: factor, is_base: false });
      }
    });
  } else {
    result.unitConversions = [];
  }

  return result;
}

function buildProductPayload(d) {
  var cat = allCategories.find(function (c) { return c.name === d.category; });
  var baseConv = (d.unitConversions || []).find(function (c) { return c.is_base; });
  return {
    name: d.name,
    description: d.description || "",
    sku: d.sku || "",
    barcode: d.barcode || "",
    price: d.price || 0,
    category_id: cat ? cat.id : null,
    unit_id: baseConv ? baseConv.unit_id : null,
    images: d.images || [],
    variants: d.variants || [],
    status: d.status || "active",
  };
}

function setSavingState(isSaving) {
  var btn = document.getElementById("saveProductBtn");
  var overlay = document.getElementById("savingOverlay");
  if (btn) {
    btn.disabled = isSaving;
    btn.style.opacity = isSaving ? "0.6" : "";
    btn.style.cursor = isSaving ? "not-allowed" : "";
    btn.innerHTML = isSaving
      ? '<span style="display:inline-flex;align-items:center;gap:6px;"><span style="width:12px;height:12px;border:2px solid rgba(255,255,255,0.4);border-top-color:#fff;border-radius:50%;animation:spin 0.8s linear infinite;"></span>กำลังบันทึก...</span>'
      : "Save";
  }
  if (overlay) overlay.style.display = isSaving ? "flex" : "none";
}

function saveAllProducts() {
  var blocks = document.querySelectorAll(".product-block");
  var items = [];
  var firstEmpty = null;

  blocks.forEach(function(block) {
    var data = collectBlockData(block);
    if (data) {
      items.push(data);
    } else if (!firstEmpty) {
      firstEmpty = block.querySelector(".b-name");
    }
  });

  if (!items.length) {
    if (firstEmpty) firstEmpty.focus();
    return;
  }

  var params = new URLSearchParams(window.location.search);
  var editId = params.get("id");
  var isEdit = !!editId;

  setSavingState(true);

  var saveOps;
  if (isEdit) {
    var d = items[0];
    saveOps = updateProductDB(editId, buildProductPayload(d)).then(function (updated) {
      if (!updated || !updated.id) throw new Error("Update failed");
      return saveProductUnitConversions(updated.id, d.unitConversions || []);
    });
  } else {
    saveOps = Promise.all(items.map(function (d) {
      return createProductDB(buildProductPayload(d)).then(function (created) {
        if (!created || !created.id) throw new Error("Create failed");
        return saveProductUnitConversions(created.id, d.unitConversions || []);
      });
    }));
  }

  saveOps
    .then(function () {
      var names = items.map(function(p) { return p.name; }).join(", ");
      showToast("บันทึกสำเร็จ!", "บันทึก " + items.length + " สินค้า: " + names, function() {
        window.location.href = "products-list.html";
      });
    })
    .catch(function (err) {
      console.error(err);
      setSavingState(false);
      showToast("เกิดข้อผิดพลาด", err.message || "บันทึกไม่สำเร็จ");
    });
}

// ============ Edit Mode ============
function checkEditMode() {
  var params = new URLSearchParams(window.location.search);
  var editId = params.get("id");
  if (!editId) return Promise.resolve(false);

  document.getElementById("pageTitle").textContent = "Edit Product";
  document.getElementById("pageSubtitle").textContent = "แก้ไขข้อมูลสินค้า";

  return Promise.all([
    typeof fetchProductById === "function" ? fetchProductById(editId) : Promise.resolve(null),
    typeof fetchProductUnitConversions === "function" ? fetchProductUnitConversions(editId) : Promise.resolve([]),
  ]).then(function (results) {
    var p = results[0];
    if (!p) return true;
    var conversions = (results[1] || []).map(function (c) {
      return { unit_id: c.unit_id, factor: Number(c.factor), is_base: !!c.is_base };
    });
    addProductBlock({
      _isEdit: true,
      name: p.name || "",
      category: p.categories ? p.categories.name : "",
      description: p.description || "",
      sku: p.sku || "",
      baseSku: p.sku || "",
      barcode: p.barcode || "",
      price: Number(p.price) || 0,
      variants: p.variants || [],
      images: p.images || [],
      unitConversions: conversions,
    });
    return true;
  });
}

// ============ Random fill (dev) ============
if (typeof registerRandomFill === "function") {
  registerRandomFill({
    target: "page",
    fill: function () {
      var firstBlock = document.querySelector(".product-block");
      if (!firstBlock) return;
      var nameEl = firstBlock.querySelector(".b-name");
      var catEl = firstBlock.querySelector(".b-category");
      var priceEl = firstBlock.querySelector(".b-price");
      var descEl = firstBlock.querySelector(".b-desc");
      if (nameEl) { nameEl.value = randomProductName(); nameEl.dispatchEvent(new Event("input", { bubbles: true })); }
      if (priceEl) { priceEl.value = rdFloat(50, 2000, 2); priceEl.dispatchEvent(new Event("input", { bubbles: true })); }
      if (descEl) { descEl.value = "สินค้าคุณภาพดี " + randomProductName() + " พร้อมส่ง"; descEl.dispatchEvent(new Event("input", { bubbles: true })); }
      if (catEl && catEl.options.length > 1) {
        var opts = Array.prototype.slice.call(catEl.options).filter(function (o) { return o.value !== ""; });
        if (opts.length) { catEl.value = rdPick(opts).value; catEl.dispatchEvent(new Event("change", { bubbles: true })); }
      }
    },
  });
}

// ============ Init ============
document.addEventListener("DOMContentLoaded", function() {
  // โหลด units ก่อน แล้วค่อยสร้าง block
  Promise.all([
    typeof fetchUnitsDB === "function" ? fetchUnitsDB() : Promise.resolve([]),
    typeof fetchProducts === "function" ? fetchProducts() : Promise.resolve([]),
    typeof fetchCategories === "function" ? fetchCategories() : Promise.resolve([]),
  ])
    .then(function (results) {
      allUnits = (results[0] || []).map(function (r) {
        return { id: r.id, name: r.name, abbr: r.abbr || "", status: r.status || "active" };
      });
      allProducts = (results[1] || []).map(function (r) {
        return { sku: r.sku || "" };
      });
      allCategories = (results[2] || []).map(function (r) {
        return { id: r.id, name: r.name || "", status: r.status || "active" };
      });
    })
    .catch(function () { allUnits = []; allProducts = []; })
    .then(function () {
      return checkEditMode();
    })
    .then(function (isEdit) {
      if (!isEdit) addProductBlock();
      // Populate unit dropdowns สำหรับทุก block
      document.querySelectorAll(".product-block").forEach(function (block) {
        var idx = block.dataset.block;
        populateUnitDropdowns(Number(idx));
      });
      lucide.createIcons();
    });
});
