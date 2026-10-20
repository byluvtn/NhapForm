// form-ui.js - Logic DOM: dựng select, toggle chế độ Phổ Thông/SCI, thêm/xóa dòng động

/**
 * Đổ danh sách option vào một thẻ <select>
 */
function populateSelect(selectEl, options) {
  selectEl.innerHTML = "";
  options.forEach((opt) => {
    const optionEl = document.createElement("option");
    optionEl.value = opt.value;
    optionEl.textContent = opt.label;
    selectEl.appendChild(optionEl);
  });
}

/**
 * Đổ các select tĩnh dùng chung (giới tính, hôn nhân, nhóm máu, tay thuận...)
 */
function initStaticSelects() {
  populateSelect(document.getElementById("gioiTinh"), GENDER_OPTIONS);
  populateSelect(document.getElementById("honNhan"), MARITAL_STATUS_OPTIONS);
  populateSelect(document.getElementById("nhomMau"), BLOOD_TYPE_OPTIONS);
  populateSelect(document.getElementById("tayThuan"), HANDEDNESS_OPTIONS);

  // --- Đời tư & Hôn nhân (SCI) ---
  populateSelect(document.getElementById("tienSuLyHon"), KHONG_CO_OPTIONS);
  populateSelect(document.getElementById("coNguoiYeu"), NGUOI_YEU_OPTIONS);

  // --- Thói quen & Bệnh lý (SCI) ---
  populateSelect(document.getElementById("hutThuoc"), KHONG_CO_OPTIONS);
  populateSelect(document.getElementById("uongRuou"), KHONG_CO_OPTIONS);
  populateSelect(document.getElementById("xamMinh"), KHONG_CO_OPTIONS);
  populateSelect(document.getElementById("muMau"), MU_MAU_OPTIONS);
  populateSelect(document.getElementById("benhManTinh"), KHONG_CO_OPTIONS);
  populateSelect(document.getElementById("diUngSci"), KHONG_CO_OPTIONS);
  populateSelect(document.getElementById("benhDaLieuSci"), KHONG_CO_OPTIONS);

  // --- Kinh nghiệm sống tập thể (SCI) ---
  populateSelect(document.getElementById("tungSongTapThe"), YES_NO_OPTIONS);
  populateSelect(
    document.getElementById("donViThoiGianSongTapThe"),
    THOI_GIAN_UNIT_OPTIONS,
  );

  // --- Người thân / người quen tại Nhật (SCI) ---
  populateSelect(document.getElementById("coNguoiQuenNhat"), YES_NO_OPTIONS);
  document.getElementById("coNguoiQuenNhat").value = "khong";

  // --- Kế hoạch đi Nhật (SCI) ---
  populateSelect(document.getElementById("giaDinhDongY"), DONG_Y_GIA_DINH_OPTIONS);

  applyDefaultSciValues();

  bindNguoiQuenNhatToggle();
  bindTungSongTapTheToggle();
  bindTyLeChiPhiValidation();
  bindMucTieuTietKiemConversion();
}

/**
 * Thiết lập sẵn các giá trị mặc định thông dụng cho khối SCI,
 * để người nhập chỉ cần tab qua nhanh nếu ứng viên không có gì đặc biệt.
 */
function applyDefaultSciValues() {
  const defaults = {
    tienSuLyHon: "khong",
    coNguoiYeu: "chua",
    hutThuoc: "khong",
    uongRuou: "khong",
    xamMinh: "khong",
    muMau: "binh_thuong",
    benhManTinh: "khong",
    diUngSci: "khong",
    benhDaLieuSci: "khong",
    tungSongTapThe: "khong",
    donViThoiGianSongTapThe: "nam",
    chiTietSongTapThe: SONG_TAP_THE_SUGGESTION,
    giaDinhDongY: "da_dong_y",
  };

  Object.entries(defaults).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.value = value;
  });
}

/**
 * Hiện/ẩn 3 ô Mối quan hệ / Tư cách lưu trú / Nơi ở tại Nhật
 * tùy theo lựa chọn "Có người quen tại Nhật không"
 */
function bindNguoiQuenNhatToggle() {
  const select = document.getElementById("coNguoiQuenNhat");
  if (!select) return;

  const toggle = () => {
    const show = select.value === "co";
    document.querySelectorAll(".nguoiQuenNhat-extra").forEach((el) => {
      el.classList.toggle("hidden", !show);
    });
  };

  select.addEventListener("change", toggle);
  toggle();
}

/**
 * Hiện/ẩn ô "Thời gian" & "Đơn vị" sống tập thể tùy theo đã từng sống tập thể hay chưa
 */
