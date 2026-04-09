// ============================================================
// products-form.js — Add/Edit Product (Dynamic Blocks)
// ============================================================

var blockCounter = 0;

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
var categoryOptions = '<option value="Electronics">Electronics</option><option value="Clothing">Clothing</option><option value="Accessories">Accessories</option><option value="Food &amp; Beverage">Food &amp; Beverage</option><option value="Sports">Sports</option><option value="Home &amp; Living">Home &amp; Living</option><option value="Beauty">Beauty</option><option value="Books">Books</option>';

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
  html += '<div class="form-group" style="margin:0;"><label class="form-label">Category</label><select class="form-select b-category">' + categoryOptions + '</select></div>';
  html += '</div>';

  // Description (เฉพาะ block แรก)
  if (isFirst) {
    html += '<div class="form-group" style="margin-bottom:10px;"><label class="form-label">Description</label><textarea class="form-input b-desc" rows="2" placeholder="รายละเอียดสินค้า..." style="resize:vertical;">' + (d.description || '') + '</textarea></div>';
  }

  // SKU & Price + Variant Toggle
  html += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;padding-top:8px;border-top:1px solid #f1f5f9;">';
  html += '<span style="font-size:10px;font-weight:800;color:#1e293b;">SKU & ราคา</span>';
  html += '<label class="toggle"><input type="checkbox" class="b-variant-toggle" onchange="toggleBlockVariant(' + idx + ')" /><span class="toggle-slider"></span></label>';
  html += '<span style="font-size:10px;font-weight:700;color:#64748b;">มี Variants</span>';
  html += '<button class="btn-outline b-add-variant-btn" type="button" onclick="addBlockVariantRow(' + idx + ')" style="margin-left:auto;padding:4px 12px;font-size:9px;display:none;">+ เพิ่ม Variant</button>';
  html += '</div>';

  // Single SKU
  html += '<div class="b-single-sku">';
  html += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">';
  html += '<div class="form-group" style="margin:0;"><label class="form-label">SKU</label><input type="text" class="form-input b-sku" placeholder="เช่น WH-001..." value="' + (d.sku || '') + '" /></div>';
  html += '<div class="form-group" style="margin:0;"><label class="form-label">Barcode</label><input type="text" class="form-input b-barcode" placeholder="EAN / UPC..." value="' + (d.barcode || '') + '" /></div>';
  html += '<div class="form-group" style="margin:0;"><label class="form-label">Price (฿)</label><input type="number" class="form-input b-price" placeholder="0.00" min="0" step="0.01" value="' + (d.price || '') + '" /></div>';
  html += '</div></div>';

  // Variant section
  html += '<div class="b-variant-section" style="display:none;">';
  html += '<div class="form-group" style="margin-bottom:8px;"><label class="form-label">Base SKU</label><input type="text" class="form-input b-base-sku" placeholder="เช่น BEAR → BEAR-S, BEAR-M" oninput="autoFillBlockSku(' + idx + ')" value="' + (d.baseSku || '') + '" /></div>';
  html += '<div style="background:#f8fafc;border-radius:10px;padding:8px;overflow-x:auto;">';
  html += '<table class="variant-table"><thead><tr><th>Variant</th><th>SKU</th><th>Barcode</th><th>Price (฿)</th><th style="width:30px;"></th></tr></thead>';
  html += '<tbody class="b-variant-body"></tbody></table>';
  html += '<div style="text-align:center;padding-top:8px;"><button class="btn-outline" type="button" onclick="addBlockVariantRow(' + idx + ')" style="padding:4px 14px;font-size:9px;">+ เพิ่ม Variant</button></div>';
  html += '</div></div>';

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

  lucide.createIcons();
  updateBlockNumbers();
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
  // ซ่อนปุ่ม "เพิ่มอีก" ตอน edit
  var params = new URLSearchParams(window.location.search);
  if (params.get("id")) {
    document.getElementById("addMoreBlockBtn").style.display = "none";
  }
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
    '<td><input type="text" class="form-input v-sku" placeholder="auto" style="color:#8b5cf6;" value="' + (d.sku || '') + '" /></td>' +
    '<td><input type="text" class="form-input v-barcode" placeholder="EAN..." value="' + (d.barcode || '') + '" /></td>' +
    '<td><input type="number" class="form-input v-price" placeholder="0" min="0" step="0.01" value="' + (d.price || '') + '" /></td>' +
    '<td><button class="btn-icon-sm btn-danger" onclick="this.closest(\'tr\').remove()" style="width:20px;height:20px;"><i data-lucide="x" style="width:10px;height:10px;"></i></button></td>';
  tbody.appendChild(tr);
  lucide.createIcons();
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
      html += '<div class="img-card" style="width:auto;height:auto;aspect-ratio:1;">' +
        '<img src="' + images[i] + '" />' +
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

  return result;
}

function saveAllProducts() {
  var blocks = document.querySelectorAll(".product-block");
  var products = [];
  var firstEmpty = null;

  blocks.forEach(function(block) {
    var data = collectBlockData(block);
    if (data) {
      products.push(data);
    } else if (!firstEmpty) {
      firstEmpty = block.querySelector(".b-name");
    }
  });

  if (!products.length) {
    if (firstEmpty) firstEmpty.focus();
    return;
  }

  // Mock save
  var names = products.map(function(p) { return p.name; }).join(", ");
  showToast("บันทึกสำเร็จ!", "บันทึก " + products.length + " สินค้า: " + names, function() {
    window.location.href = "products-list.html";
  });
}

// ============ Edit Mode ============
function checkEditMode() {
  var params = new URLSearchParams(window.location.search);
  var editId = params.get("id");
  if (!editId) return false;

  document.getElementById("pageTitle").textContent = "Edit Product";
  document.getElementById("pageSubtitle").textContent = "แก้ไขข้อมูลสินค้า";

  var mockProducts = {
    "3": { name: "เสื้อลายหมี", category: "Clothing", description: "เสื้อยืดลายหมี Cotton 100%", sku: "BEAR", baseSku: "BEAR", barcode: "", price: 450, variants: [
      { variant: "S", sku: "BEAR-S", barcode: "8851234567900", price: 450 },
      { variant: "M", sku: "BEAR-M", barcode: "8851234567901", price: 450 },
      { variant: "L", sku: "BEAR-L", barcode: "8851234567902", price: 490 },
      { variant: "XL", sku: "BEAR-XL", barcode: "8851234567903", price: 520 },
    ]},
    "1": { name: "Wireless Headphones", category: "Electronics", description: "หูฟังไร้สายคุณภาพสูง", sku: "WH-001", barcode: "8851234567890", price: 2590, variants: [] },
  };

  var p = mockProducts[editId];
  if (p) {
    p._isEdit = true;
    addProductBlock(p);
  }
  return true;
}

// ============ Init ============
document.addEventListener("DOMContentLoaded", function() {
  var isEdit = checkEditMode();
  if (!isEdit) addProductBlock();
  lucide.createIcons();
});
