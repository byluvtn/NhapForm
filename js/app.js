// app.js - Điều phối chính: gắn sự kiện và khởi tạo form khi trang tải xong

document.addEventListener("DOMContentLoaded", () => {
  initStaticSelects();
  renderEducationRows();
  renderSciQuestions();
  renderSelfAnalysis();

  addCompanyRow();
  addFamilyRow();

  setFormMode("standard");

  document.getElementById("modeStandardBtn").addEventListener("click", () => setFormMode("standard"));
  document.getElementById("modeSciBtn").addEventListener("click", () => setFormMode("sci"));

  document.getElementById("addCompanyBtn").addEventListener("click", addCompanyRow);
  document.getElementById("addFamilyBtn").addEventListener("click", addFamilyRow);

  document.getElementById("studentForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    console.log("Dữ liệu hồ sơ:", data);
    alert("Đã lưu dữ liệu (xem console). Chức năng lưu trữ thực tế sẽ bổ sung ở bước sau.");
  });
});
