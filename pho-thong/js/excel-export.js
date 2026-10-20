// ===================== EXCEL EXPORT (pho-thong) =====================
// Xuất danh sách học sinh ra file Excel theo template, chuẩn 100% định dạng tiếng Nhật.

const EXCEL_STORAGE_KEY = "danhSachPhoThong";
const EXCEL_SHEET_NAME = "総合データ";
const EXCEL_MEIBO_SHEET_NAME = "名簿";
const EXCEL_TEMPLATE_PATH = "template.xlsx";
const EXCEL_OUTPUT_FILENAME = "Danh_Sach_Phong_Van_TRAENCO.xlsx";
const EXCEL_SO_SHEET_CV_TOI_DA = 26;

// ===================== CÁC HÀM CHUẨN HÓA =====================

/**
 * Chuẩn hóa giá trị: rỗng/null/undefined -> chuỗi rỗng ''
 */
function cleanVal(val) {
  if (val === null || val === undefined) return "";
  const s = String(val).trim();
  if (s === "" || s.toLowerCase() === "null" || s.toLowerCase() === "undefined") return "";
  return s;
}

/**
 * Viết hoa không dấu toàn bộ chuỗi tiếng Việt
 */
function toUpperNoAccent(str) {
  const s = cleanVal(str);
  if (!s) return "";
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toUpperCase();
}

/**
 * Trả về xxxx年xx月xx日
 */
function formatBirthDate(str) {
  const s = cleanVal(str);
  if (!s) return "";

  let y, m, d;

  // YYYY-MM-DD
  let match = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) {
    y = match[1];
    m = match[2];
    d = match[3];
  } else {
    // DD/MM/YYYY
    match = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) {
      d = match[1];
      m = match[2];
      y = match[3];
    }
  }

  if (!y || !m || !d) return s;

  m = String(m).padStart(2, "0");
  d = String(d).padStart(2, "0");

  return `${y}年${m}月${d}日`;
}

/**
 * Trả về xxxx年xx月. Nếu là "Hiện tại" -> 現在
 */
function formatYearMonth(str) {
  const s = cleanVal(str);
  if (!s) return "";

  if (/hiện\s*tại/i.test(s) || /hien\s*tai/i.test(s)) return "現在";
  if (s === "現在") return "現在";

  let y, m;

  // MM/YYYY
  let match = s.match(/^(\d{1,2})\/(\d{4})$/);
  if (match) {
    m = match[1];
    y = match[2];
  } else {
    // YYYY-MM
    match = s.match(/^(\d{4})-(\d{1,2})$/);
    if (match) {
      y = match[1];
      m = match[2];
    } else {
      // YYYY only
      match = s.match(/^(\d{4})$/);
      if (match) {
        y = match[1];
        m = "01";
      }
    }
  }

  if (!y || !m) return s;

  m = String(m).padStart(2, "0");

  return `${y}年${m}月`;
}

/**
 * Chuyển chuỗi kinh nghiệm sang chuẩn Nhật X年Xヶ月
 * "1 năm 4 tháng" -> "1年4ヶ月", "2 năm 9 tháng" -> "2年9ヶ月",
 * "1 năm" -> "1年", "10 tháng" -> "10ヶ月"
 */
function formatKinhNghiem(val) {
  const s = cleanVal(val);
  if (!s) return "";

  let result = s
    .replace(/\s*(năm|nam)\s*/gi, "年")
    .replace(/\s*(tháng|thang)\s*/gi, "ヶ月");

  // Xóa khoảng trắng thừa
  result = result.replace(/\s+/g, " ").trim();
  // Xóa khoảng trắng ngay trước/sau các đơn vị đã chuyển
  result = result.replace(/\s*年\s*/g, "年").replace(/\s*ヶ月\s*/g, "ヶ月");

  return result;
}

/**
 * "Không" hoặc rỗng -> 無, "Phật giáo" -> 仏教, "Thiên Chúa giáo" -> キリスト教, khác -> giữ nguyên
 */
function formatReligion(val) {
  const s = cleanVal(val);
  if (!s) return "無";

  const low = s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (low === "khong" || low === "không") return "無";
  if (low.includes("phat")) return "仏教";
  if (low.includes("cong giao") || low.includes("thien chua") || low.includes("catholic")) return "キリスト教";

  return s;
}