function bindTungSongTapTheToggle() {
  const select = document.getElementById("tungSongTapThe");
  if (!select) return;

  const toggle = () => {
    const show = select.value === "co";
    const thoiGian = document.getElementById("thoiGianSongTapThe");
    const donVi = document.getElementById("donViThoiGianSongTapThe");
    [thoiGian, donVi].forEach((el) => {
      if (el) el.closest("div").classList.toggle("opacity-50", !show);
    });
  };

  select.addEventListener("change", toggle);
  toggle();
}

/**
 * Cảnh báo nếu tổng tỷ lệ chi phí đi Nhật (Bản thân/Bố mẹ/Họ hàng/Vay/Khác) khác 100%
 */
function bindTyLeChiPhiValidation() {
  const inputs = document.querySelectorAll(".tyle-input");
  const warning = document.getElementById("tyLeTongWarning");
  if (!inputs.length || !warning) return;

  const validate = () => {
    const total = Array.from(inputs).reduce(
      (sum, input) => sum + (parseFloat(input.value) || 0),
      0,
    );
    warning.classList.toggle("hidden", total === 100 || total === 0);
  };

  inputs.forEach((input) => input.addEventListener("input", validate));
  validate();
}

/**
 * Tự động quy đổi Mục tiêu tiết kiệm 3 năm (VNĐ) sang Vạn Yên (万円)
 * dựa trên Tỷ giá Yên/VNĐ (số VNĐ tương đương 1 Yên)
 */
function bindMucTieuTietKiemConversion() {
  const vndInput = document.getElementById("mucTieuTietKiem");
  const tyGiaInput = document.getElementById("tyGiaYen");
  const vanYenInput = document.getElementById("mucTieuTietKiemVanYen");
  if (!vndInput || !tyGiaInput || !vanYenInput) return;

  const convert = () => {
    const vnd = parseFloat(vndInput.value) || 0;
    const tyGia = parseFloat(tyGiaInput.value) || 0;
    if (vnd <= 0 || tyGia <= 0) {
      vanYenInput.value = "";
      return;
    }
    const yen = vnd / tyGia;
    const vanYen = yen / 10000;
    vanYenInput.value = `${vanYen.toFixed(2)} 万円`;
  };

  vndInput.addEventListener("input", convert);
  tyGiaInput.addEventListener("input", convert);
  convert();
}

/**
 * Chuyển đổi chế độ hiển thị giữa "standard" (Phổ Thông) và "sci"
 */
function setFormMode(mode) {
  const body = document.body;
  body.dataset.mode = mode;

  const isSci = mode === "sci";

  document.querySelectorAll(".sci-field").forEach((el) => {
    el.classList.toggle("hidden", !isSci);
  });
  document.querySelectorAll(".sci-only").forEach((el) => {
    el.classList.toggle("hidden", !isSci);
  });

  const standardBtn = document.getElementById("modeStandardBtn");
  const sciBtn = document.getElementById("modeSciBtn");
  const activeClasses = ["bg-blue-600", "text-white"];
  const inactiveClasses = ["text-gray-600", "hover:bg-gray-100"];

  if (isSci) {
    standardBtn.classList.remove(...activeClasses);
    standardBtn.classList.add(...inactiveClasses);
    sciBtn.classList.remove(...inactiveClasses);
    sciBtn.classList.add(...activeClasses);
  } else {
    sciBtn.classList.remove(...activeClasses);
    sciBtn.classList.add(...inactiveClasses);
    standardBtn.classList.remove(...inactiveClasses);
    standardBtn.classList.add(...activeClasses);
  }
}

/**
 * Dựng sẵn 4 dòng Học vấn (Cấp 1 -> Cấp 4/ĐH/CĐ)
 */
