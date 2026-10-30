/**
 * excel-export.js - Xuất Excel ứng viên Form Phổ Thông bằng ExcelJS
 * Kẻ viền đầy đủ, Hỗ trợ N > 8 ứng viên trong Meibo, Viết hoa toàn bộ và Xuất điểm IQ
 */



// Chuyển tiếng Việt thành không dấu và IN HOA
function boDauVaInHoa(str) {
  if (!str) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .trim()
    .toUpperCase();
}

// Chuyển mọi chữ Latin/Romaji sang IN HOA, giữ nguyên Kanji/Kana
function chuInHoa(str) {
  if (!str) return '';
  return String(str).trim().toUpperCase();
}

// Bóc tách địa chỉ Xã / Huyện / Tỉnh và IN HOA
function tachDiaChi(hs) {
  let xa = boDauVaInHoa(hs.diaChiXa);
  let huyen = boDauVaInHoa(hs.diaChiHuyen);
  let tinh = boDauVaInHoa(hs.diaChiTinh || hs.queQuan);

  if ((!xa || !huyen) && hs.queQuan) {
    const rawParts = hs.queQuan.split(/[\,\-]/).map(p => p.trim()).filter(Boolean);
    if (rawParts.length >= 3) {
      xa = boDauVaInHoa(rawParts[0].replace(/^(xa|phuong|thi tran)\s+/i, ''));
      huyen = boDauVaInHoa(rawParts[1].replace(/^(huyen|quan|thi xa|tp|thanh pho)\s+/i, ''));
      tinh = boDauVaInHoa(rawParts[2].replace(/^(tinh|tp|thanh pho)\s+/i, ''));
    } else if (rawParts.length === 2) {
      huyen = boDauVaInHoa(rawParts[0]);
      tinh = boDauVaInHoa(rawParts[1]);
    }
  }

  return { xa, huyen, tinh };
}

function phanLoaiBangCap(tenTruong, nganhHoc) {
  const str = ((tenTruong || '') + ' ' + (nganhHoc || '')).toLowerCase();
  if (str.includes('đại học') || str.includes('dai hoc') || str.includes('đh') || str.includes('dh') || str.includes('university') || str.includes('大学')) {
    return { tenBang: '大学卒業証書', bacHoc: '大学' };
  }
  if (str.includes('cao đẳng') || str.includes('cao dang') || str.includes('cđ') || str.includes('cd') || str.includes('junior college') || str.includes('短期') || str.includes('短大')) {
    return { tenBang: '短期大学卒業証書', bacHoc: '短大' };
  }
  if (str.includes('trung cấp') || str.includes('trung cap') || str.includes('tc') || str.includes('nghề') || str.includes('nghe') || str.includes('chuyên nghiệp') || str.includes('vocational') || str.includes('専門')) {
    return { tenBang: '専門卒業証書', bacHoc: '専門' };
  }
  return { tenBang: '高校卒業証書', bacHoc: '高校' };
}

function formatYearMonth(str) {
  if (!str) return '';
  const s = String(str).trim();
  if (s === '現在') return '現在';
  const parts = s.split(/[\/\-]/);
  if (parts.length === 2) {
    let m = parseInt(parts[0], 10);
    let y = parseInt(parts[1], 10);
    if (parts[0].length === 4) { y = parseInt(parts[0], 10); m = parseInt(parts[1], 10); }
    if (m >= 1 && m <= 12 && y >= 1900) return `${y}年${String(m).padStart(2, '0')}月`;
  }
  return s;
}

function formatBirth(str) {
  if (!str) return '';
  const parts = String(str).trim().split(/[\/\-]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) return `${parseInt(parts[0], 10)}年${parseInt(parts[1], 10)}月${parseInt(parts[2], 10)}日`;
    return `${parseInt(parts[2], 10)}年${parseInt(parts[1], 10)}月${parseInt(parts[0], 10)}日`;
  }
  return str;
}

function tinhTuoi(birthStr) {
  if (!birthStr) return '';
  const parts = String(birthStr).trim().split(/[\/\-]/);
  let birthYear = 0;
  if (parts.length === 3) {
    birthYear = parts[0].length === 4 ? parseInt(parts[0], 10) : parseInt(parts[2], 10);
  }
  const curYear = new Date().getFullYear();
  return (birthYear > 1900 && birthYear <= curYear) ? (curYear - birthYear) : '';
}

function tachNgayThangNam(dateStr) {
  const d = new Date();
  if (dateStr) {
    const s = String(dateStr).trim();
    if (s.includes('-')) {
      const parts = s.split('-');
      if (parts.length === 3 && parts[0].length === 4) {
        return { nam: parseInt(parts[0], 10), thang: parseInt(parts[1], 10), ngay: parseInt(parts[2], 10) };
      }
    } else if (s.includes('/')) {
      const parts = s.split('/');
      if (parts.length === 3) {
        if (parts[2].length === 4) {
          return { ngay: parseInt(parts[0], 10), thang: parseInt(parts[1], 10), nam: parseInt(parts[2], 10) };
        } else if (parts[0].length === 4) {
          return { nam: parseInt(parts[0], 10), thang: parseInt(parts[1], 10), ngay: parseInt(parts[2], 10) };
        }
      }
    }
  }
  return { ngay: d.getDate(), thang: d.getMonth() + 1, nam: d.getFullYear() };
}

