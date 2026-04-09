// ============================================================
// company-info.js — logic เฉพาะหน้า Company Info
// ------------------------------------------------------------
// ใช้ร่วมกับ: modal.js
// ============================================================

// ============ Mock Data ============
var company = {
  name: "Pathara Co., Ltd.",
  type: "บริษัท จำกัด",
  taxId: "0-1234-56789-01-2",
  phone: "02-123-4567",
  email: "info@pathara.com",
  website: "www.pathara.com",
  address: "123/45 ถ.สุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพมหานคร 10110",
  branch: "สำนักงานใหญ่",
};

// ============ Display ============
function renderCompany() {
  document.getElementById("displayName").textContent = company.name;
  document.getElementById("displayType").textContent = company.type;
  document.getElementById("displayTaxId").textContent = company.taxId;
  document.getElementById("displayPhone").textContent = company.phone;
  document.getElementById("displayEmail").textContent = company.email;
  document.getElementById("displayWebsite").textContent = company.website;
  document.getElementById("displayAddress").textContent = company.address;
  document.getElementById("displayBranch").textContent = company.branch;
}

// ============ Edit Modal ============
function openEditModal() {
  document.getElementById("inputName").value = company.name;
  document.getElementById("inputType").value = company.type;
  document.getElementById("inputTaxId").value = company.taxId;
  document.getElementById("inputPhone").value = company.phone;
  document.getElementById("inputEmail").value = company.email;
  document.getElementById("inputWebsite").value = company.website;
  document.getElementById("inputAddress").value = company.address;
  document.getElementById("inputBranch").value = company.branch;
  openModalById("companyModal", function () {
    document.getElementById("inputName").focus();
  });
}

function saveCompany() {
  company.name = document.getElementById("inputName").value.trim();
  company.type = document.getElementById("inputType").value.trim();
  company.taxId = document.getElementById("inputTaxId").value.trim();
  company.phone = document.getElementById("inputPhone").value.trim();
  company.email = document.getElementById("inputEmail").value.trim();
  company.website = document.getElementById("inputWebsite").value.trim();
  company.address = document.getElementById("inputAddress").value.trim();
  company.branch = document.getElementById("inputBranch").value.trim();
  closeModalById("companyModal");
  renderCompany();
}

// ============ Init ============
document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("editCompanyBtn").addEventListener("click", openEditModal);
  renderCompany();
  lucide.createIcons();
});