// ===================== HELPER MAPPERS =====================

function excelTaoMaHS(stt) {
  return "TRA" + String(stt).padStart(3, "0");
}

function excelGioiTinhJP(val) {
  const s = cleanVal(val).toLowerCase();
  if (s.includes("nam") || s === "男" || s === "male") return "男";
  if (s.includes("nữ") || s.includes("nu") || s === "女" || s === "female") return "女";
  return "";
}

function excelHonNhanJP(val) {
  const s = cleanVal(val).toLowerCase();
  if (!s) return "無";
  if (
    s.includes("đã kết hôn") ||
    s.includes("da ket hon") ||
    s.includes("có") ||
    s.includes("co") ||
    s === "有"
  ) {
    return "有";
  }
  return "無";
}

function excelTayThuanJP(val) {
  const s = cleanVal(val).toLowerCase();
  if (s.includes("trái") || s.includes("trai") || s === "左" || s === "left") return "左";
  return "右";
}

function excelCoKhongJP(val) {
  const s = cleanVal(val).toLowerCase();
  if (!s) return "無";
  if (s.includes("có") || s.includes("co") || s === "有" || s === "1" || s === "true") return "有";
  return "無";
}

// ===================== ĐỌC DỮ LIỆU TỪ LOCALSTORAGE =====================

function excelLayDanhSachHocSinh() {
  let list = [];
  try {
    const raw = localStorage.getItem(EXCEL_STORAGE_KEY);
    list = raw ? JSON.parse(raw) : [];
  } catch (e) {
    list = [];
  }
  if (!Array.isArray(list)) list = [];

  return list.filter((hs) => hs && cleanVal(hs.hoTen) !== "");
}

// ===================== TẢI TEMPLATE =====================

async function getTemplateBuffer() {
  try {
    const res = await fetch(EXCEL_TEMPLATE_PATH);
    if (res.ok) {
      return await res.arrayBuffer();
    }
  } catch (e) {
    // fallback dưới đây
  }

  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".xlsx";
    input.onchange = () => {
      const file = input.files && input.files[0];
      if (!file) {
        reject(new Error("Không có file template được chọn"));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    };
    input.click();
  });
}

// ===================== ĐIỀN KHỐI DỮ LIỆU =====================

/**
 * Điền 1 khối học vấn 5 cột: Từ, Đến, Địa điểm, Tên trường, Môn
 */
function excelDienKhoiHocVan(row, colBatDau, hv) {
  hv = hv || {};
  row.getCell(colBatDau).value = formatYearMonth(hv.tu);
  row.getCell(colBatDau + 1).value = formatYearMonth(hv.den);
  row.getCell(colBatDau + 2).value = cleanVal(hv.diaDiem);
  row.getCell(colBatDau + 3).value = cleanVal(hv.truong);
  row.getCell(colBatDau + 4).value = cleanVal(hv.mon);
}

/**
 * Điền 1 khối việc làm 7 cột: Từ, Đến, Địa điểm, Tên công ty, Chức vụ, Công việc, Kinh nghiệm
 */
function excelDienKhoiCongViec(row, colBatDau, cv) {
  cv = cv || {};
  row.getCell(colBatDau).value = formatYearMonth(cv.tu);
  row.getCell(colBatDau + 1).value = formatYearMonth(cv.den);
  row.getCell(colBatDau + 2).value = cleanVal(cv.diaDiem);
  row.getCell(colBatDau + 3).value = cleanVal(cv.tenCongTy);
  row.getCell(colBatDau + 4).value = cleanVal(cv.chucVu);
  row.getCell(colBatDau + 5).value = cleanVal(cv.congViec);
  row.getCell(colBatDau + 6).value = formatKinhNghiem(cv.kinhNghiem);
}

/**
 * Điền 1 khối gia đình 5 cột: Quan hệ, Tuổi, Nghề nghiệp, Nơi ở, Liên hệ
 */