// Chuyển số người sang dạng số fullwidth (kanji-style) dùng trong câu tiếng Nhật
// 4 -> ４, 6 -> ６, 10 -> １０ (giữ nguyên nếu không phải số)
function toSoNguoiKanji(val) {
  const n = parseInt(val, 10);
  if (isNaN(n) || n <= 0) return String(val || '');
  return String(n).replace(/[0-9]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0xFEE0));
}

// Format ngày phỏng vấn yyyy-mm-dd -> yyyy年M月D日
function formatNgayPhongVan(str) {
  if (!str) return '';
  const m = String(str).match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!m) return String(str).trim();
  return `${m[1]}年${parseInt(m[2], 10)}月${parseInt(m[3], 10)}日`;
}

// ===== CACHE TEMPLATE XLSX TRONG INDEXEDDB =====
// Mục đích: tránh phải chọn file template.xlsx mỗi lần xuất Excel.
// Lần đầu: thử fetch('template.xlsx'); nếu bị chặn (file:///), hỏi người dùng chọn file 1 lần,
// sau đó lưu ArrayBuffer vào IndexedDB. Các lần sau đọc trực tiếp từ cache.
const TEMPLATE_DB_NAME = 'nhapform_template_cache';
const TEMPLATE_STORE_NAME = 'templates';
const TEMPLATE_CACHE_KEY = 'pho-thong-template.xlsx';