function renderEducationRows() {
  const tbody = document.getElementById("educationTableBody");
  tbody.innerHTML = "";

  EDUCATION_LEVELS.forEach((level) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="py-1.5 pr-2 font-medium text-gray-600">${level.label}</td>
      <td class="py-1.5 pr-2"><input type="text" name="hocVan_${level.key}_tenTruong" class="input-field" /></td>
      <td class="py-1.5 pr-2"><input type="number" name="hocVan_${level.key}_namBatDau" class="input-field" placeholder="YYYY" /></td>
      <td class="py-1.5 pr-2"><input type="number" name="hocVan_${level.key}_namKetThuc" class="input-field" placeholder="YYYY" /></td>
      <td class="py-1.5 pr-2"><input type="text" name="hocVan_${level.key}_chuyenNganh" class="input-field" /></td>
    `;
    tbody.appendChild(tr);
  });
}

/**
 * Tạo một khối (card) nhập thông tin công ty, dùng cho Nhóm 4
 */
function createCompanyBlock(index) {
  const wrapper = document.createElement("div");
  wrapper.className = "company-block border border-gray-200 rounded-md p-4 relative";
  wrapper.dataset.index = index;

  const lyDoNghiOptionsHtml = LY_DO_NGHI_VIEC_OPTIONS.map(
    (opt) => `<option value="${opt.value}">${opt.label}</option>`,
  ).join("");

  wrapper.innerHTML = `
    <div class="flex items-center justify-between mb-3">
      <span class="text-sm font-semibold text-gray-600">Công ty #${index + 1}</span>
      <button type="button" class="removeCompanyBtn text-xs text-red-500 hover:text-red-700 font-medium">Xóa</button>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
      <div><label class="field-label">Từ tháng/năm</label><input type="month" name="congTy_${index}_tuThang" class="input-field" /></div>
      <div><label class="field-label">Đến tháng/năm</label><input type="month" name="congTy_${index}_denThang" class="input-field" /></div>
      <div><label class="field-label">Tên công ty</label><input type="text" name="congTy_${index}_tenCongTy" class="input-field" /></div>
      <div><label class="field-label">Tỉnh/TP</label><input type="text" name="congTy_${index}_tinhTP" class="input-field" /></div>
      <div class="md:col-span-2"><label class="field-label">Công việc</label><input type="text" name="congTy_${index}_congViec" class="input-field" /></div>
      <div class="sci-field hidden"><label class="field-label">Tên sản phẩm sản xuất</label><input type="text" name="congTy_${index}_tenSanPham" class="input-field" /></div>
      <div class="sci-field hidden"><label class="field-label">Làm đứng</label><select name="congTy_${index}_lamDung" class="input-field sci-yesno"></select></div>
      <div class="sci-field hidden"><label class="field-label">Làm ca kíp</label><select name="congTy_${index}_lamCa" class="input-field sci-yesno"></select></div>
      <div class="sci-field hidden"><label class="field-label">Số giờ tăng ca TB/tháng</label><input type="number" name="congTy_${index}_soGioOT" class="input-field" /></div>
      <div class="sci-field hidden md:col-span-2">
        <label class="field-label">Lý do nghỉ việc</label>
        <select name="congTy_${index}_lyDoNghi" class="input-field lyDoNghi-select">${lyDoNghiOptionsHtml}</select>
      </div>
      <div class="sci-field hidden md:col-span-2 flex items-end gap-1.5 flex-wrap">
        ${LY_DO_NGHI_VIEC_OPTIONS.filter((opt) => opt.value)
          .map(
            (opt) =>
              `<button type="button" class="lyDoNghi-quick text-xs px-2 py-1 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200" data-value="${opt.value}">${opt.label}</button>`,
          )
          .join("")}
      </div>
    </div>
  `;

  wrapper.querySelectorAll(".sci-yesno").forEach((select) => {
    populateSelect(select, YES_NO_OPTIONS);
    select.value = "khong";
  });

  const lyDoNghiSelect = wrapper.querySelector(".lyDoNghi-select");
  wrapper.querySelectorAll(".lyDoNghi-quick").forEach((btn) => {
    btn.addEventListener("click", () => {
      lyDoNghiSelect.value = btn.dataset.value;
    });
  });

  const isSci = document.body.dataset.mode === "sci";
  wrapper.querySelectorAll(".sci-field").forEach((el) => el.classList.toggle("hidden", !isSci));

  wrapper.querySelector(".removeCompanyBtn").addEventListener("click", () => {
    wrapper.remove();
    renumberCompanyBlocks();
  });

  return wrapper;
}

function renumberCompanyBlocks() {
  const blocks = document.querySelectorAll("#companiesContainer .company-block");
  blocks.forEach((block, i) => {
    block.querySelector("span").textContent = `Công ty #${i + 1}`;
  });
}

function addCompanyRow() {
  const container = document.getElementById("companiesContainer");
  const currentCount = container.querySelectorAll(".company-block").length;
  if (currentCount >= MAX_COMPANIES) return;

  const block = createCompanyBlock(currentCount);
  container.appendChild(block);
}

/**
 * Tạo một dòng <tr> cho bảng Gia đình, dùng cho Nhóm 5
 */
