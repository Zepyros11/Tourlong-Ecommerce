// ============================================================
// company-info.js — Company Info (Supabase, single row id=1)
// ============================================================

var company = {
  name: "", type: "", tax_id: "", phone: "", email: "",
  website: "", address: "", branch: "", logo_url: "",
};

// pendingLogo: null = ไม่เปลี่ยน, "" = ลบ, "data:..." = รูปใหม่รอ upload
var pendingLogo = null;

function renderCompany() {
  document.getElementById("displayName").textContent = company.name || "—";
  document.getElementById("displayType").textContent = company.type || "—";
  document.getElementById("displayTaxId").textContent = company.tax_id || "—";
  document.getElementById("displayPhone").textContent = company.phone || "—";
  document.getElementById("displayEmail").textContent = company.email || "—";
  document.getElementById("displayWebsite").textContent = company.website || "—";
  document.getElementById("displayAddress").textContent = company.address || "—";
  document.getElementById("displayBranch").textContent = company.branch || "—";

  // แสดง logo ถ้ามี (แทน placeholder icon)
  var logoEl = document.getElementById("companyLogo");
  if (logoEl) {
    if (company.logo_url) {
      logoEl.innerHTML = '<img src="' + company.logo_url + '" style="width:100%;height:100%;object-fit:contain;" />';
    } else {
      logoEl.innerHTML = '<i data-lucide="building-2" style="width:32px;height:32px;color:#94a3b8;"></i>';
      if (typeof lucide !== "undefined") lucide.createIcons();
    }
  }
}

function renderLogoPreview(url) {
  var box = document.getElementById("logoPreviewBox");
  var img = document.getElementById("logoPreviewImg");
  var upload = document.getElementById("logoUploadBox");
  if (url) {
    box.style.display = "block";
    img.src = url;
    upload.style.display = "none";
  } else {
    box.style.display = "none";
    upload.style.display = "flex";
  }
}

function handleLogoSelect(input) {
  var f = input.files[0];
  if (!f) return;
  if (!f.type.startsWith("image/")) return;
  var reader = new FileReader();
  reader.onload = function (e) {
    pendingLogo = e.target.result;
    renderLogoPreview(pendingLogo);
  };
  reader.readAsDataURL(f);
  input.value = "";
}

function removeLogo() {
  pendingLogo = "";
  renderLogoPreview(null);
}

function openEditModal() {
  document.getElementById("inputName").value = company.name || "";
  document.getElementById("inputType").value = company.type || "";
  document.getElementById("inputTaxId").value = company.tax_id || "";
  document.getElementById("inputPhone").value = company.phone || "";
  document.getElementById("inputEmail").value = company.email || "";
  document.getElementById("inputWebsite").value = company.website || "";
  document.getElementById("inputAddress").value = company.address || "";
  document.getElementById("inputBranch").value = company.branch || "";
  pendingLogo = null;
  renderLogoPreview(company.logo_url || null);
  openModalById("companyModal", function () { document.getElementById("inputName").focus(); });
}

function saveCompany() {
  var oldLogo = company.logo_url || "";

  // Upload logo ก่อน (ถ้ามีการเปลี่ยน)
  var logoOp;
  if (pendingLogo === null) {
    logoOp = Promise.resolve(undefined); // ไม่เปลี่ยน
  } else if (pendingLogo === "") {
    logoOp = Promise.resolve(null); // ลบ
  } else if (typeof pendingLogo === "string" && pendingLogo.indexOf("data:") === 0) {
    logoOp = uploadDataUrlToStorage("product-images", pendingLogo);
  } else {
    logoOp = Promise.resolve(undefined);
  }

  logoOp
    .then(function (newUrl) {
      var payload = {
        name: document.getElementById("inputName").value.trim(),
        type: document.getElementById("inputType").value.trim(),
        tax_id: document.getElementById("inputTaxId").value.trim(),
        phone: document.getElementById("inputPhone").value.trim(),
        email: document.getElementById("inputEmail").value.trim(),
        website: document.getElementById("inputWebsite").value.trim(),
        address: document.getElementById("inputAddress").value.trim(),
        branch: document.getElementById("inputBranch").value.trim(),
      };
      // undefined = ไม่เปลี่ยน, null = clear, string = URL ใหม่
      if (newUrl !== undefined) payload.logo_url = newUrl;
      return updateCompanyInfoDB(payload);
    })
    .then(function () {
      // ลบ logo เก่าจาก Storage ถ้ามีการเปลี่ยน/ลบ
      if (pendingLogo !== null && oldLogo) {
        if (typeof deleteProductImagesFromStorage === "function") {
          deleteProductImagesFromStorage([oldLogo]).catch(function (e) { console.warn(e); });
        }
      }
      return reloadCompany();
    })
    .then(function () {
      closeModalById("companyModal");
      renderCompany();
    })
    .catch(function (err) { console.error(err); });
}

function reloadCompany() {
  return (typeof fetchCompanyInfoDB === "function" ? fetchCompanyInfoDB() : Promise.resolve(null))
    .then(function (row) {
      if (row) {
        company = {
          name: row.name || "", type: row.type || "", tax_id: row.tax_id || "",
          phone: row.phone || "", email: row.email || "", website: row.website || "",
          address: row.address || "", branch: row.branch || "",
          logo_url: row.logo_url || "",
        };
      }
    });
}

// ============ Random Fill (dev tool) ============
if (typeof registerRandomFill === "function") {
  registerRandomFill({
    target: "#companyModal",
    fill: function () {
      var companyName = randomCompanyName();
      setFieldValue("inputName", companyName);
      setFieldValue("inputType", rdPick(["บริษัท จำกัด", "บริษัท จำกัด (มหาชน)", "ห้างหุ้นส่วนจำกัด", "ร้านค้า"]));
      setFieldValue("inputTaxId", rdPick([
        rdInt(1, 9) + "-" + rdInt(1000, 9999) + "-" + rdInt(10000, 99999) + "-" + rdInt(10, 99) + "-" + rdInt(1, 9),
      ]));
      setFieldValue("inputPhone", randomPhone());
      setFieldValue("inputEmail", randomEmail());
      var slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 12) || "company";
      setFieldValue("inputWebsite", "www." + slug + ".com");
      setFieldValue("inputAddress", randomAddress());
      setFieldValue("inputBranch", rdPick(["สำนักงานใหญ่", "สาขา 1", "สาขาเชียงใหม่", "สาขาภูเก็ต", "สาขาขอนแก่น"]));
    },
  });
}

document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("editCompanyBtn").addEventListener("click", openEditModal);
  reloadCompany()
    .then(function () { renderCompany(); lucide.createIcons(); })
    .catch(function (err) { console.error(err); renderCompany(); });
});