function excelDienKhoiGiaDinh(row, colBatDau, gd, nhanMacDinh) {
  gd = gd || {};
  const nhan = cleanVal(gd.quanHe) || cleanVal(nhanMacDinh);
  row.getCell(colBatDau).value = nhan;

  if (gd.daMat) {
    row.getCell(colBatDau + 1).value = "死去";
    row.getCell(colBatDau + 2).value = "ー";
    row.getCell(colBatDau + 3).value = "ー";
    row.getCell(colBatDau + 4).value = "ー";
  } else {
    row.getCell(colBatDau + 1).value = cleanVal(gd.tuoi);
    row.getCell(colBatDau + 2).value = cleanVal(gd.ngheNghiep) || "ー";
    row.getCell(colBatDau + 3).value = cleanVal(gd.noiO) || "ー";
    row.getCell(colBatDau + 4).value = cleanVal(gd.lienHe) || "ー";
  }
}

// ===================== ĐIỀN 1 DÒNG HỌC SINH =====================

function excelDienDongHocSinh(row, data, stt) {
  // Cột 1-7: Mã HS, Tên, Katakana, Ngày sinh, Tuổi, Giới tính, Hôn nhân
  row.getCell(1).value = excelTaoMaHS(stt);
  row.getCell(2).value = toUpperNoAccent(data.hoTen);
  row.getCell(3).value = cleanVal(data.tenKatakana);
  row.getCell(4).value = formatBirthDate(data.ngaySinh);
  row.getCell(5).value = cleanVal(data.tuoi);
  row.getCell(6).value = excelGioiTinhJP(data.gioiTinh);
  row.getCell(7).value = excelHonNhanJP(data.honNhan);

  // Cột 8-11: Địa chỉ
  row.getCell(8).value = cleanVal(data.diaChiXa);
  row.getCell(9).value = cleanVal(data.diaChiHuyen);
  row.getCell(10).value = cleanVal(data.diaChiTinh);
  row.getCell(11).value = "";

  // Cột 12-19: Thể lực
  row.getCell(12).value = cleanVal(data.chieuCao);
  row.getCell(13).value = cleanVal(data.canNang);
  row.getCell(14).value = cleanVal(data.nhomMau);
  row.getCell(15).value = excelTayThuanJP(data.tayThuan);
  row.getCell(16).value = cleanVal(data.thiLucPhai) || "1.5";
  row.getCell(17).value = cleanVal(data.thiLucTrai) || "1.5";
  row.getCell(18).value = formatReligion(data.tonGiao === "Khác" ? data.tonGiaoKhac : data.tonGiao);
  row.getCell(19).value = excelCoKhongJP(data.muMau);

  // ===== HỌC VẤN (Cột 20-39): 4 khối x 5 cột =====
  const hocVanList = Array.isArray(data.hocVan) ? data.hocVan.filter((hv) => hv && cleanVal(hv.truong) !== "") : [];
  const hocVanColStarts = [20, 25, 30, 35];

  // Dòng tiếng Nhật cố định (lấy từ dữ liệu form, nếu rỗng thì dùng giá trị mặc định chuẩn)
  const dongTiengNhat = {
    tu: cleanVal(data.tiengNhatTu),
    den: cleanVal(data.tiengNhatDen) || "現在",
    diaDiem: cleanVal(data.tiengNhatDiaDiem) || "HA NOI",
    truong: cleanVal(data.tiengNhatTruong) || "GICC日本語センター",
    mon: cleanVal(data.tiengNhatMon) || "日本語学習",
  };

  // Các khối học vấn thực tế điền trước, dòng tiếng Nhật cố định điền ngay khối tiếp theo
  const khoiHocVan = hocVanList.slice(0, 3).concat([dongTiengNhat]);

  for (let i = 0; i < hocVanColStarts.length; i++) {
    if (khoiHocVan[i]) {
      excelDienKhoiHocVan(row, hocVanColStarts[i], khoiHocVan[i]);
    } else {
      excelDienKhoiHocVan(row, hocVanColStarts[i], {});
    }
  }

  // ===== VIỆC LÀM (Cột 40-67): 4 khối x 7 cột =====
  const congViecList = Array.isArray(data.quaTrinhLamViec)
    ? data.quaTrinhLamViec.filter((cv) => cv && cleanVal(cv.tenCongTy) !== "")
    : [];
  const congViecColStarts = [40, 47, 54, 61];

  for (let i = 0; i < congViecColStarts.length; i++) {
    excelDienKhoiCongViec(row, congViecColStarts[i], congViecList[i] || {});
  }

  // ===== BẰNG CẤP (Cột 68-71) =====
  const bangCapList = Array.isArray(data.bangCap) ? data.bangCap.filter((bc) => bc && cleanVal(bc.tenBangCap) !== "") : [];
  for (let i = 0; i < 4; i++) {
    const bc = bangCapList[i];
    row.getCell(68 + i).value = bc ? cleanVal(bc.tenBangCap) : "";
  }

  // ===== BẬC HỌC CAO NHẤT (Cột 72) =====
  row.getCell(72).value = cleanVal(data.bacHocCaoNhat);

  // ===== GIA ĐÌNH (Cột 73-112): 8 khối x 5 cột =====
  const giaDinhList = Array.isArray(data.giaDinh) ? data.giaDinh : [];
  const nhanMacDinhList = ["父", "母", "兄", "姉", "弟", "妹", "夫", "妻"];
  const giaDinhColStarts = [73, 78, 83, 88, 93, 98, 103, 108];

  for (let i = 0; i < giaDinhColStarts.length; i++) {
    excelDienKhoiGiaDinh(row, giaDinhColStarts[i], giaDinhList[i] || {}, nhanMacDinhList[i]);
  }

  // ===== CỘT 113-116: Xuất ngoại =====
  row.getCell(113).value = excelCoKhongJP(data.xuatNgoai);
  row.getCell(114).value = cleanVal(data.xuatNgoaiNuoc) || "ー";
  row.getCell(115).value = cleanVal(data.xuatNgoaiNoiDung) || "ー";
  row.getCell(116).value = "";

  // ===== NGƯỜI QUEN Ở NHẬT (Cột 117-121) =====
  if (data.nguoiQuenNhat === "co") {
    row.getCell(117).value = "1";
    row.getCell(118).value = cleanVal(data.nguoiQuenQuanHe) || "ー";
    row.getCell(119).value = cleanVal(data.nguoiQuenTuCach) || "ー";
    row.getCell(120).value = "ー";
    row.getCell(121).value = cleanVal(data.nguoiQuenNoiO) || "ー";
  } else {
    row.getCell(117).value = "ー";
    row.getCell(118).value = "ー";
    row.getCell(119).value = "ー";
    row.getCell(120).value = "ー";
    row.getCell(121).value = "ー";
  }

  // ===== THỜI GIAN HỌC TIẾNG NHẬT (Cột 122) =====
  row.getCell(122).value = excelThoiGianHocTiengNhat(data.thoiGianHocTiengNhat, data.baiMinna);

  // ===== CỘT 123-129 =====
  row.getCell(123).value = excelCoKhongJP(data.quanTamNhat);
  row.getCell(124).value = cleanVal(data.songTapTheNam) || cleanVal(data.soNamTheThao) || "";
  row.getCell(125).value = cleanVal(data.songTapTheLoai) || "";
  row.getCell(126).value = excelCoKhongJP(data.xamMinh);
  row.getCell(127).value = excelCoKhongJP(data.hutThuoc);
  row.getCell(128).value = cleanVal(data.soThich) || "";
  row.getCell(129).value = cleanVal(data.tinhCach) || "";

  // ===== CỘT 130-133: IQ =====
  row.getCell(130).value = cleanVal(data.iq1);
  row.getCell(131).value = cleanVal(data.iq2);
  row.getCell(132).value = cleanVal(data.iq3);
  row.getCell(133).value = cleanVal(data.iq4);

  // ===== CỘT 135-136: Năm/Tháng chụp ảnh =====
  const ngayChupAnh = cleanVal(data.ngayChupAnh);
  if (ngayChupAnh) {
    const match = ngayChupAnh.match(/^(\d{4})-(\d{1,2})/);
    if (match) {
      row.getCell(135).value = match[1];
      row.getCell(136).value = String(match[2]).padStart(2, "0");
    } else {
      row.getCell(135).value = ngayChupAnh;
      row.getCell(136).value = "";
    }
  } else {
    row.getCell(135).value = "";
    row.getCell(136).value = "";
  }
}

