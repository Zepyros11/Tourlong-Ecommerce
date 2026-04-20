// ============================================================
// company-info.js — Company Info (Supabase, single row id=1)
// ============================================================

var company = {
  name: "", type: "", tax_id: "", phone: "", email: "",
  website: "", address: "", branch: "",
};

function renderCompany() {
  document.getElementById("displayName").textContent = company.name || "—";
  document.getElementById("displayType").textContent = company.type || "—";
  document.getElementById("displayTaxId").textContent = company.tax_id || "—";
  document.getElementById("displayPhone").textContent = company.phone || "—";
  document.getElementById("displayEmail").textContent = company.email || "—";
  document.getElementById("displayWebsite").textContent = company.website || "—";
  document.getElementById("displayAddress").textContent = company.address || "—";
  document.getElementById("displayBranch").textContent = company.branch || "—";
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
  openModalById("companyModal", function () { document.getElementById("inputName").focus(); });
}

function saveCompany() {
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

  updateCompanyInfoDB(payload)
    .then(function () { return reloadCompany(); })
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