function moTemplateDB() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) { reject(new Error('Trình duyệt không hỗ trợ IndexedDB')); return; }
    const req = indexedDB.open(TEMPLATE_DB_NAME, 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(TEMPLATE_STORE_NAME)) {
        db.createObjectStore(TEMPLATE_STORE_NAME);
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

async function docTemplateCache() {
  try {
    const db = await moTemplateDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(TEMPLATE_STORE_NAME, 'readonly');
      const store = tx.objectStore(TEMPLATE_STORE_NAME);
      const req = store.get(TEMPLATE_CACHE_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('Không đọc được cache template:', e);
    return null;
  }
}

async function luuTemplateCache(arrayBuffer) {
  try {
    const db = await moTemplateDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(TEMPLATE_STORE_NAME, 'readwrite');
      const store = tx.objectStore(TEMPLATE_STORE_NAME);
      const req = store.put(arrayBuffer, TEMPLATE_CACHE_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('Không lưu được cache template:', e);
  }
}

// Xóa cache template (dùng khi muốn chọn lại file template khác)
async function xoaTemplateCache(imLang = false) {
  try {
    const db = await moTemplateDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(TEMPLATE_STORE_NAME, 'readwrite');
      const store = tx.objectStore(TEMPLATE_STORE_NAME);
      const req = store.delete(TEMPLATE_CACHE_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    if (!imLang) alert('Đã xóa cache template. Lần xuất Excel tiếp theo sẽ hỏi chọn file template.xlsx.');
  } catch (e) {
    console.warn('Không xóa được cache template:', e);
  }
}
window.xoaTemplateCache = xoaTemplateCache;

async function taiArrayBufferTemplate() {
  // 1. Thử đọc từ cache trước (không cần chọn file)
  const cached = await docTemplateCache();
  if (cached) {
    try { return cached.slice(0); } catch (e) { return cached; }
  }

  // 2. Thử fetch (khi chạy qua HTTP server / Go Live)
  try {
    const response = await fetch('template.xlsx');
    if (response.ok) {
      const ab = await response.arrayBuffer();
      await luuTemplateCache(ab);
      return ab;
    }
  } catch (e) {
    console.warn('Fetch template bị chặn (file:///):', e);
  }

  // 3. Fallback: hỏi người dùng chọn file 1 lần, rồi cache lại
  return new Promise((resolve, reject) => {
    alert('Trình duyệt đang chặn tải file template.xlsx do mở trực tiếp bằng file:///.\n\nVui lòng chọn file template.xlsx trong thư mục pho-thong ở hộp thoại tiếp theo. (Chỉ hỏi 1 lần, các lần sau sẽ dùng cache.)');

    let fileInput = document.getElementById('input-file-template-fallback');
    if (!fileInput) {
      fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.id = 'input-file-template-fallback';
      fileInput.accept = '.xlsx';
      fileInput.style.display = 'none';
      document.body.appendChild(fileInput);
    }

    fileInput.onchange = async (event) => {
      const file = event.target.files[0];
      if (!file) {
        reject(new Error('Chưa chọn file template.xlsx!'));
        return;
      }
      try {
        const ab = await file.arrayBuffer();
        await luuTemplateCache(ab);
        resolve(ab);
      } catch (err) {
        reject(err);
      }
    };
    fileInput.click();
  });
}

// HÀM CHÍNH: XUẤT EXCEL CHO FORM PHỔ THÔNG
async function xuatExcelPhoThong() {
  const danhSach = window.layDanhSachHoSo ? window.layDanhSachHoSo() : [];
  if (!danhSach || danhSach.length === 0) {
    alert('Chưa có ứng viên nào trong danh sách để xuất Excel!');
    return;
  }

  try {
    // Nếu cache template đang là template CŨ chưa có sheet 名簿 / thiếu vùng merge -> xóa và tải lại
    const taiTemplateSach = async () => {
      let ab = await taiArrayBufferTemplate();
      let wbThu = new ExcelJS.Workbook();
      try {
        await wbThu.xlsx.load(ab);
      } catch (e) {
        wbThu = null;
      }
      const wsThu = wbThu ? wbThu.getWorksheet('名簿') : null;
      const thieu = !wbThu || !wsThu || !wsThu.model.merges || !wsThu.model.merges.includes('C3:E3');
      if (thieu) {
        console.warn('[NhapForm] Cache template cũ/không hợp lệ -> xóa cache và tải lại template.xlsx');
        await xoaTemplateCache(true);
        ab = await taiArrayBufferTemplate();
      }
      return ab;
    };

    const arrayBuffer = await taiTemplateSach();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    const wsData = workbook.getWorksheet('総合データ');
    if (!wsData) throw new Error('Template thiếu sheet "総合データ"!');
    const wsMeibo = workbook.getWorksheet('名簿');
    if (wsMeibo) {
      console.log('[名簿] merges chứa C3:E3 ?', (wsMeibo.model.merges || []).includes('C3:E3'));
    } else {
      console.warn('[名簿] KHÔNG tìm thấy sheet 名簿 trong template!');
    }

    // 1b. GHI THÔNG TIN ĐỢT TUYỂN VÀO ĐẦU SHEET 名簿
    // C3 = 技能実習実施機関 | M3 = 職種 | C4 = 監理団体 | M4 = 面接日
    // 4 ô này đều là ô đầu (master) của vùng merge: C3:E3, M3:T3, C4:E4, M4:R4
    let thongTinDot = (typeof window.docThongTinDot === 'function')
      ? window.docThongTinDot()
      : { tenXiNghiep: '', nghiepDoan: '', ngheNghiep: '', ngayPhongVan: '' };

    // Dự phòng: nếu đọc từ form ra rỗng thì lấy giá trị đã lưu gần nhất
    try {
      const trong = ['tenXiNghiep', 'nghiepDoan', 'ngheNghiep', 'ngayPhongVan']
        .every(k => !thongTinDot || !String(thongTinDot[k] || '').trim());
      if (trong) {
        const rawLast = (typeof SafeStorage !== 'undefined')
          ? SafeStorage.getItem('nhapform_thong_tin_dot_last')
          : null;
        if (rawLast) {
          const last = JSON.parse(rawLast);
          if (last && typeof last === 'object') {
            thongTinDot = {
              tenXiNghiep: last.tenXiNghiep || '',
              nghiepDoan: last.nghiepDoan || '',
              ngheNghiep: last.ngheNghiep || '',
              ngayPhongVan: last.ngayPhongVan || ''
            };
            console.warn('[名簿] Form rỗng -> dùng giá trị đã lưu gần nhất:', thongTinDot);
          }
        }
      }
    } catch (e) {}

    console.log('[名簿] Thông tin đợt tuyển đọc từ form:', thongTinDot);
    console.log('[名簿] Tên XN = "' + (thongTinDot.tenXiNghiep || '') + '" | Nghiệp đoàn = "' + (thongTinDot.nghiepDoan || '') + '" | Nghề = "' + (thongTinDot.ngheNghiep || '') + '" | Ngày PV = "' + (thongTinDot.ngayPhongVan || '') + '"');

    // Ghi đè bằng cách unmerge -> set value -> merge lại, để giá trị mới chắc chắn thay thế giá trị template
    const ghiHeaderMeibo = (addr, giaTri) => {
      const text = (giaTri === null || giaTri === undefined) ? '' : String(giaTri).trim();
      if (!text || !wsMeibo) return;
      const merged = wsMeibo.getCell(addr).isMerged
        ? wsMeibo.getCell(addr).master.address
        : null;
      const rng = merged ? wsMeibo.model.merges.find(r => r.split(':')[0] === merged) : null;
      try {
        if (rng) {
          wsMeibo.unMergeCells(rng);
          wsMeibo.getCell(addr).value = text;
          wsMeibo.mergeCells(rng);
        } else {
          wsMeibo.getCell(addr).value = text;
        }
      } catch (e) {
        console.warn('[NhapForm] Không ghi được ô ' + addr + ' sheet 名簿:', e);
        try { wsMeibo.getCell(addr).value = text; } catch (e2) {}
      }
    };

    ghiHeaderMeibo('C3', thongTinDot.tenXiNghiep);
    ghiHeaderMeibo('M3', thongTinDot.ngheNghiep);
    ghiHeaderMeibo('C4', thongTinDot.nghiepDoan);
    ghiHeaderMeibo('M4', formatNgayPhongVan(thongTinDot.ngayPhongVan));

    const N = danhSach.length;

    // Định nghĩa kẻ viền đen (thin border)
    const borderThin = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } }
    };

    // 1. ĐỔ 137 CỘT CHO TỪNG ỨNG VIÊN VÀO 総合データ
    danhSach.forEach((hs, idx) => {
      const stt = idx + 1;
      const rowIdx = 5 + stt;
      const row = wsData.getRow(rowIdx);
      const maHs = `TRA${String(stt).padStart(3, '0')}`;

      const addr = tachDiaChi(hs);

      // Cột 1 - 7: Thông tin định danh (IN HOA TOÀN BỘ)
      row.getCell(1).value = maHs;
      row.getCell(2).value = boDauVaInHoa(hs.hoTen);
      row.getCell(3).value = hs.tenKatakana ? hs.tenKatakana.toUpperCase() : (hs.furigana ? hs.furigana.toUpperCase() : '');
      row.getCell(4).value = formatBirth(hs.ngaySinh);
      row.getCell(5).value = tinhTuoi(hs.ngaySinh);
      row.getCell(6).value = (hs.gioiTinh === 'Nam' || hs.gioiTinh === '男') ? '男' : '女';
      row.getCell(7).value = (hs.honNhan === 'Đã kết hôn' || hs.honNhan === '既婚') ? '既婚' : '独身';

      // Cột 8 - 11: Địa chỉ Xã / Huyện / Tỉnh (IN HOA TOÀN BỘ)
      row.getCell(8).value = addr.xa;
      row.getCell(9).value = addr.huyen;
      row.getCell(10).value = addr.tinh;
      if (!row.getCell(11).value) {
        row.getCell(11).value = { formula: `VLOOKUP(J${rowIdx},'khoảng cách'!$A$3:$E$65,4,0)` };
      }

      // Cột 12 - 19: Thể lực
      row.getCell(12).value = hs.chieuCao ? Number(hs.chieuCao) : '';
      row.getCell(13).value = hs.canNang ? Number(hs.canNang) : '';
      row.getCell(14).value = hs.nhomMau ? hs.nhomMau.toUpperCase() : 'A';
      row.getCell(15).value = (hs.tayThuan === 'Trái' || hs.tayThuan === '左') ? '左' : '右';
      row.getCell(16).value = hs.thiLucPhai ? String(hs.thiLucPhai) : '1.0';
      row.getCell(17).value = hs.thiLucTrai ? String(hs.thiLucTrai) : '1.0';
      row.getCell(18).value = '無';
      row.getCell(19).value = '無';

      // Cột 20 - 39: Học vấn (IN HOA TÊN TRƯỜNG & TỈNH)
      const regularEdu = (hs.hocVan || []).filter(e => {
        const t = (e.truong || '').toLowerCase();
        return t && !t.includes('gicc') && !t.includes('tiếng nhật') && !t.includes('tieng nhat') && !t.includes('日本語') && !t.includes('センター');
      });

      const eduSlots = [];
      regularEdu.forEach(edu => {
        let mon = edu.khoa || '';
        if ((edu.truong.includes('高校') || edu.truong.toLowerCase().includes('thpt') || edu.truong.toLowerCase().includes('cấp 3')) && !mon) {
          mon = '普通科';
        }
        eduSlots.push({
          tu: formatYearMonth(edu.tu),
          den: formatYearMonth(edu.den),
          tinh: boDauVaInHoa(edu.tinh),
          truong: chuInHoa(edu.truong),
          khoa: mon
        });
      });

      // Dòng GICC tiếng Nhật luôn ở cuối cùng
      eduSlots.push({
        tu: formatYearMonth(hs.tiengNhatTu || '10/2026'),
        den: '現在',
        tinh: boDauVaInHoa(hs.tiengNhatDiaDiem || hs.tiengNhatDiaChi || 'HA NOI'),
        truong: hs.tiengNhatTruong || hs.tiengNhatTrungTam || 'GICC日本語センター',
        khoa: hs.tiengNhatMon || '日本語学習'
      });

      for (let k = 0; k < 4; k++) {
        const baseCol = 20 + k * 5;
        if (k < eduSlots.length) {
          const item = eduSlots[k];
          row.getCell(baseCol).value = item.tu;
          row.getCell(baseCol + 1).value = item.den;
          row.getCell(baseCol + 2).value = item.tinh;
          row.getCell(baseCol + 3).value = item.truong;
          row.getCell(baseCol + 4).value = item.khoa;
        } else {
          for (let c = 0; c < 5; c++) row.getCell(baseCol + c).value = '';
        }
      }

      // Cột 40 - 67: Công việc (IN HOA TÊN CÔNG TY & TỈNH)
      const workList = hs.congViec || [];
      for (let k = 0; k < 4; k++) {
        const baseCol = 40 + k * 7;
        if (k < workList.length) {
          const w = workList[k];
          row.getCell(baseCol).value = formatYearMonth(w.tu);
          row.getCell(baseCol + 1).value = formatYearMonth(w.den);
          row.getCell(baseCol + 2).value = boDauVaInHoa(w.tinh);
          row.getCell(baseCol + 3).value = chuInHoa(w.cty);
          row.getCell(baseCol + 4).value = chuInHoa(w.ndcv);
          row.getCell(baseCol + 5).value = w.luong || '';
          row.getCell(baseCol + 6).value = w.thoiGianLam || '';
        } else {
          for (let c = 0; c < 7; c++) row.getCell(baseCol + c).value = '';
        }
      }

      // Cột 68 - 72: Bằng cấp & Bậc học
      let c68 = '', c69 = '', c70 = '', c71 = '';
      let bacCaoNhat = hs.bacHocCaoNhat || '高校';

      const bangCapList = hs.bangCap || [];
      if (bangCapList.length > 0) {
        c68 = formatYearMonth(bangCapList[0].ngay);
        c69 = bangCapList[0].ten || '高校卒業証書';
        if (bangCapList.length >= 2) {
          c70 = formatYearMonth(bangCapList[1].ngay);
          c71 = bangCapList[1].ten || '';
          const info = phanLoaiBangCap(c71, '');
          bacCaoNhat = info.bacHoc;
        }
      } else {
        if (regularEdu.length === 1) {
          c68 = formatYearMonth(regularEdu[0].den);
          const info = phanLoaiBangCap(regularEdu[0].truong, regularEdu[0].khoa);
          c69 = info.tenBang;
          bacCaoNhat = info.bacHoc;
        } else if (regularEdu.length >= 2) {
          c68 = formatYearMonth(regularEdu[0].den);
          c69 = '高校卒業証書';
          c70 = formatYearMonth(regularEdu[1].den);
          const info = phanLoaiBangCap(regularEdu[1].truong, regularEdu[1].khoa);
          c71 = (info.bacHoc === '高校') ? '大学卒業証書' : info.tenBang;
          bacCaoNhat = (info.bacHoc === '高校') ? '大学' : info.bacHoc;
        }
      }

      row.getCell(68).value = c68;
      row.getCell(69).value = c69;
      row.getCell(70).value = c70;
      row.getCell(71).value = c71;
      row.getCell(72).value = bacCaoNhat;

      hs._c68 = c68;
      hs._c69 = c69;
      hs._c70 = c70;
      hs._c71 = c71;

      // Cột 73 - 112: Gia đình
      const famList = hs.giaDinh || [];
      for (let k = 0; k < 8; k++) {
        const baseCol = 73 + k * 5;
        if (k < famList.length) {
          const f = famList[k];
          row.getCell(baseCol).value = f.quanHe || '';
          if (f.daMat) {
            row.getCell(baseCol + 1).value = '死去';
            row.getCell(baseCol + 2).value = 'ー';
            row.getCell(baseCol + 3).value = 'ー';
            row.getCell(baseCol + 4).value = 'ー';
          } else {
            row.getCell(baseCol + 1).value = tinhTuoi(f.namSinh) || f.namSinh || '';
            row.getCell(baseCol + 2).value = (f.songChung === '有' || f.songChung === 'Có') ? '有' : '無';
            row.getCell(baseCol + 3).value = chuInHoa(f.ngheNghiep);
            row.getCell(baseCol + 4).value = f.thuNhap || '';
          }
        } else {
          for (let c = 0; c < 5; c++) row.getCell(baseCol + c).value = '';
        }
      }

      // Cột 113 - 114: Xuất ngoại (IN HOA)
      const daDi = (hs.xuatNgoai === 'Có' || hs.xuatNgoai === 'co' || hs.xuatNgoai === '有' || hs.xuatNgoaiNuoc);
      if (daDi) {
        row.getCell(113).value = chuInHoa(hs.xuatNgoaiNuoc || '日本');
        row.getCell(114).value = chuInHoa(hs.xuatNgoaiNoiDung || '技能実習');
      } else {
        row.getCell(113).value = '無';
        row.getCell(114).value = '無';
      }

      // Cột 115 - 116: Thể thao
      if (hs.tenTheThao) {
        row.getCell(115).value = hs.tenTheThao;
        row.getCell(116).value = hs.soNamTheThao ? `${hs.soNamTheThao}年` : '3年';
      } else {
        row.getCell(115).value = 'ー';
        row.getCell(116).value = 'ー';
      }

      // Cột 117 - 121: Người quen tại Nhật
      const coNguoiQuen = (hs.nguoiQuenNhat === 'Có' || hs.nguoiQuenNhat === 'co' || hs.nguoiQuenNhat === '有' || hs.nguoiQuenQuanHe);
      if (coNguoiQuen) {
        row.getCell(117).value = hs.nguoiQuenSoLuong ? Number(hs.nguoiQuenSoLuong) : 1;
        row.getCell(118).value = hs.nguoiQuenQuanHe || 'ー';
        row.getCell(119).value = hs.nguoiQuenTuCach || 'ー';
        row.getCell(120).value = hs.nguoiQuenCongViec ? chuInHoa(hs.nguoiQuenCongViec) : 'ー';
        row.getCell(121).value = hs.nguoiQuenNoiO || 'ー';
      } else {
        row.getCell(117).value = 'ー';
        row.getCell(118).value = 'ー';
        row.getCell(119).value = 'ー';
        row.getCell(120).value = 'ー';
        row.getCell(121).value = 'ー';
      }

      // Cột 122: Thời gian học tiếng Nhật
      let studyStr = '';
      if (hs.thoiGianHocTiengNhat) {
        const tg = hs.thoiGianHocTiengNhat;
        const bai = hs.baiMinna || '8';
        if (tg.includes('tuần') || tg.includes('週')) {
          studyStr = '一週間・自己紹介';
        } else {
          studyStr = `${tg}・みんなの日本語第${bai}課`;
        }
      }
      row.getCell(122).value = studyStr || '1ヶ月・みんなの日本語第8課';

      // Cột 123 - 129: Đặc điểm, sở thích
      row.getCell(123).value = hs.lyDoDiNhat || '日本の進んだ技術と文化';

      // Cột 124 - 125: Kinh nghiệm sống tập thể
      // Dạng chuẩn: [Loại hình]で[ số người]人部屋で集団生活しました
      // Ví dụ: アパートで５人部屋で集団生活しました
      const soNamSongTapThe = hs.songTapTheNam || '2年';
      const loaiHinhSongTapThe = hs.songTapTheLoai || '寮';
      const soNguoiSongTapThe = toSoNguoiKanji(hs.songTapTheSoNguoi || 6);
      row.getCell(124).value = soNamSongTapThe;
      row.getCell(125).value = `${loaiHinhSongTapThe}で${soNguoiSongTapThe}人部屋で集団生活しました`;
      // Hình xăm: 無 hoặc 有(左手、背中)
      const xamRaw = String(hs.xamMinh || '').trim();
      let xamExcel = '無';
      if (xamRaw === '有' || xamRaw === 'Có') {
        xamExcel = '有';
      } else if (xamRaw.startsWith('有')) {
        xamExcel = xamRaw;
      }
      row.getCell(126).value = xamExcel;
      row.getCell(127).value = (hs.hutThuoc === 'Có' || hs.hutThuoc === '有') ? '有' : '無';
      row.getCell(128).value = hs.soThich ? hs.soThich.trim() : 'サッカー';
      row.getCell(129).value = hs.tinhCach || '明るく、責任感が強い';

      // Cột 130 - 133: ĐIỂM IQ 1, 2, 3, 4 (XUẤT ĐẦY ĐỦ DẠNG SỐ)
      row.getCell(130).value = hs.iq1 ? Number(hs.iq1) : '';
      row.getCell(131).value = hs.iq2 ? Number(hs.iq2) : '';
      row.getCell(132).value = hs.iq3 ? Number(hs.iq3) : '';
      row.getCell(133).value = hs.iq4 ? Number(hs.iq4) : '';
      row.getCell(134).value = '';

      // Cột 135 - 137: Ngày chụp ảnh (định dạng 年月日)
      const dInfo = tachNgayThangNam(hs.ngayChup);
      row.getCell(135).value = dInfo.ngay;
      row.getCell(136).value = dInfo.thang;
      row.getCell(137).value = dInfo.nam;
      // Ghi thêm cột 138: Ngày chụp ảnh đầy đủ 年月日
      row.getCell(138).value = formatBirth(hs.ngayChup);

      // KẺ VIỀN THIN CHO TẤT CẢ 137 CỘT CỦA DÒNG NÀY TRONG 総合データ
      for (let c = 1; c <= 137; c++) {
        row.getCell(c).border = borderThin;
      }

      row.commit();
    });

    // 2. CHUẨN HÓA SHEET 名簿 (HỖ TRỢ ĐẦY ĐỦ KHI N > 8, KẺ VIỀN VÀ FIT 1 TRANG A4)
    if (wsMeibo) {
      const row18 = wsMeibo.getRow(18);

      for (let s = 1; s <= 35; s++) {
        const rowIdx = 10 + s;
        const row = wsMeibo.getRow(rowIdx);

        if (s <= N) {
          row.hidden = false;
          row.height = 42.75;

          // Cột 1: STT
          row.getCell(1).value = s;

          // Cột 31 (AE): Mã TRA
          const maTra = `TRA${String(s).padStart(3, '0')}`;
          row.getCell(31).value = maTra;

          // Nếu s > 8 (các dòng vượt quá mẫu gốc của template), tự động tạo công thức VLOOKUP & merge K:L
          if (s > 8) {
            row.getCell(2).value = { formula: `VLOOKUP($AE${rowIdx},総合データ!$1:$1048576,3,0)` };
            row.getCell(3).value = { formula: `VLOOKUP($AE${rowIdx},総合データ!$1:$1048576,2,0)` };
            row.getCell(4).value = { formula: `VLOOKUP(AE${rowIdx},総合データ!$1:$1048576,6,0)` };
            row.getCell(5).value = { formula: `VLOOKUP($AE${rowIdx},総合データ!$1:$1048576,4,0)` };
            row.getCell(6).value = { formula: `VLOOKUP(AE${rowIdx},総合データ!$1:$1048576,5,0)` };
            row.getCell(7).value = { formula: `VLOOKUP(AE${rowIdx},総合データ!$1:$1048576,7,0)` };
            row.getCell(8).value = { formula: `VLOOKUP(AE${rowIdx},総合データ!$1:$1048576,10,0)` };
            row.getCell(9).value = { formula: `VLOOKUP(H${rowIdx},'khoảng cách'!$A$3:$E$65,4,0)` };
            row.getCell(10).value = { formula: `VLOOKUP(AE${rowIdx},総合データ!$1:$1048576,72,0)` };
            row.getCell(11).value = { formula: `VLOOKUP(AE${rowIdx},総合データ!$1:$1048576,44,0)` };
            row.getCell(13).value = { formula: `VLOOKUP(AE${rowIdx},総合データ!$1:$1048576,14,0)` };
            row.getCell(14).value = { formula: `VLOOKUP(AE${rowIdx},総合データ!$1:$1048576,12,0)` };
            row.getCell(15).value = { formula: `VLOOKUP(AE${rowIdx},総合データ!$1:$1048576,13,0)` };
            row.getCell(16).value = { formula: `VLOOKUP(AE${rowIdx},総合データ!$1:$1048576,16,0)` };
            row.getCell(17).value = { formula: `VLOOKUP(AE${rowIdx},総合データ!$1:$1048576,17,0)` };
            row.getCell(18).value = { formula: `VLOOKUP(AE${rowIdx},総合データ!$1:$1048576,130,0)` };
            row.getCell(19).value = { formula: `VLOOKUP(AE${rowIdx},総合データ!$1:$1048576,131,0)` };
            row.getCell(20).value = { formula: `VLOOKUP(AE${rowIdx},総合データ!$1:$1048576,132,0)` };
            row.getCell(21).value = { formula: `VLOOKUP(AE${rowIdx},総合データ!$1:$1048576,133,0)` };
            row.getCell(22).value = { formula: `VLOOKUP(AE${rowIdx},総合データ!$1:$1048576,134,0)` };

            try {
              wsMeibo.mergeCells(rowIdx, 11, rowIdx, 12);
            } catch (e) {}

            // Sao chép định dạng font, căn lề từ dòng 18
            for (let c = 1; c <= 22; c++) {
              const src = row18.getCell(c);
              const dest = row.getCell(c);
              if (src.font) dest.font = { ...src.font };
              if (src.alignment) dest.alignment = { ...src.alignment };
            }
          }

          // KẺ VIỀN CHUẨN CHO TỪNG Ô TRONG DÒNG CỦA MEIBO
          for (let c = 1; c <= 22; c++) {
            row.getCell(c).border = {
              top: { style: 'dotted', color: { argb: 'FF808080' } },
              bottom: { style: s === N ? 'medium' : 'dotted', color: { argb: 'FF000000' } },
              left: { style: 'thin', color: { argb: 'FF000000' } },
              right: { style: 'thin', color: { argb: 'FF000000' } }
            };
            row.getCell(c).alignment = { wrapText: true, vertical: 'top', horizontal: 'left' };
          }
        } else {
          row.hidden = true;
        }
      }

      // Cập nhật vùng in và fitToPage
      wsMeibo.pageSetup = {
        ...wsMeibo.pageSetup,
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 1,
        orientation: 'landscape',
        paperSize: 9,
        printArea: `A1:AD${10 + N}`
      };

      // Đặt chiều rộng cột cho sheet 名簿 để hiển thị đầy đủ nội dung (ví dụ: lý do đến Nhật)
      const colWidths = {
        1: 5,   // STT
        2: 12,  // Mã TRA
        3: 18,  // Họ tên (フリガナ/名前)
        4: 12,  // Ngày sinh
        5: 6,   // Tuổi
        6: 6,   // Giới tính
        7: 10,  // Hôn nhân
        8: 16,  // Xã
        9: 16,  // Huyện
        10: 16, // Tỉnh
        11: 10, // Khoảng cách
        12: 10, // Chiều cao
        13: 10, // Cân nặng
        14: 10, // Nhóm máu
        15: 8,  // Tay thuận
        16: 10, // Thị lực phải
        17: 10, // Thị lực trái
        18: 10, // ...
        19: 10, // ...
        20: 12, // Học vấn từ
        21: 12, // Học vấn đến
        22: 16, // Tỉnh học vấn
        23: 28, // Trường học
        24: 16, // Khoa học
        123: 45 // Lý do đến Nhật (日本に興味を持っていること)
      };
      Object.entries(colWidths).forEach(([col, width]) => {
        wsMeibo.getColumn(parseInt(col, 10)).width = width;
      });
    }

    // 3. ĐỒNG BỘ SHEET FORM CÁ NHÂN 1 ĐẾN 26 (CẬP NHẬT KẾT QUẢ VLOOKUP VÀ IQ)
    for (let s = 1; s <= 26; s++) {
      const sh = workbook.getWorksheet(String(s));
      if (sh) {
        if (s <= N) {
          sh.state = 'visible';
          const maHs = `TRA${String(s).padStart(3, '0')}`;
          sh.getCell('V5').value = maHs;

          const hs = danhSach[s - 1];
          const dInfo = tachNgayThangNam(hs.ngayChup);
          const addr = tachDiaChi(hs);

          // Cập nhật kết quả hiển thị địa chỉ IN HOA
          sh.getCell('C9').value = { formula: `VLOOKUP(V5,'総合データ'!$1:$1050228,10,0)&"  省 "`, result: `${addr.tinh}  省 ` };
          sh.getCell('G9').value = { formula: `VLOOKUP(V5,'総合データ'!$1:$1050228,9,0)&"  郡"`, result: `${addr.huyen}  郡` };
          sh.getCell('J9').value = { formula: `VLOOKUP(V5,'総合データ'!$1:$1050228,8,0)&"  地区"`, result: `${addr.xa}  地区` };

          // Điểm IQ 1, 2, 3, 4 trên sheet form cá nhân
          sh.getCell('C14').value = { formula: `VLOOKUP(V5,'総合データ'!$1:$1050228,130,0)`, result: hs.iq1 ? Number(hs.iq1) : '' };
          sh.getCell('F14').value = { formula: `VLOOKUP(V5,'総合データ'!$1:$1050228,131,0)`, result: hs.iq2 ? Number(hs.iq2) : '' };
          sh.getCell('I14').value = { formula: `VLOOKUP(V5,'総合データ'!$1:$1050228,132,0)`, result: hs.iq3 ? Number(hs.iq3) : '' };
          sh.getCell('L14').value = { formula: `VLOOKUP(V5,'総合データ'!$1:$1050228,133,0)`, result: hs.iq4 ? Number(hs.iq4) : '' };

          // Ngày chụp ảnh
          sh.getCell('P13').value = { formula: `VLOOKUP(V5,'総合データ'!$1:$1050228,137,0)&" 年"`, result: `${dInfo.nam} 年` };
          sh.getCell('Q13').value = { formula: `VLOOKUP(V5,'総合データ'!$1:$1050228,136,0)&" 月"`, result: `${dInfo.thang} 月` };
          sh.getCell('R13').value = { formula: `VLOOKUP(V5,'総合データ'!$1:$1050228,135,0)&" 日"`, result: `${dInfo.ngay} 日` };

          // Bằng cấp
          sh.getCell('A32').value = { formula: `VLOOKUP(V5,'総合データ'!$1:$1050228,68,0)`, result: hs._c68 || '' };
          sh.getCell('C32').value = { formula: `VLOOKUP($V$5,'総合データ'!$1:$1050228,69,0)`, result: hs._c69 || '' };
          sh.getCell('A33').value = { formula: `VLOOKUP(V5,'総合データ'!$1:$1050228,70,0)`, result: hs._c70 || '' };
          sh.getCell('C33').value = { formula: `VLOOKUP($V$5,'総合データ'!$1:$1050228,71,0)`, result: hs._c71 || '' };
        } else {
          sh.state = 'hidden';
        }
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DANH_SACH_UNG_VIEN_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    alert(`Xuất thành công file Excel cho ${N} ứng viên!`);
  } catch (err) {
    console.error('Lỗi xuất Excel:', err);
    alert('Lỗi xuất Excel: ' + err.message);
  }
}

window.xuatExcelPhoThong = xuatExcelPhoThong;
window.xuatExcel = xuatExcelPhoThong;