/**
 * Logic cột 122 - Thời gian học tiếng Nhật
 * - 1-2 tuần -> ghép thêm "・自己紹介"
 * - 3+ tuần hoặc 1-2 tháng (có số bài Minna) -> ghép "・みんなの日本語第X課"
 * - Ngược lại -> giữ nguyên chuỗi (không bỏ trống)
 */
function excelThoiGianHocTiengNhat(thoiGianRaw, baiMinnaRaw) {
  const thoiGian = cleanVal(thoiGianRaw);
  const baiMinna = cleanVal(baiMinnaRaw);

  if (!thoiGian) {
    return "1週間・自己紹介";
  }

  // Trường hợp 1-2 tuần: 1週間, 2週間, 一週間, 二週間, 1 tuần, 2 tuần
  const laTuan1_2 =
    /^(1|一)\s*週間$/.test(thoiGian) ||
    /^(2|二)\s*週間$/.test(thoiGian) ||
    /^(1|một)\s*tuần$/i.test(thoiGian) ||
    /^(2|hai)\s*tuần$/i.test(thoiGian);

  if (laTuan1_2) {
    return `${thoiGian}・自己紹介`;
  }

  // Trường hợp 3+ tuần hoặc 1-2 tháng, có số bài Minna
  const matchTuan = thoiGian.match(/^(\d+)\s*週間$/) || thoiGian.match(/^(\d+)\s*tuần$/i);
  const soTuan = matchTuan ? parseInt(matchTuan[1], 10) : null;

  const laTuTuan3TroLen = soTuan !== null && soTuan >= 3;
  const laThang1_2 =
    /^(1|2)\s*ヶ月$/.test(thoiGian) ||
    /^(1|2)\s*tháng$/i.test(thoiGian) ||
    /^(một|hai)\s*tháng$/i.test(thoiGian);

  if ((laTuTuan3TroLen || laThang1_2) && baiMinna) {
    return `${thoiGian}・みんなの日本語第${baiMinna}課`;
  }

  // Ngược lại: giữ nguyên chuỗi thời gian học
  return thoiGian;
}