function createFamilyRow(index) {
  const tr = document.createElement("tr");
  tr.className = "family-row";
  tr.dataset.index = index;

  tr.innerHTML = `
    <td class="py-1.5 pr-2"><input type="text" name="giaDinh_${index}_quanHe" class="input-field" /></td>
    <td class="py-1.5 pr-2"><input type="text" name="giaDinh_${index}_hoTen" class="input-field" /></td>
    <td class="py-1.5 pr-2"><input type="number" name="giaDinh_${index}_namSinh" class="input-field" placeholder="YYYY" /></td>
    <td class="py-1.5 pr-2"><input type="text" name="giaDinh_${index}_ngheNghiep" class="input-field" /></td>
    <td class="py-1.5 pr-2"><select name="giaDinh_${index}_songChung" class="input-field family-yesno"></select></td>
    <td class="py-1.5 text-center"><button type="button" class="removeFamilyBtn text-red-500 hover:text-red-700 text-xs font-medium">Xóa</button></td>
  `;

  populateSelect(tr.querySelector(".family-yesno"), YES_NO_OPTIONS);

  tr.querySelector(".removeFamilyBtn").addEventListener("click", () => {
    tr.remove();
  });

  return tr;
}

function addFamilyRow() {
  const tbody = document.getElementById("familyTableBody");
  const currentCount = tbody.querySelectorAll(".family-row").length;
  if (currentCount >= MAX_FAMILY_MEMBERS) return;

  const row = createFamilyRow(currentCount);
  tbody.appendChild(row);
}

/**
 * Dựng 7 câu hỏi khảo sát SCI dạng radio Yes/No, có giá trị mặc định
 */
function renderSciQuestions() {
  const container = document.getElementById("sciQuestionsContainer");
  container.innerHTML = "";

  SCI_QUESTIONS.forEach((question) => {
    const row = document.createElement("div");
    row.className = "flex items-center justify-between flex-wrap gap-2 py-2 border-b border-gray-100 last:border-0";

    const radiosHtml = YES_NO_OPTIONS.map((opt) => {
      const checked = opt.value === question.defaultValue ? "checked" : "";
      return `
        <label class="inline-flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
          <input type="radio" name="sci_${question.key}" value="${opt.value}" ${checked} class="accent-blue-600" />
          ${opt.label}
        </label>
      `;
    }).join("");

    row.innerHTML = `
      <span class="text-sm text-gray-700">${question.label}</span>
      <div class="flex items-center gap-4">${radiosHtml}</div>
    `;

    container.appendChild(row);
  });
}

// Khai báo 4 ô Phân tích bản thân: key (name field), label hiển thị, nhóm gợi ý tương ứng
const SELF_ANALYSIS_FIELDS = [
  { key: "tuPR", label: "自己PR (Giới thiệu bản thân)" },
  { key: "soTruong", label: "長所 (Sở trường)" },
  { key: "vuotTroi", label: "他人より優秀な所 (Điểm vượt trội hơn người khác)" },
  { key: "soDoan", label: "短所 (Sở đoản)" },
];

/**
 * Dựng 4 ô Phân tích bản thân (自己PR / 長所 / 他人より優秀な所 / 短所),
 * mỗi ô có menu cuộn thả xuống để chọn câu mẫu điền vào textarea bên dưới.
 * Textarea vẫn có thể gõ/sửa tự do sau khi chọn.
 */
function renderSelfAnalysis() {
  const container = document.getElementById("selfAnalysisContainer");
  if (!container) return;
  container.innerHTML = "";

  SELF_ANALYSIS_FIELDS.forEach((field) => {
    const wrapper = document.createElement("div");

    const templates = (typeof SELF_ANALYSIS_TEMPLATES !== "undefined" && SELF_ANALYSIS_TEMPLATES[field.key]) || [];
    const optionsHtml = templates
      .map(
        (tpl, i) =>
          `<option value="${i}">${tpl.label} → ${tpl.text}</option>`,
      )
      .join("");

    wrapper.innerHTML = `
      <label class="field-label">${field.label}</label>
      <select class="input-field selfAnalysis-select mb-1.5">
        <option value="">-- Chọn gợi ý mẫu (hoặc tự gõ vào ô) --</option>
        ${optionsHtml}
      </select>
      <textarea name="tuPhanTich_${field.key}" rows="3" class="input-field"></textarea>
    `;

    const select = wrapper.querySelector(".selfAnalysis-select");
    const textarea = wrapper.querySelector("textarea");
    select.addEventListener("change", () => {
      if (select.value === "") return;
      const tpl = templates[Number(select.value)];
      if (tpl) textarea.value = tpl.text;
    });

    container.appendChild(wrapper);
  });
}