// ===================== MỞ/ẨN SHEET MEIBO & CV =====================

function excelMoDongMeibo(workbook, soLuongHocSinh) {
  const sheet = workbook.getWorksheet(EXCEL_MEIBO_SHEET_NAME);
  if (!sheet) return;

  const dongBatDau = 10;
  const soDongToiDa = 100;

  for (let i = 0; i < soDongToiDa; i++) {
    const row = sheet.getRow(dongBatDau + i);
    row.hidden = i >= soLuongHocSinh;
  }
}

function excelMoSheetCV(workbook, soLuongHocSinh) {
  for (let i = 1; i <= EXCEL_SO_SHEET_CV_TOI_DA; i++) {
    const sheet = workbook.getWorksheet(String(i));
    if (!sheet) continue;
    sheet.state = i <= soLuongHocSinh ? "visible" : "hidden";
  }
}

// ===================== XUẤT FILE EXCEL =====================

async function executeExport(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const worksheet = workbook.getWorksheet(EXCEL_SHEET_NAME);
  if (!worksheet) {
    throw new Error(`Không tìm thấy sheet "${EXCEL_SHEET_NAME}" trong template`);
  }

  const danhSach = excelLayDanhSachHocSinh();
  const rowMau = worksheet.getRow(6);

  danhSach.forEach((hocSinh, idx) => {
    const stt = idx + 1;
    const rowIdx = 5 + stt;
    const row = worksheet.getRow(rowIdx);

    // Copy style/border từ dòng mẫu (dòng 6)
    row.height = rowMau.height;
    for (let c = 1; c <= 137; c++) {
      const cellMau = rowMau.getCell(c);
      const cell = row.getCell(c);
      cell.style = JSON.parse(JSON.stringify(cellMau.style));
    }

    excelDienDongHocSinh(row, hocSinh, stt);
    row.commit();
  });

  excelMoDongMeibo(workbook, danhSach.length);
  excelMoSheetCV(workbook, danhSach.length);

  const outBuffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([outBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = EXCEL_OUTPUT_FILENAME;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function exportWorkbookWithTemplate() {
  try {
    const buffer = await getTemplateBuffer();
    await executeExport(buffer);
  } catch (e) {
    console.error("Lỗi khi xuất Excel:", e);
    alert("Có lỗi xảy ra khi xuất file Excel: " + e.message);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const btnXuatExcelFull = document.getElementById("btnXuatExcelFull");
  if (btnXuatExcelFull) {
    btnXuatExcelFull.addEventListener("click", exportWorkbookWithTemplate);
  }
});
