/**
 * storage.js - Quản lý Form, Bảng động, Gợi ý và Danh sách học sinh đã lưu
 * Sửa lỗi: Lưu hồ sơ không được ghi đè mất dữ liệu cũ (thêm mới = push, sửa = cập nhật đúng vị trí)
 * Cập nhật:
 *  - Ngày chụp ảnh luôn tự điền ngày hiện tại theo giờ địa phương (không bao giờ bị rỗng)
 *  - Dòng học tiếng Nhật (GICC) dùng ô input text tự do thay cho select Tỉnh/TP
 *  - Thêm nút [Tạo mới file Excel] cạnh nút Lưu hồ sơ / Xuất Excel
 */

const STORAGE_KEY = 'nhapform_danh_sach_ung_vien';
// Thông tin đợt tuyển (đổ vào phần đầu sheet 名簿)
const DOT_STORAGE_KEY = 'nhapform_thong_tin_dot';

// Trạng thái sửa hồ sơ toàn cục: -1 = thêm mới, >= 0 = đang sửa theo chỉ số
window.editIndex = -1;
window.dangSuaIndex = -1;

const GOI_Y_TEMPLATES = {
  tinhCach: [
    '明るく、責任感が強い (Vui vẻ, tinh thần trách nhiệm cao)',
    '真面目で素直、向上心がある (Chăm chỉ, thật thà, có chí tiến thủ)',
    '健康で忍耐力があり、協調性に富む (Khỏe mạnh, kiên trì, có tính hòa đồng)',
    '手先が器用で、几帳面な性格 (Khéo tay, tỉ mỉ, cẩn thận)',
    '何事にも前向きで、粘り強い (Luôn tích cực trong mọi việc, bền bỉ)',
    '規律を守り、チームワークを大切にする (Tuân thủ kỷ luật, coi trọng làm việc nhóm)'
  ],
  lyDoDiNhat: [
    '日本の進んだ技術と専門知識を学びたい (Muốn học hỏi kỹ thuật tiên tiến của Nhật)',
    '日本の規律正しく安全な環境で働き、スキルを身につけたい (Làm việc trong môi trường an toàn, kỷ luật)',
    '日本語能力を高め、将来の日系企業就職に役立てたい (Nâng cao tiếng Nhật để sau này làm cho cty Nhật)',
    '日本で一生懸命働き、家族のために貯金したい (Chăm chỉ làm việc để tiết kiệm phụ giúp gia đình)',
    '日本のプロフェッショナルな仕事の進め方を身につけたい (Học tác phong làm việc chuyên nghiệp)'
  ],
  mucTieuVeNuoc: [
    '学んだ技術と経験を活かし、ベトナムの日系企業で働く (Làm việc tại công ty Nhật ở VN)',
    '貯めた資金をもとに、自分の店を開業する (Mở cửa hàng kinh doanh riêng)',
    '日本語通訳や現場管理者として活躍する (Làm phiên dịch hoặc quản lý sản xuất)'
  ],
  soThich: ['サッカー', 'バドミントン', '音楽鑑賞', '料理', '旅行', '読書', '卓球', 'ランニング']
};

function escHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '\u0026amp;')
    .replace(/"/g, '\u0026quot;')
    .replace(/'/g, '\u0026#39;')
    .replace(/</g, '\u0026lt;')
    .replace(/>/g, '\u0026gt;');
}

// Lấy ngày hôm nay theo GIỜ ĐỊA PHƯƠNG (YYYY-MM-DD), không dùng UTC
function layNgayHomNay() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ===== LỚP TRUY CẬP localStorage AN TOÀN =====
// Khi mở bằng file:/// trong iframe, trình duyệt tạo "opaque origin" -> localStorage ném
// SecurityError, làm CHẾT toàn bộ sự kiện (nút bấm không phản hồi).
// Wrapper dưới đây tự phát hiện và chuyển sang lưu trong bộ nhớ tạm (memory) để app vẫn chạy.
const __memStore = {};
let __lsOk = null; // null = chưa kiểm tra, true/false = kết quả

function kiemTraLocalStorage() {
  if (__lsOk !== null) return __lsOk;
  try {
    const probe = '__nhapform_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    __lsOk = true;
  } catch (e) {
    console.warn('[NhapForm] localStorage bị chặn (file:/// trong iframe) -> dùng bộ nhớ tạm.', e);
    __lsOk = false;
  }
  return __lsOk;
}

const SafeStorage = {
  getItem(key) {
    if (kiemTraLocalStorage()) {
      try { return window.localStorage.getItem(key); } catch (e) {}
    }
    return Object.prototype.hasOwnProperty.call(__memStore, key) ? __memStore[key] : null;
  },
  setItem(key, value) {
    if (kiemTraLocalStorage()) {
      try { window.localStorage.setItem(key, value); return; } catch (e) {}
    }
    __memStore[key] = String(value);
  },
  removeItem(key) {
    if (kiemTraLocalStorage()) {
      try { window.localStorage.removeItem(key); } catch (e) {}
    }
    delete __memStore[key];
  },
  key(index) {
    if (kiemTraLocalStorage()) {
      try { return window.localStorage.key(index); } catch (e) {}
    }
    return Object.keys(__memStore)[index] || null;
  },
  get length() {
    if (kiemTraLocalStorage()) {
      try { return window.localStorage.length; } catch (e) {}
    }
    return Object.keys(__memStore).length;
  }
};
window.SafeStorage = SafeStorage;

// 1. KHÔI PHỤC DỮ LIỆU (LocalStorage hoặc bộ nhớ tạm)
function layDanhSachHoSo() {
  let bestList = [];
  try {
    const raw = SafeStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > bestList.length) bestList = parsed;
    }
  } catch (e) {}

  const candidateKeys = [
    'danhSachUngVien', 'ung_vien_list', 'ungVienList', 'candidates',
    'danhSach', 'danh_sach_ho_so', 'danhSachHoSo', 'hoSoList', 'ungVien'
  ];
  for (const k of candidateKeys) {
    try {
      const raw = SafeStorage.getItem(k);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > bestList.length) bestList = parsed;
      }
    } catch (e) {}
  }

  try {
    const total = SafeStorage.length;
    for (let i = 0; i < total; i++) {
      const k = SafeStorage.key(i);
      if (!k) continue;
      try {
        const val = SafeStorage.getItem(k);
        if (val && val.startsWith('[')) {
          const arr = JSON.parse(val);
          if (Array.isArray(arr) && arr.length > bestList.length && arr[0] && (arr[0].hoTen || arr[0].furigana || arr[0].id)) {
            bestList = arr;
          }
        }
      } catch (e) {}
    }
  } catch (e) {
    console.warn('[NhapForm] Không đọc được danh sách key localStorage:', e);
  }

  if (bestList.length > 0) {
    try { SafeStorage.setItem(STORAGE_KEY, JSON.stringify(bestList)); } catch (e) {}
  }
  return bestList;
}

function luuDanhSachHoSo(list) {
  try {
    SafeStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.error('Lỗi ghi dữ liệu:', e);
    alert('Bộ nhớ trình duyệt bị đầy, không thể lưu thêm!');
  }
}

// 1b. CHUẨN HÓA ĐỊNH DẠNG NGÀY THÁNG HIỂN THỊ TRÊN FORM
// Mục đích: chặn mọi trường hợp giá trị là Date object / chuỗi Date.toString bị đổ thẳng vào input
function pad2So(v) { return ('0' + String(v)).slice(-2); }

// Chuỗi bất kỳ -> yyyy-mm-dd (cho input type="date")
function chuanHoaNgayISO(val) {
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? '' : `${val.getFullYear()}-${pad2So(val.getMonth() + 1)}-${pad2So(val.getDate())}`;
  }
  const s = String(val == null ? '' : val).trim();
  if (!s) return '';
  let m = s.match(/(\d{4})\s*[年\/\-\.]\s*(\d{1,2})\s*[月\/\-\.]\s*(\d{1,2})/);
  if (m) return `${m[1]}-${pad2So(m[2])}-${pad2So(m[3])}`;
  m = s.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
  if (m) return `${m[1]}-${pad2So(m[2])}-${pad2So(m[3])}`;
  m = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (m) return `${m[3]}-${pad2So(m[2])}-${pad2So(m[1])}`;
  const d = new Date(s);
  if (!isNaN(d.getTime())) return `${d.getFullYear()}-${pad2So(d.getMonth() + 1)}-${pad2So(d.getDate())}`;
  return s;
}

// Chuỗi bất kỳ -> MM/YYYY (cho ô "Từ", "Đến", "Ngày cấp"...)
function chuanHoaThangNam(val) {
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? '' : `${pad2So(val.getMonth() + 1)}/${val.getFullYear()}`;
  }
  const s = String(val == null ? '' : val).trim();
  if (!s) return '';
  if (s === '現在') return '現在';
  let m = s.match(/(\d{4})\s*年\s*(\d{1,2})\s*月/);
  if (m) return `${pad2So(m[2])}/${m[1]}`;
  m = s.match(/^(\d{1,2})\s*[\/\-\.]\s*(\d{4})$/);
  if (m) return `${pad2So(m[1])}/${m[2]}`;
  m = s.match(/^(\d{4})\s*[\/\-\.]\s*(\d{1,2})$/);
  if (m) return `${pad2So(m[2])}/${m[1]}`;
  m = s.match(/^(\d{4})(\d{2})$/);
  if (m) return `${m[2]}/${m[1]}`;
  // Chuỗi Date.toString() / ISO -> lấy tháng-năm theo giờ địa phương
  if (/[a-zA-Z]/.test(s)) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) return `${pad2So(d.getMonth() + 1)}/${d.getFullYear()}`;
  }
  return s;
}

// Ngày sinh hiển thị trong bảng danh sách: DD/MM/YYYY
function hienThiNgaySinh(val) {
  const iso = chuanHoaNgayISO(val);
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return iso;
}

// 2. TÍNH KINH NGHIỆM LÀM VIỆC CHUẨN X年Xヶ月
function tinhThoiGianLam(tuStr, denStr) {
  if (!tuStr || !denStr) return '';
  const parseMY = (s) => {
    if (!s) return null;
    const parts = String(s).trim().split(/[\/\-]/);
    if (parts.length === 2) {
      let m = parseInt(parts[0], 10);
      let y = parseInt(parts[1], 10);
      if (parts[0].length === 4) { y = parseInt(parts[0], 10); m = parseInt(parts[1], 10); }
      if (m >= 1 && m <= 12 && y >= 1900 && y <= 2100) return { y, m };
    }
    return null;
  };

  const d1 = parseMY(tuStr);
  let d2 = null;
  const denClean = String(denStr).trim();
  if (denClean === '現在') {
    const now = new Date();
    d2 = { y: now.getFullYear(), m: now.getMonth() + 1 };
  } else {
    d2 = parseMY(denClean);
  }

  if (!d1 || !d2) return '';

  const totalMonths = (d2.y - d1.y) * 12 + (d2.m - d1.m);
  if (totalMonths < 0) return '';
  if (totalMonths === 0) return '0ヶ月';

  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;

  if (years > 0 && months > 0) return `${years}年${months}ヶ月`;
  if (years > 0) return `${years}年`;
  return `${months}ヶ月`;
}

// 3. TÌM TBODY
function timTbody(loai) {
  let tb = null;
  if (loai === 'hocvan') {
    tb = document.querySelector('#table-hoc-van tbody') || document.querySelector('#tblHocVan tbody') || document.querySelector('#table-hoc-van');
  } else if (loai === 'congviec') {
    tb = document.querySelector('#table-cong-viec tbody') || document.querySelector('#tblCongViec tbody') || document.querySelector('#table-cong-viec');
  } else if (loai === 'bangcap') {
    tb = document.querySelector('#table-bang-cap tbody') || document.querySelector('#tblBangCap tbody') || document.querySelector('#table-bang-cap');
  } else if (loai === 'giadinh') {
    tb = document.querySelector('#table-gia-dinh tbody') || document.querySelector('#tblGiaDinh tbody') || document.querySelector('#table-gia-dinh');
  }

  if (tb && tb.tagName === 'TABLE') {
    let tbody = tb.querySelector('tbody');
    if (!tbody) { tbody = document.createElement('tbody'); tb.appendChild(tbody); }
    return tbody;
  }
  if (tb) return tb;

  const allTables = document.querySelectorAll('table');
  for (const t of allTables) {
    const txt = t.textContent;
    if (loai === 'hocvan' && txt.includes('Tên trường') && (txt.includes('Khoa') || txt.includes('Ngành'))) {
      return t.querySelector('tbody') || t;
    }
    if (loai === 'congviec' && (txt.includes('Tên công ty') || txt.includes('Công ty')) && txt.includes('Công việc')) {
      return t.querySelector('tbody') || t;
    }
    if (loai === 'bangcap' && txt.includes('bằng cấp')) {
      return t.querySelector('tbody') || t;
    }
    if (loai === 'giadinh' && (txt.includes('Mối quan hệ') || txt.includes('間柄'))) {
      return t.querySelector('tbody') || t;
    }
  }
  return null;
}

// 4. HỌC VẤN (TỰ DO NHẬP TEXT, TỰ ĐỘNG CHỌN BẬC HỌC)
function capNhatBacHocCaoNhatTuDong() {
  const selBacHoc = document.getElementById('bacHocCaoNhat');
  if (!selBacHoc) return;

  const tbHv = timTbody('hocvan');
  if (!tbHv) return;

  let bac = '高校';
  tbHv.querySelectorAll('tr').forEach((row) => {
    const truong = (row.querySelector('.hv-truong')?.value || '').toLowerCase();
    const khoa = (row.querySelector('.hv-khoa')?.value || '').toLowerCase();
    const full = truong + ' ' + khoa;

    if (full.includes('đại học') || full.includes('dai hoc') || full.includes('đh') || full.includes('dh') || full.includes('大学')) {
      bac = '大学';
    } else if (bac !== '大学' && (full.includes('cao đẳng') || full.includes('cao dang') || full.includes('cđ') || full.includes('cd') || full.includes('短大') || full.includes('短期'))) {
      bac = '短大';
    } else if (bac !== '大学' && bac !== '短大' && (full.includes('trung cấp') || full.includes('trung cap') || full.includes('tc') || full.includes('nghề') || full.includes('専門'))) {
      bac = '専門';
    }
  });

  selBacHoc.value = bac;
}

function themDongHocVan(data = {}) {
  const tbody = timTbody('hocvan');
  if (!tbody) return;

  let monMacDinh = data.khoa || '';
  const truongText = (data.truong || '').toLowerCase();
  if (!monMacDinh) {
    if (truongText.includes('gicc') || truongText.includes('tiếng nhật') || truongText.includes('日本語')) {
      monMacDinh = '日本語学習';
    } else if (truongText.includes('高校') || truongText.includes('thpt') || truongText.includes('cấp 3')) {
      monMacDinh = '普通科';
    }
  }

  const tr = document.createElement('tr');
  tr.className = 'border-b';
  tr.innerHTML = `
    <td class="p-2"><input type="text" class="hv-tu w-full border rounded px-2 py-1" placeholder="MM/YYYY" value="${escHtml(chuanHoaThangNam(data.tu))}"></td>
    <td class="p-2"><input type="text" class="hv-den w-full border rounded px-2 py-1" placeholder="MM/YYYY" value="${escHtml(chuanHoaThangNam(data.den))}"></td>
    <td class="p-2"><input type="text" class="hv-tinh w-full border rounded px-2 py-1" placeholder="Tỉnh/TP" value="${escHtml(data.tinh)}"></td>
    <td class="p-2"><input type="text" class="hv-truong w-full border rounded px-2 py-1" placeholder="Tên trường" value="${escHtml(data.truong)}"></td>
    <td class="p-2"><input type="text" class="hv-khoa w-full border rounded px-2 py-1" placeholder="Khoa/Ngành học" value="${escHtml(monMacDinh)}"></td>
    <td class="p-2 text-center"><button type="button" class="btn-xoa-dong text-red-500 font-bold px-2 py-1">Xóa</button></td>
  `;

  const inpTruong = tr.querySelector('.hv-truong');
  const inpKhoa = tr.querySelector('.hv-khoa');

  inpTruong.addEventListener('input', () => {
    const val = inpTruong.value.toLowerCase();
    if (val.includes('高校') || val.includes('thpt') || val.includes('cấp 3')) {
      if (!inpKhoa.value) inpKhoa.value = '普通科';
    } else if (val.includes('gicc') || val.includes('tiếng nhật') || val.includes('日本語')) {
      if (!inpKhoa.value) inpKhoa.value = '日本語学習';
    }
    capNhatBacHocCaoNhatTuDong();
  });

  inpKhoa.addEventListener('input', capNhatBacHocCaoNhatTuDong);

  tbody.appendChild(tr);
  capNhatBacHocCaoNhatTuDong();
}

function khoiTaoBangHocVan() {
  const tbody = timTbody('hocvan');
  if (!tbody) return;

  // Dọn sạch toàn bộ dòng cũ (kể cả dòng tĩnh của HTML)
  const table = tbody.closest('table') || tbody;
  const existingTrs = table.querySelectorAll('tbody tr');
  existingTrs.forEach(tr => tr.remove());
  tbody.innerHTML = '';

  // Chỉ tạo đúng 2 dòng chuẩn: Cấp 3 và GICC
  themDongHocVan({ tu: '09/2020', den: '06/2023', tinh: 'THAI NGUYEN', truong: 'THPT', khoa: '普通科' });
  themDongHocVan({ tu: '10/2026', den: '現在', tinh: 'HA NOI', truong: 'GICC日本語センター', khoa: '日本語学習' });

  // Xóa sạch mọi dòng GICC trùng lặp (tránh thừa dòng học tiếng Nhật)
  donDongGiccTrungLap();
}

// Chỉ giữ 1 dòng "trung tâm tiếng Nhật" duy nhất trong bảng học vấn (ưu tiên dòng GICC)
function donDongGiccTrungLap() {
  const tbody = timTbody('hocvan');
  if (!tbody) return;
  const rows = Array.from(tbody.querySelectorAll('tr'));
  let daGiuMot = false;

  // Ưu tiên giữ dòng có tên chứa GICC, nếu không có thì giữ dòng tiếng Nhật đầu tiên
  const laDongTiengNhat = (tr) => {
    const truong = tr.querySelector('.hv-truong');
    const khoa = tr.querySelector('.hv-khoa');
    const t = ((truong ? truong.value : '') + ' ' + (khoa ? khoa.value : '')).toLowerCase();
    return t.includes('gicc') || t.includes('日本語') || t.includes('tiếng nhật') || t.includes('tieng nhat');
  };
  const laGicc = (tr) => {
    const truong = tr.querySelector('.hv-truong');
    return ((truong ? truong.value : '')).toLowerCase().includes('gicc');
  };

  const dsTiengNhat = rows.filter(laDongTiengNhat);
  let giuLai = dsTiengNhat.find(laGicc) || dsTiengNhat[0] || null;

  rows.forEach(tr => {
    if (!laDongTiengNhat(tr)) return;
    if (tr === giuLai && !daGiuMot) {
      daGiuMot = true;
      return;
    }
    tr.remove();
  });
}

function diChuyenBacHocCaoNhat() {
  const selBacHoc = document.getElementById('bacHocCaoNhat');
  if (!selBacHoc) return;
  const container = selBacHoc.closest('.mb-4') || selBacHoc.closest('div') || selBacHoc.parentElement;
  const btnThemHv = document.getElementById('btn-them-hoc-van') ||
                    Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Thêm dòng học vấn'));

  if (container && btnThemHv && btnThemHv.parentElement) {
    btnThemHv.parentElement.appendChild(container);
    container.classList.add('mt-4');
  }
}

// 5. CÔNG VIỆC
function themDongCongViec(data = {}) {
  const tbody = timTbody('congviec');
  if (!tbody) return;
  const tr = document.createElement('tr');
  tr.className = 'border-b';
  tr.innerHTML = `
    <td class="p-2"><input type="text" class="cv-tu w-full border rounded px-2 py-1" placeholder="MM/YYYY" value="${escHtml(chuanHoaThangNam(data.tu))}"></td>
    <td class="p-2"><input type="text" class="cv-den w-full border rounded px-2 py-1" placeholder="MM/YYYY" value="${escHtml(chuanHoaThangNam(data.den))}"></td>
    <td class="p-2"><input type="text" class="cv-tinh w-full border rounded px-2 py-1" placeholder="Tỉnh làm việc" value="${escHtml(data.tinh)}"></td>
    <td class="p-2"><input type="text" class="cv-cty w-full border rounded px-2 py-1" placeholder="Tên công ty" value="${escHtml(data.cty)}"></td>
    <td class="p-2"><input type="text" class="cv-ndcv w-full border rounded px-2 py-1" placeholder="Công việc" value="${escHtml(data.ndcv)}"></td>
    <td class="p-2"><input type="text" class="cv-luong w-full border rounded px-2 py-1" placeholder="Lương" value="${escHtml(data.luong)}"></td>
    <td class="p-2"><input type="text" class="cv-thoigian w-full border rounded px-2 py-1" placeholder="VD: 1年2ヶ月" value="${escHtml(data.thoiGianLam)}"></td>
    <td class="p-2 text-center"><button type="button" class="btn-xoa-dong text-red-500 font-bold px-2 py-1">Xóa</button></td>
  `;

  const inpTu = tr.querySelector('.cv-tu');
  const inpDen = tr.querySelector('.cv-den');
  const inpTg = tr.querySelector('.cv-thoigian');
  const autoCalc = () => {
    const res = tinhThoiGianLam(inpTu.value, inpDen.value);
    if (res) inpTg.value = res;
  };
  inpTu.addEventListener('input', autoCalc);
  inpDen.addEventListener('input', autoCalc);

  tbody.appendChild(tr);
}

function khoiTaoBangCongViec() {
  const tbody = timTbody('congviec');
  if (!tbody) return;
  tbody.innerHTML = '';
  themDongCongViec();
}

// 6. BẰNG CẤP
function themDongBangCap(data = {}) {
  const tbody = timTbody('bangcap');
  if (!tbody) return;
  const tr = document.createElement('tr');
  tr.className = 'border-b';
  tr.innerHTML = `
    <td class="p-2"><input type="text" class="bc-ten w-full border rounded px-2 py-1" placeholder="Tên bằng (VD: 高校卒業証書, 大学卒業証書)" value="${escHtml(data.ten)}"></td>
    <td class="p-2"><input type="text" class="bc-ngay w-full border rounded px-2 py-1" placeholder="MM/YYYY" value="${escHtml(chuanHoaThangNam(data.ngay))}"></td>
    <td class="p-2 text-center"><button type="button" class="btn-xoa-dong text-red-500 font-bold px-2 py-1">Xóa</button></td>
  `;
  tbody.appendChild(tr);
}

function khoiTaoBangBangCap() {
  const tbody = timTbody('bangcap');
  if (!tbody) return;
  tbody.innerHTML = '';
  themDongBangCap({ ten: '高校卒業証書', ngay: '06/2023' });
}

// 7. GIA ĐÌNH (BỔ SUNG ÔNG 祖父 VÀ BÀ 祖母)
function themDongGiaDinh(data = {}) {
  const tbody = timTbody('giadinh');
  if (!tbody) return;
  const tr = document.createElement('tr');
  tr.className = 'border-b';
  tr.innerHTML = `
    <td class="p-2">
      <select class="gd-quan-he w-full border rounded px-2 py-1">
        <option value="父" ${data.quanHe === '父' ? 'selected' : ''}>Bố (父)</option>
        <option value="母" ${data.quanHe === '母' ? 'selected' : ''}>Mẹ (母)</option>
        <option value="祖父" ${data.quanHe === '祖父' ? 'selected' : ''}>Ông (祖父)</option>
        <option value="祖母" ${data.quanHe === '祖母' ? 'selected' : ''}>Bà (祖母)</option>
        <option value="兄" ${data.quanHe === '兄' ? 'selected' : ''}>Anh trai (兄)</option>
        <option value="弟" ${data.quanHe === '弟' ? 'selected' : ''}>Em trai (弟)</option>
        <option value="姉" ${data.quanHe === '姉' ? 'selected' : ''}>Chị gái (姉)</option>
        <option value="妹" ${data.quanHe === '妹' ? 'selected' : ''}>Em gái (妹)</option>
        <option value="妻" ${data.quanHe === '妻' ? 'selected' : ''}>Vợ (妻)</option>
        <option value="夫" ${data.quanHe === '夫' ? 'selected' : ''}>Chồng (夫)</option>
        <option value="子" ${data.quanHe === '子' ? 'selected' : ''}>Con (子)</option>
      </select>
    </td>
    <td class="p-2"><input type="text" class="gd-nam-sinh w-full border rounded px-2 py-1" placeholder="Tuổi/Năm sinh" value="${escHtml(data.namSinh)}"></td>
    <td class="p-2">
      <select class="gd-song-chung w-full border rounded px-2 py-1">
        <option value="有" ${data.songChung === '有' ? 'selected' : ''}>有</option>
        <option value="無" ${data.songChung === '無' ? 'selected' : ''}>無</option>
      </select>
    </td>
    <td class="p-2"><input type="text" class="gd-nghe-nghiep w-full border rounded px-2 py-1" placeholder="Nghề nghiệp" value="${escHtml(data.ngheNghiep)}"></td>
    <td class="p-2"><input type="text" class="gd-thu-nhap w-full border rounded px-2 py-1" placeholder="Thu nhập" value="${escHtml(data.thuNhap)}"></td>
    <td class="p-2 text-center"><input type="checkbox" class="gd-da-mat h-5 w-5 cursor-pointer" ${data.daMat ? 'checked' : ''}></td>
    <td class="p-2 text-center"><button type="button" class="btn-xoa-dong text-red-500 font-bold px-2 py-1">Xóa</button></td>
  `;

  const chkDaMat = tr.querySelector('.gd-da-mat');
  const inpNamSinh = tr.querySelector('.gd-nam-sinh');
  const selSongChung = tr.querySelector('.gd-song-chung');
  const inpNghe = tr.querySelector('.gd-nghe-nghiep');
  const inpThuNhap = tr.querySelector('.gd-thu-nhap');

  const capNhatTrangThaiDaMat = () => {
    if (chkDaMat.checked) {
      inpNamSinh.value = '死去';
      inpNamSinh.readOnly = true;
      inpNamSinh.classList.add('bg-gray-100');

      selSongChung.value = '無';
      selSongChung.disabled = true;
      selSongChung.classList.add('bg-gray-100');

      inpNghe.value = 'ー';
      inpNghe.readOnly = true;
      inpNghe.classList.add('bg-gray-100');

      inpThuNhap.value = 'ー';
      inpThuNhap.readOnly = true;
      inpThuNhap.classList.add('bg-gray-100');
    } else {
      if (inpNamSinh.value === '死去') inpNamSinh.value = '';
      inpNamSinh.readOnly = false;
      inpNamSinh.classList.remove('bg-gray-100');

      selSongChung.disabled = false;
      selSongChung.classList.remove('bg-gray-100');

      if (inpNghe.value === 'ー') inpNghe.value = '';
      inpNghe.readOnly = false;
      inpNghe.classList.remove('bg-gray-100');

      if (inpThuNhap.value === 'ー') inpThuNhap.value = '';
      inpThuNhap.readOnly = false;
      inpThuNhap.classList.remove('bg-gray-100');
    }
  };

  chkDaMat.addEventListener('change', capNhatTrangThaiDaMat);
  if (data.daMat) capNhatTrangThaiDaMat();

  tbody.appendChild(tr);
}

function khoiTaoBangGiaDinh() {
  const tbody = timTbody('giadinh');
  if (!tbody) return;
  tbody.innerHTML = '';
  themDongGiaDinh({ quanHe: '父', songChung: '有', ngheNghiep: '農業', thuNhap: '3万' });
  themDongGiaDinh({ quanHe: '母', songChung: '有', ngheNghiep: '農業', thuNhap: '3万' });
}

// 8. KHÓA / MỞ Ô XUẤT NGOẠI
function capNhatTrangThaiXuatNgoai() {
  const selXn = document.getElementById('xuatNgoai') || document.getElementById('diNuocNgoai');
  const inpNuoc = document.getElementById('xuatNgoaiNuoc') || document.getElementById('diNuocNgoaiNuoc');
  const inpMucDich = document.getElementById('xuatNgoaiNoiDung') || document.getElementById('diNuocNgoaiMucDich');

  if (!selXn || !inpNuoc || !inpMucDich) return;
  const val = selXn.value;
  const isCo = (val === 'Có' || val === 'co' || val === '有');

  if (isCo) {
    inpNuoc.disabled = false;
    inpNuoc.classList.remove('bg-gray-100', 'cursor-not-allowed');
    inpMucDich.disabled = false;
    inpMucDich.classList.remove('bg-gray-100', 'cursor-not-allowed');
  } else {
    inpNuoc.disabled = true;
    inpNuoc.value = '';
    inpNuoc.classList.add('bg-gray-100', 'cursor-not-allowed');
    inpMucDich.disabled = true;
    inpMucDich.value = '';
    inpMucDich.classList.add('bg-gray-100', 'cursor-not-allowed');
  }
}

// 9. THU THẬP & ĐỔ DỮ LIỆU FORM
function getElementValue(idList) {
  for (const id of idList) {
    const el = document.getElementById(id) || document.querySelector(`[name="${id}"]`);
    if (el) return el.value.trim();
  }
  return '';
}

function setElementValue(idList, val) {
  for (const id of idList) {
    const el = document.getElementById(id) || document.querySelector(`[name="${id}"]`);
    if (el) {
      el.value = (val !== undefined && val !== null) ? val : '';
      return;
    }
  }
}

// NGÀY CHỤP ẢNH: LUÔN LUÔN gán ngày hôm nay (giờ địa phương) nếu bị rỗng.
// Không bao giờ để ô date picker bị ghi đè chuỗi rỗng "".
function datNgayChupMacDinh() {
  const today = layNgayHomNay();
  const inps = [
    document.getElementById('ngayChup'),
    document.getElementById('ngayChupAnh'),
    document.querySelector('input[name="ngayChup"]'),
    document.querySelector('input[name="ngayChupAnh"]')
  ];
  for (const el of inps) {
    if (el) {
      if (!el.value) el.value = today;
      return;
    }
  }
  const dateInp = Array.from(document.querySelectorAll('input[type="date"]')).find(i => i.id !== 'ngaySinh');
  if (dateInp && !dateInp.value) dateInp.value = today;
}

// Ép giá trị ngày chụp: nếu rỗng thì luôn gán ngày hôm nay
function epNgayChupKhongRong(val) {
  return (val && String(val).trim() !== '') ? String(val).trim() : layNgayHomNay();
}

// Tính tuổi từ ngày sinh (hỗ trợ cả YYYY-MM-DD và DD/MM/YYYY)
function tinhTuoiTuNgaySinh(ngaySinhStr) {
  if (!ngaySinhStr) return '';
  const s = String(ngaySinhStr).trim();
  if (!s) return '';

  let d = null;
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(s)) {
    const p = s.split('-');
    d = new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10));
  } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
    const p = s.split('/');
    d = new Date(parseInt(p[2], 10), parseInt(p[1], 10) - 1, parseInt(p[0], 10));
  } else {
    d = new Date(s);
  }
  if (!d || isNaN(d.getTime())) return '';

  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age > 0 ? String(age) : '';
}

// Cập nhật ô Tuổi (readonly) ngay lập tức, không phụ thuộc sự kiện input/change
function capNhatOTuoi() {
  const inpTuoi = document.getElementById('tuoi');
  if (!inpTuoi) return;
  const ngaySinh = document.getElementById('ngaySinh');
  inpTuoi.value = ngaySinh ? tinhTuoiTuNgaySinh(ngaySinh.value) : '';
}

function thuThapFormData() {
  let elId = document.getElementById('hoSoId');
  if (!elId) {
    elId = document.createElement('input');
    elId.type = 'hidden';
    elId.id = 'hoSoId';
    document.body.appendChild(elId);
  }
  const id = elId.value || ('HS_' + Date.now());

  const hocVan = [];
  const tbHv = timTbody('hocvan');
  if (tbHv) {
    tbHv.querySelectorAll('tr').forEach((row) => {
      const tu = row.querySelector('.hv-tu')?.value.trim() || '';
      const den = row.querySelector('.hv-den')?.value.trim() || '';
      const tinh = row.querySelector('.hv-tinh')?.value.trim() || '';
      const truong = row.querySelector('.hv-truong')?.value.trim() || '';
      const khoa = row.querySelector('.hv-khoa')?.value.trim() || '';
      if (truong || tu || den) hocVan.push({ tu, den, tinh, truong, khoa });
    });
  }

  const congViec = [];
  const tbCv = timTbody('congviec');
  if (tbCv) {
    tbCv.querySelectorAll('tr').forEach((row) => {
      const tu = row.querySelector('.cv-tu')?.value.trim() || '';
      const den = row.querySelector('.cv-den')?.value.trim() || '';
      const tinh = row.querySelector('.cv-tinh')?.value.trim() || '';
      const cty = row.querySelector('.cv-cty')?.value.trim() || '';
      const ndcv = row.querySelector('.cv-ndcv')?.value.trim() || '';
      const luong = row.querySelector('.cv-luong')?.value.trim() || '';
      const thoiGianLam = row.querySelector('.cv-thoigian')?.value.trim() || '';
      if (cty || tu || den || ndcv) congViec.push({ tu, den, tinh, cty, ndcv, luong, thoiGianLam });
    });
  }

  const bangCap = [];
  const tbBc = timTbody('bangcap');
  if (tbBc) {
    tbBc.querySelectorAll('tr').forEach((row) => {
      const ten = row.querySelector('.bc-ten')?.value.trim() || '';
      const ngay = row.querySelector('.bc-ngay')?.value.trim() || '';
      if (ten || ngay) bangCap.push({ ten, ngay });
    });
  }

  const giaDinh = [];
  const tbGd = timTbody('giadinh');
  if (tbGd) {
    tbGd.querySelectorAll('tr').forEach((row) => {
      const quanHe = row.querySelector('.gd-quan-he')?.value.trim() || '';
      const namSinh = row.querySelector('.gd-nam-sinh')?.value.trim() || '';
      const songChung = row.querySelector('.gd-song-chung')?.value || '有';
      const ngheNghiep = row.querySelector('.gd-nghe-nghiep')?.value.trim() || '';
      const thuNhap = row.querySelector('.gd-thu-nhap')?.value.trim() || '';
      const daMat = row.querySelector('.gd-da-mat')?.checked || false;
      if (quanHe) giaDinh.push({ quanHe, namSinh, songChung, ngheNghiep, thuNhap, daMat });
    });
  }

  return {
    id,
    hoTen: getElementValue(['hoTen']),
    tenKatakana: getElementValue(['tenKatakana', 'furigana']),
    gioiTinh: getElementValue(['gioiTinh']) || 'Nam',
    ngaySinh: getElementValue(['ngaySinh']),
    tuoi: getElementValue(['tuoi']) || tinhTuoiTuNgaySinh(getElementValue(['ngaySinh'])),
    honNhan: getElementValue(['honNhan']) || 'Chưa kết hôn',
    queQuan: getElementValue(['queQuan']),
    diaChiXa: getElementValue(['diaChiXa', 'xa', 'phuong']),
    diaChiHuyen: getElementValue(['diaChiHuyen', 'huyen', 'quan']),
    diaChiTinh: getElementValue(['diaChiTinh', 'tinh', 'queQuan']),
    soDienThoai: getElementValue(['soDienThoai']),
    thiLucTrai: getElementValue(['thiLucTrai']) || '1.0',
    thiLucPhai: getElementValue(['thiLucPhai']) || '1.0',
    tayThuan: getElementValue(['tayThuan']) || 'Phải',
    chieuCao: getElementValue(['chieuCao']),
    canNang: getElementValue(['canNang']),
    nhomMau: getElementValue(['nhomMau']) || 'A',
    hutThuoc: getElementValue(['hutThuoc']) || 'Không',
    uongRuou: getElementValue(['uongRuou']) || 'Không',
    // Hình xăm: lưu 無 / 有(左手、背中)
    xamMinh: taoGiaTriHinhXam(),
    soThich: (getElementValue(['soThich']) || 'サッカー').trim(),
    ngayChup: epNgayChupKhongRong(getElementValue(['ngayChup', 'ngayChupAnh'])),
    bacHocCaoNhat: getElementValue(['bacHocCaoNhat']) || '高校',

    // Điểm IQ 1, 2, 3, 4
    iq1: getElementValue(['iq1', 'iq_1', 'iq-1', 'kiemTraIQ1']),
    iq2: getElementValue(['iq2', 'iq_2', 'iq-2', 'kiemTraIQ2']),
    iq3: getElementValue(['iq3', 'iq_3', 'iq-3', 'kiemTraIQ3']),
    iq4: getElementValue(['iq4', 'iq_4', 'iq-4', 'kiemTraIQ4']),

    tiengNhatTu: getElementValue(['tiengNhatTu']),
    tiengNhatDen: getElementValue(['tiengNhatDen']) || '現在',
    tiengNhatTruong: getElementValue(['tiengNhatTruong', 'tiengNhatTrungTam']) || 'GICC日本語センター',
    tiengNhatDiaDiem: getElementValue(['tiengNhatDiaDiem', 'tiengNhatDiaChi']) || 'HA NOI',
    tiengNhatMon: getElementValue(['tiengNhatMon']) || '日本語学習',
    thoiGianHocTiengNhat: getElementValue(['thoiGianHocTiengNhat', 'tiengNhatThoiGian']),
    baiMinna: getElementValue(['baiMinna', 'tiengNhatBai']),

    nguoiQuenNhat: getElementValue(['nguoiQuenNhat']) || 'khong',
    nguoiQuenSoLuong: getElementValue(['nguoiQuenSoLuong']) || '1',
    nguoiQuenQuanHe: getElementValue(['nguoiQuenQuanHe']),
    nguoiQuenTuCach: getElementValue(['nguoiQuenTuCach']),
    nguoiQuenCongViec: getElementValue(['nguoiQuenCongViec']),
    nguoiQuenNoiO: getElementValue(['nguoiQuenNoiO']),

    xuatNgoai: getElementValue(['xuatNgoai', 'diNuocNgoai']) || 'Không',
    xuatNgoaiNuoc: getElementValue(['xuatNgoaiNuoc', 'diNuocNgoaiNuoc']),
    xuatNgoaiNoiDung: getElementValue(['xuatNgoaiNoiDung', 'diNuocNgoaiMucDich']),
    tenTheThao: getElementValue(['tenTheThao', 'theThaoTen']),
    soNamTheThao: getElementValue(['soNamTheThao', 'theThaoThoiGian']),

    tinhCach: getElementValue(['tinhCach']),
    lyDoDiNhat: getElementValue(['lyDoDiNhat', 'quanTamNhat']),
    mucTieuVeNuoc: getElementValue(['mucTieuVeNuoc']),
    soTienTietKiem: getElementValue(['soTienTietKiem']),

    // Kinh nghiệm sống tập thể
    songTapTheNam: getElementValue(['songTapTheNam']),
    songTapTheLoai: docLoaiOTro(),
    songTapTheSoNguoi: getElementValue(['songTapTheSoNguoi']),

    hocVan,
    congViec,
    bangCap,
    giaDinh
  };
}

function doDuLieuVaoForm(hs) {
  if (!hs) return;

  let elId = document.getElementById('hoSoId');
  if (!elId) {
    elId = document.createElement('input');
    elId.type = 'hidden';
    elId.id = 'hoSoId';
    document.body.appendChild(elId);
  }
  elId.value = hs.id || '';

  setElementValue(['hoTen'], hs.hoTen);
  setElementValue(['tenKatakana', 'furigana'], hs.tenKatakana);
  setElementValue(['gioiTinh'], hs.gioiTinh);
  // Ô ngày sinh là input type="date" -> BẮT BUỘC phải là yyyy-mm-dd mới hiển thị được
  const ngaySinhISO = chuanHoaNgayISO(hs.ngaySinh);
  setElementValue(['ngaySinh'], ngaySinhISO);
  // Ô Tuổi là readonly, không nhận sự kiện input khi gán bằng JS -> phải tự tính lại
  const tuoiGan = hs.tuoi || tinhTuoiTuNgaySinh(ngaySinhISO || hs.ngaySinh);
  setElementValue(['tuoi'], tuoiGan);
  if (!document.getElementById('tuoi') || !document.getElementById('tuoi').value) capNhatOTuoi();
  setElementValue(['honNhan'], hs.honNhan);
  setElementValue(['queQuan'], hs.queQuan);
  setElementValue(['diaChiXa', 'xa', 'phuong'], hs.diaChiXa);
  setElementValue(['diaChiHuyen', 'huyen', 'quan'], hs.diaChiHuyen);
  setElementValue(['diaChiTinh', 'tinh'], hs.diaChiTinh || hs.queQuan);
  setElementValue(['soDienThoai'], hs.soDienThoai);
  setElementValue(['thiLucTrai'], hs.thiLucTrai);
  setElementValue(['thiLucPhai'], hs.thiLucPhai);
  setElementValue(['tayThuan'], hs.tayThuan);
  setElementValue(['chieuCao'], hs.chieuCao);
  setElementValue(['canNang'], hs.canNang);
  setElementValue(['nhomMau'], hs.nhomMau);
  setElementValue(['hutThuoc'], hs.hutThuoc);
  setElementValue(['uongRuou'], hs.uongRuou);
  ganHinhXamVaoForm(hs.xamMinh);
  setElementValue(['soThich'], hs.soThich);

  // NGÀY CHỤP ẢNH: nếu hs.ngayChup / hs.ngayChupAnh rỗng thì LUÔN gán ngày hôm nay
  const ngayChupGan = epNgayChupKhongRong(chuanHoaNgayISO(hs.ngayChup || hs.ngayChupAnh));
  setElementValue(['ngayChup', 'ngayChupAnh'], ngayChupGan);
  setElementValue(['ngayChupAnh'], ngayChupGan);
  datNgayChupMacDinh();

  setElementValue(['bacHocCaoNhat'], hs.bacHocCaoNhat);

  // Điểm IQ
  setElementValue(['iq1', 'iq_1', 'iq-1', 'kiemTraIQ1'], hs.iq1);
  setElementValue(['iq2', 'iq_2', 'iq-2', 'kiemTraIQ2'], hs.iq2);
  setElementValue(['iq3', 'iq_3', 'iq-3', 'kiemTraIQ3'], hs.iq3);
  setElementValue(['iq4', 'iq_4', 'iq-4', 'kiemTraIQ4'], hs.iq4);

  setElementValue(['tiengNhatTu'], hs.tiengNhatTu);
  setElementValue(['tiengNhatDen'], hs.tiengNhatDen || '現在');
  setElementValue(['tiengNhatTruong', 'tiengNhatTrungTam'], hs.tiengNhatTruong || 'GICC日本語センター');
  setElementValue(['tiengNhatDiaDiem', 'tiengNhatDiaChi'], hs.tiengNhatDiaDiem || 'HA NOI');
  setElementValue(['tiengNhatMon'], hs.tiengNhatMon || '日本語学習');
  setElementValue(['thoiGianHocTiengNhat', 'tiengNhatThoiGian'], hs.thoiGianHocTiengNhat);
  setElementValue(['baiMinna', 'tiengNhatBai'], hs.baiMinna);

  setElementValue(['nguoiQuenNhat'], hs.nguoiQuenNhat);
  setElementValue(['nguoiQuenSoLuong'], hs.nguoiQuenSoLuong);
  setElementValue(['nguoiQuenQuanHe'], hs.nguoiQuenQuanHe);
  setElementValue(['nguoiQuenTuCach'], hs.nguoiQuenTuCach);
  setElementValue(['nguoiQuenCongViec'], hs.nguoiQuenCongViec);
  setElementValue(['nguoiQuenNoiO'], hs.nguoiQuenNoiO);

  setElementValue(['xuatNgoai', 'diNuocNgoai'], hs.xuatNgoai);
  setElementValue(['xuatNgoaiNuoc', 'diNuocNgoaiNuoc'], hs.xuatNgoaiNuoc);
  setElementValue(['xuatNgoaiNoiDung', 'diNuocNgoaiMucDich'], hs.xuatNgoaiNoiDung);
  setElementValue(['tenTheThao', 'theThaoTen'], hs.tenTheThao);
  setElementValue(['soNamTheThao', 'theThaoThoiGian'], hs.soNamTheThao);

  setElementValue(['tinhCach'], hs.tinhCach);
  setElementValue(['lyDoDiNhat', 'quanTamNhat'], hs.lyDoDiNhat);
  setElementValue(['mucTieuVeNuoc'], hs.mucTieuVeNuoc);
  setElementValue(['soTienTietKiem'], hs.soTienTietKiem);

  // Kinh nghiệm sống tập thể
  setElementValue(['songTapTheNam'], hs.songTapTheNam);
  ganLoaiOTro(hs.songTapTheLoai);
  setElementValue(['songTapTheSoNguoi'], hs.songTapTheSoNguoi);

  const tbHv = timTbody('hocvan');
  if (tbHv) {
    tbHv.innerHTML = '';
    if (hs.hocVan && hs.hocVan.length > 0) hs.hocVan.forEach(item => themDongHocVan(item));
    else khoiTaoBangHocVan();
  }

  const tbCv = timTbody('congviec');
  if (tbCv) {
    tbCv.innerHTML = '';
    if (hs.congViec && hs.congViec.length > 0) hs.congViec.forEach(item => themDongCongViec(item));
    else khoiTaoBangCongViec();
  }

  const tbBc = timTbody('bangcap');
  if (tbBc) {
    tbBc.innerHTML = '';
    if (hs.bangCap && hs.bangCap.length > 0) hs.bangCap.forEach(item => themDongBangCap(item));
    else khoiTaoBangBangCap();
  }

  const tbGd = timTbody('giadinh');
  if (tbGd) {
    tbGd.innerHTML = '';
    if (hs.giaDinh && hs.giaDinh.length > 0) hs.giaDinh.forEach(item => themDongGiaDinh(item));
    else khoiTaoBangGiaDinh();
  }

  capNhatTrangThaiXuatNgoai();
  capNhatBacHocCaoNhatTuDong();
}

// 8c. LOẠI HÌNH Ở TRỌ (Khối J) - hỗ trợ thêm lựa chọn "tự điền"
const O_TRO_TU_DIEN = '__tu_dien__';

function docLoaiOTro() {
  const sel = document.getElementById('songTapTheLoai');
  const inp = document.getElementById('songTapTheLoaiTuDien');
  const v = sel ? String(sel.value || '').trim() : '';
  if (v === O_TRO_TU_DIEN) {
    const tuDien = inp ? String(inp.value || '').trim() : '';
    return tuDien || 'アパート';
  }
  return v;
}

function ganLoaiOTro(giaTri) {
  const sel = document.getElementById('songTapTheLoai');
  const inp = document.getElementById('songTapTheLoaiTuDien');
  if (!sel) return;
  const v = String(giaTri || '').trim();
  if (!v) {
    sel.value = '会社の寮';
    if (inp) { inp.style.display = 'none'; inp.value = ''; }
    return;
  }
  const coTrongDs = Array.from(sel.options).some(o => o.value === v);
  if (coTrongDs) {
    sel.value = v;
    if (inp) { inp.style.display = 'none'; inp.value = ''; }
  } else {
    sel.value = O_TRO_TU_DIEN;
    if (inp) { inp.style.display = 'block'; inp.value = v; }
  }
}

// 9a. THÔNG TIN ĐỢT TUYỂN (ghi vào phần đầu sheet 名簿)
const DS_ID_THONG_TIN_DOT = {
  tenXiNghiep: 'dotTenXiNghiep',
  nghiepDoan: 'dotNghiepDoan',
  ngheNghiep: 'dotNgheNghiep',
  ngayPhongVan: 'dotNgayPhongVan'
};

// Đọc giá trị 1 ô thông tin đợt tuyển theo nhiều cách (id -> name -> label -> vị trí)
function docMotOTThongTinDot(id) {
  const el = document.getElementById(id);
  if (el && String(el.value || '').trim() !== '') return String(el.value).trim();

  // Dự phòng 1: tìm theo thuộc tính name
  let el2 = document.querySelector('[name="' + id + '"]');
  if (el2 && String(el2.value || '').trim() !== '') return String(el2.value).trim();

  // Dự phòng 2: tìm theo input ngay sau <label for="id">
  let lab = document.querySelector('label[for="' + id + '"]');
  if (lab) {
    let sib = lab.nextElementSibling;
    while (sib) {
      if (sib.tagName === 'INPUT' || sib.tagName === 'SELECT') {
        const v = String(sib.value || '').trim();
        if (v) return v;
        break;
      }
      sib = sib.nextElementSibling;
    }
  }

  // Dự phòng 3: quét toàn bộ input theo thứ tự cố định trong fieldset đầu tiên
  const thuTu = ['dotTenXiNghiep', 'dotNghiepDoan', 'dotNgheNghiep', 'dotNgayPhongVan'];
  const idx = thuTu.indexOf(id);
  const fieldset = document.querySelector('fieldset.bg-amber-50');
  if (idx >= 0 && fieldset) {
    const inps = Array.from(fieldset.querySelectorAll('input, select'));
    if (inps[idx]) return String(inps[idx].value || '').trim();
  }

  return '';
}

function docThongTinDot() {
  const kq = {
    tenXiNghiep: docMotOTThongTinDot(DS_ID_THONG_TIN_DOT.tenXiNghiep),
    nghiepDoan: docMotOTThongTinDot(DS_ID_THONG_TIN_DOT.nghiepDoan),
    ngheNghiep: docMotOTThongTinDot(DS_ID_THONG_TIN_DOT.ngheNghiep),
    ngayPhongVan: docMotOTThongTinDot(DS_ID_THONG_TIN_DOT.ngayPhongVan)
  };

  const rong = (o) => !o || ['tenXiNghiep', 'nghiepDoan', 'ngheNghiep', 'ngayPhongVan']
    .every(k => !String(o[k] || '').trim());

  // Nếu form đọc ra rỗng -> lấy từ kho lưu (giá trị lưu lần cuối khi bấm "Lưu hồ sơ")
  if (rong(kq)) {
    try {
      const raw = SafeStorage.getItem(DOT_STORAGE_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d && !rong(d)) {
          kq.tenXiNghiep = String(d.tenXiNghiep || '').trim();
          kq.nghiepDoan = String(d.nghiepDoan || '').trim();
          kq.ngheNghiep = String(d.ngheNghiep || '').trim();
          kq.ngayPhongVan = String(d.ngayPhongVan || '').trim();
          console.warn('[名簿] Ô đợt tuyển trên form rỗng -> dùng giá trị đã lưu:', kq);
        }
      }
    } catch (e) {}
  } else {
    // CHỈ lưu lại khi có giá trị - tránh ghi đè bằng rỗng
    try { SafeStorage.setItem(DOT_STORAGE_KEY, JSON.stringify(kq)); } catch (e) {}
  }

  return kq;
}

function luuThongTinDot() {
  // Chỉ lưu khi có ít nhất 1 giá trị, tránh ghi đè kho lưu bằng rỗng
  try {
    const d = docThongTinDot();
    const co = ['tenXiNghiep', 'nghiepDoan', 'ngheNghiep', 'ngayPhongVan']
      .some(k => String(d[k] || '').trim() !== '');
    if (co) SafeStorage.setItem(DOT_STORAGE_KEY, JSON.stringify(d));
  } catch (e) {}
}

function khoiPhucThongTinDot() {
  try {
    const raw = SafeStorage.getItem(DOT_STORAGE_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (d && typeof d === 'object') {
        const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
        set('dotTenXiNghiep', d.tenXiNghiep);
        set('dotNghiepDoan', d.nghiepDoan);
        set('dotNgheNghiep', d.ngheNghiep);
        set('dotNgayPhongVan', d.ngayPhongVan);
      }
    }
  } catch (e) {}

  // Tự lưu khi người dùng thay đổi (chỉ gắn 1 lần, tránh chồng listener)
  if (window.__daGanSuKienThongTinDot) return;
  window.__daGanSuKienThongTinDot = true;
  ['dotTenXiNghiep', 'dotNghiepDoan', 'dotNgheNghiep', 'dotNgayPhongVan'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', luuThongTinDot);
      el.addEventListener('change', luuThongTinDot);
    }
  });
}

// Gán thông tin đợt tuyển từ dữ liệu ngoài (vd: import Excel sheet 名簿) vào form + lưu canonical
function ganThongTinDot(obj) {
  if (!obj || typeof obj !== 'object') return;
  const map = {
    tenXiNghiep: 'dotTenXiNghiep',
    nghiepDoan: 'dotNghiepDoan',
    ngheNghiep: 'dotNgheNghiep',
    ngayPhongVan: 'dotNgayPhongVan'
  };
  Object.keys(map).forEach(k => {
    const v = String(obj[k] || '').trim();
    if (!v) return;
    const el = document.getElementById(map[k]);
    if (el) el.value = v;
  });
  // Luu truc tiep vao SafeStorage (khong phu thuoc docThongTinDot doc tu form)
  try {
    const d = {
      tenXiNghiep: String(obj.tenXiNghiep || '').trim(),
      nghiepDoan: String(obj.nghiepDoan || '').trim(),
      ngheNghiep: String(obj.ngheNghiep || '').trim(),
      ngayPhongVan: String(obj.ngayPhongVan || '').trim()
    };
    if (['tenXiNghiep', 'nghiepDoan', 'ngheNghiep', 'ngayPhongVan'].some(k => d[k])) {
      // Ghi truc tiep vao localStorage (bo qua kiemTraLocalStorage)
      try { window.localStorage.setItem(DOT_STORAGE_KEY, JSON.stringify(d)); } catch (e) {}
      try { SafeStorage.setItem(DOT_STORAGE_KEY, JSON.stringify(d)); } catch (e) {}
      __memStore[DOT_STORAGE_KEY] = JSON.stringify(d);
    }
  } catch (e) {}
  if (typeof luuThongTinDot === 'function') luuThongTinDot();
}
window.ganThongTinDot = ganThongTinDot;

// 9b. HÌNH XĂM: "無" | "有" | "有(左手、背中)"
function taoGiaTriHinhXam() {
  const sel = document.getElementById('xamMinh');
  const chiTiet = document.getElementById('xamMinhChiTiet');
  let v = sel ? String(sel.value || '').trim() : '';
  if (v === 'Có') v = '有';
  if (v === 'Không' || !v) v = '無';
  if (v === '有' && chiTiet) {
    const ct = String(chiTiet.value || '').trim();
    if (ct) return `有(${ct})`;
  }
  return v;
}

function ganHinhXamVaoForm(giaTri) {
  const sel = document.getElementById('xamMinh');
  const chiTiet = document.getElementById('xamMinhChiTiet');
  if (!sel) return;
  const raw = String(giaTri || '').trim();
  const laCo = raw === '有' || raw === 'Có' || raw.startsWith('有');
  sel.value = laCo ? '有' : '無';
  if (chiTiet) {
    const m = raw.match(/^有\s*[（(](.*)[）)]\s*$/);
    chiTiet.value = m ? m[1].trim() : '';
    chiTiet.style.display = laCo ? 'block' : 'none';
  }
}

function xoaTrangForm() {
  const elId = document.getElementById('hoSoId');
  if (elId) elId.value = 'HS_' + Date.now();

  // KHÔNG xóa 4 ô "Thông tin đợt tuyển" (chúng áp dụng cho cả đợt, không phải của 1 ứng viên)
  const ID_GIU_LAI = ['dotTenXiNghiep', 'dotNghiepDoan', 'dotNgheNghiep', 'dotNgayPhongVan'];

  const form = document.querySelector('form') || document.body;
  const inputs = form.querySelectorAll('input:not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="hidden"])');
  inputs.forEach(input => {
    if (ID_GIU_LAI.includes(input.id)) return; // giữ nguyên thông tin đợt tuyển
    if (input.type === 'checkbox' || input.type === 'radio') input.checked = false;
    else input.value = '';
  });

  const selects = form.querySelectorAll('select');
  selects.forEach(sel => {
    if (ID_GIU_LAI.includes(sel.id)) return;
    sel.selectedIndex = 0;
  });
  const textareas = form.querySelectorAll('textarea');
  textareas.forEach(ta => { ta.value = ''; });

  // Khôi phục lại thông tin đợt tuyển từ kho lưu (phòng trường hợp bị reset)
  khoiPhucThongTinDot();

  // NGÀY CHỤP ẢNH: sau khi xóa trắng, LUÔN gán lại ngày hôm nay (giờ địa phương)
  datNgayChupMacDinh();
  capNhatOTuoi();

  setElementValue(['tiengNhatDen'], '現在');
  setElementValue(['tiengNhatTruong', 'tiengNhatTrungTam'], 'GICC日本語センター');
  setElementValue(['tiengNhatDiaDiem', 'tiengNhatDiaChi'], 'HA NOI');
  setElementValue(['tiengNhatMon'], '日本語学習');
  setElementValue(['soThich'], 'サッカー');
  const oSelectSoThich = document.getElementById('selectSoThich');
  if (oSelectSoThich) oSelectSoThich.value = 'サッカー';
  // Hình xăm: reset về 無 và ẩn ô nhập vị trí
  const oXamReset = document.getElementById('xamMinh');
  if (oXamReset) oXamReset.value = '無';
  ganHinhXamVaoForm('無');
  setElementValue(['thiLucTrai'], '1.0');
  setElementValue(['thiLucPhai'], '1.0');
  setElementValue(['nguoiQuenSoLuong'], '1');
  setElementValue(['bacHocCaoNhat'], '高校');

  khoiTaoBangHocVan();
  khoiTaoBangCongViec();
  khoiTaoBangBangCap();
  khoiTaoBangGiaDinh();
  capNhatTrangThaiXuatNgoai();
}

// 10. BẢNG DANH SÁCH HỌC SINH ĐÃ LƯU (CĂN CHỈNH NÚT SỬA/XÓA CÂN ĐỐI)
function timTableDanhSachHocSinh() {
  const allTables = Array.from(document.querySelectorAll('table'));
  for (let i = allTables.length - 1; i >= 0; i--) {
    const t = allTables[i];
    const txt = (t.querySelector('thead')?.textContent || t.textContent || '');
    if (txt.includes('Họ tên') && txt.includes('Ngày sinh') && !txt.includes('Tên trường') && !txt.includes('Tên công ty')) {
      let tbody = t.querySelector('tbody');
      if (!tbody) {
        tbody = document.createElement('tbody');
        t.appendChild(tbody);
      }
      return { table: t, tbody: tbody };
    }
  }
  return null;
}

// Chuẩn hóa toàn bộ hồ sơ (kể cả dữ liệu cũ trong localStorage) về đúng định dạng hiển thị
function chuanHoaHoSo(hs) {
  if (!hs || typeof hs !== 'object') return hs;
  const out = Object.assign({}, hs);
  out.ngaySinh = chuanHoaNgayISO(hs.ngaySinh);
  if (hs.ngayChup) out.ngayChup = chuanHoaNgayISO(hs.ngayChup);
  if (hs.ngayChupAnh) out.ngayChupAnh = chuanHoaNgayISO(hs.ngayChupAnh);
  out.hocVan = (Array.isArray(hs.hocVan) ? hs.hocVan : []).map(e => ({
    tu: chuanHoaThangNam(e && e.tu),
    den: chuanHoaThangNam(e && e.den),
    tinh: (e && e.tinh) || '',
    truong: (e && e.truong) || '',
    khoa: (e && e.khoa) || ''
  }));
  out.congViec = (Array.isArray(hs.congViec) ? hs.congViec : []).map(e => ({
    tu: chuanHoaThangNam(e && e.tu),
    den: chuanHoaThangNam(e && e.den),
    tinh: (e && e.tinh) || '',
    cty: (e && e.cty) || '',
    ndcv: (e && e.ndcv) || '',
    luong: (e && e.luong) || '',
    thoiGianLam: (e && e.thoiGianLam) || ''
  }));
  out.bangCap = (Array.isArray(hs.bangCap) ? hs.bangCap : []).map(e => ({
    ten: (e && e.ten) || '',
    ngay: chuanHoaThangNam(e && e.ngay)
  }));
  return out;
}

function capNhatBangDanhSach(list) {
  const found = timTableDanhSachHocSinh();
  if (!found) return;
  const { table, tbody } = found;

  // Định dạng lại thead chuẩn xác và phân bổ độ rộng 4 cột
  const theadTr = table.querySelector('thead tr');
  if (theadTr) {
    theadTr.innerHTML = `
      <th class="p-2 text-left w-2/5">Họ tên</th>
      <th class="p-2 text-center w-1/5">Ngày sinh</th>
      <th class="p-2 text-center w-1/5">Giới tính</th>
      <th class="p-2 text-center w-1/5">Thao tác</th>
    `;
  }

  tbody.innerHTML = '';

  list.forEach((hsRaw, idx) => {
    const hs = chuanHoaHoSo(hsRaw);
    const tr = document.createElement('tr');
    tr.className = 'border-b hover:bg-gray-50';
    tr.innerHTML = `
      <td class="p-2 font-semibold text-gray-800 text-left">${escHtml(hs.hoTen ? hs.hoTen.toUpperCase() : 'CHƯA CÓ TÊN')}</td>
      <td class="p-2 text-center text-gray-600">${escHtml(hienThiNgaySinh(hs.ngaySinh) || '---')}</td>
      <td class="p-2 text-center text-gray-600">${escHtml(hs.gioiTinh || '---')}</td>
      <td class="p-2 text-center">
        <div class="flex items-center justify-center space-x-2">
          <button type="button" class="btn-sua-hs bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm font-medium">Sửa</button>
          <button type="button" class="btn-xoa-hs bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm font-medium">Xóa</button>
        </div>
      </td>
    `;
    tr.querySelector('.btn-sua-hs').onclick = () => {
      // Ghi nhận ĐANG SỬA theo chỉ số để lần lưu sau cập nhật đúng vị trí
      window.editIndex = idx;
      window.dangSuaIndex = idx;
      doDuLieuVaoForm(hs);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    tr.querySelector('.btn-xoa-hs').onclick = () => {
      if (confirm(`Bạn có chắc muốn xóa ứng viên: ${hs.hoTen}?`)) {
        const curList = layDanhSachHoSo().filter(item => item.id !== hs.id);
        luuDanhSachHoSo(curList);
        // Nếu đang sửa chính hồ sơ vừa xóa thì hủy trạng thái sửa
        if (window.editIndex === idx) {
          window.editIndex = -1;
          window.dangSuaIndex = -1;
        }
        capNhatBangDanhSach(curList);
      }
    };
    tbody.appendChild(tr);
  });
}

function xuLyLuuHoSo() {
  const hs = thuThapFormData();
  if (!hs.hoTen) {
    alert('Vui lòng nhập họ và tên ứng viên trước khi lưu!');
    return;
  }

  // BẮT BUỘC đọc lại danh sách hiện có trước khi ghi (an toàn cả khi localStorage bị chặn)
  let danhSach = [];
  try {
    const rawDs = SafeStorage.getItem(STORAGE_KEY);
    const parsedDs = rawDs ? JSON.parse(rawDs) : [];
    danhSach = Array.isArray(parsedDs) ? parsedDs : [];
  } catch (e) {
    console.warn('[NhapForm] Dữ liệu cũ bị lỗi, khởi tạo danh sách mới:', e);
    danhSach = [];
  }

  // Kiểm tra trạng thái đang sửa hay thêm mới
  const editIndex = (typeof window.editIndex === 'number' && window.editIndex >= 0)
    ? window.editIndex
    : ((typeof window.dangSuaIndex === 'number' && window.dangSuaIndex >= 0) ? window.dangSuaIndex : -1);

  if (editIndex !== -1 && editIndex !== null && editIndex < danhSach.length) {
    // ĐANG SỬA: Cập nhật đè đúng vị trí, giữ nguyên id cũ
    const idCu = danhSach[editIndex]?.id;
    if (idCu) hs.id = idCu;
    danhSach[editIndex] = hs;
  } else {
    // THÊM MỚI: Kiểm tra id trùng (tránh tạo bản ghi trùng lặp)
    const viTri = danhSach.findIndex(item => item.id === hs.id);
    if (viTri >= 0) {
      danhSach[viTri] = hs;
    } else {
      danhSach.push(hs);
    }
  }

  // Lưu lại toàn bộ mảng (an toàn cả khi localStorage bị chặn)
  try {
    SafeStorage.setItem(STORAGE_KEY, JSON.stringify(danhSach));
  } catch (e) {
    console.error('[NhapForm] Không ghi được dữ liệu:', e);
  }

  // BẮT BUỘC reset biến theo dõi trạng thái sửa về -1
  window.editIndex = -1;
  window.dangSuaIndex = -1;

  // Lưu thông tin đợt tuyển (để ghi vào sheet 名簿 khi xuất Excel)
  luuThongTinDot();

  // Làm mới form sau khi lưu thành công
  xoaTrangForm();

  // Vẽ lại toàn bộ bảng danh sách với đầy đủ tất cả bản ghi
  capNhatBangDanhSach(danhSach);

  alert(`Đã lưu thành công hồ sơ của: ${hs.hoTen.toUpperCase()}`);
}

// 10b. TẠO MỚI FILE EXCEL (LÀM MỚI ĐỢT NHẬP)
function xuLyTaoMoiDot() {
  const ok = confirm('Bạn có chắc muốn làm mới để tạo file Excel đợt mới? (Toàn bộ danh sách ứng viên cũ sẽ được xóa để bạn nhập danh sách mới tinh)');
  if (!ok) return;

  // Xóa sạch danh sách đã lưu
  try { SafeStorage.removeItem(STORAGE_KEY); } catch (e) {}

  // Hủy trạng thái đang sửa
  window.editIndex = -1;
  window.dangSuaIndex = -1;

  // Làm trống bảng danh sách học sinh phía dưới
  capNhatBangDanhSach([]);

  // Làm trống form (ngày chụp ảnh sẽ tự gán lại ngày hôm nay)
  xoaTrangForm();

  // Xóa thông tin đợt tuyển đã lưu
  try { SafeStorage.removeItem(DOT_STORAGE_KEY); } catch (e) {}

  alert('Đã làm mới danh sách thành công! Bạn có thể bắt đầu nhập đợt mới.');
}

// 11. BẮT SỰ KIỆN CLICK TOÀN TRANG
document.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const txt = (btn.textContent || '').trim();

  if (txt.includes('Thêm dòng học vấn') || txt.includes('Thêm học vấn')) {
    e.preventDefault();
    themDongHocVan();
  } else if (txt.includes('Thêm dòng công việc') || txt.includes('Thêm công việc')) {
    e.preventDefault();
    themDongCongViec();
  } else if (txt.includes('Thêm bằng cấp')) {
    e.preventDefault();
    themDongBangCap();
  } else if (txt.includes('Thêm thành viên') || txt.includes('Thêm gia đình')) {
    e.preventDefault();
    themDongGiaDinh();
  } else if (btn.classList.contains('btn-xoa-dong') || txt === 'Xóa') {
    e.preventDefault();
    const tr = btn.closest('tr');
    if (tr) {
      tr.remove();
      capNhatBacHocCaoNhatTuDong();
    }
  } else if (btn.id === 'btn-tao-moi-dot' || txt.includes('Tạo mới file Excel')) {
    e.preventDefault();
    xuLyTaoMoiDot();
  } else if (txt.includes('Lưu hồ sơ') || btn.id === 'btn-luu' || btn.id === 'btnLuu' || btn.id === 'btn-save') {
    e.preventDefault();
    xuLyLuuHoSo();
  } else if (txt.includes('Xuất Excel') || btn.id === 'btn-xuat-excel' || btn.id === 'btnXuatExcel') {
    e.preventDefault();
    if (typeof window.xuatExcelPhoThong === 'function') {
      window.xuatExcelPhoThong();
    } else if (typeof window.xuatExcel === 'function') {
      window.xuatExcel();
    } else {
      alert('Đang nạp file excel-export.js, vui lòng thử lại sau 2 giây!');
    }
  }
});

// 12. KHỞI TẠO DUY NHẤT 1 LẦN
let daKhoiTao = false;
function khoiTaoGiaoDien() {
  if (daKhoiTao) return;
  daKhoiTao = true;

  diChuyenBacHocCaoNhat();

  const tbHv = timTbody('hocvan');
  if (tbHv) khoiTaoBangHocVan();

  const tbCv = timTbody('congviec');
  if (tbCv && tbCv.children.length === 0) khoiTaoBangCongViec();

  const tbBc = timTbody('bangcap');
  if (tbBc && tbBc.children.length === 0) khoiTaoBangBangCap();

  const tbGd = timTbody('giadinh');
  if (tbGd && tbGd.children.length === 0) khoiTaoBangGiaDinh();

  datNgayChupMacDinh();

  // DÒNG HỌC TIẾNG NHẬT (GICC): đổi select Tỉnh/TP cứng thành ô input text tự do
  const selDiaDiem = document.getElementById('tiengNhatDiaDiem');
  if (selDiaDiem && selDiaDiem.tagName === 'SELECT') {
    const giaTriHienTai = selDiaDiem.value || 'HA NOI';
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.id = 'tiengNhatDiaDiem';
    inp.className = 'border rounded px-2 py-1 w-full';
    inp.placeholder = 'Tỉnh/TP (VD: HA NOI)';
    inp.value = giaTriHienTai;
    selDiaDiem.replaceWith(inp);
  }

  // NÚT [TẠO MỚI FILE EXCEL] chèn cạnh nút Lưu hồ sơ / Xuất Excel
  if (!document.getElementById('btn-tao-moi-dot')) {
    const btnTaoMoi = document.createElement('button');
    btnTaoMoi.type = 'button';
    btnTaoMoi.id = 'btn-tao-moi-dot';
    btnTaoMoi.className = 'bg-amber-500 hover:bg-amber-600 text-white font-medium px-4 py-2 rounded-lg';
    btnTaoMoi.textContent = 'Tạo mới file Excel';

    const nutLuu = document.getElementById('btnLuuHoSo')
      || document.getElementById('btn-luu')
      || document.getElementById('btnLuu')
      || document.getElementById('btn-save')
      || Array.from(document.querySelectorAll('button')).find(b => (b.textContent || '').includes('Lưu hồ sơ'));
    const nutXuat = document.getElementById('btnXuatExcelFull')
      || document.getElementById('btn-xuat-excel')
      || document.getElementById('btnXuatExcel')
      || Array.from(document.querySelectorAll('button')).find(b => (b.textContent || '').includes('Xuất Excel'));

    if (nutXuat && nutXuat.parentElement) {
      nutXuat.parentElement.insertBefore(btnTaoMoi, nutXuat.nextSibling);
    } else if (nutLuu && nutLuu.parentElement) {
      nutLuu.parentElement.insertBefore(btnTaoMoi, nutLuu.nextSibling);
    } else {
      document.body.appendChild(btnTaoMoi);
    }
  }

  const selXn = document.getElementById('xuatNgoai') || document.getElementById('diNuocNgoai');
  if (selXn) {
    selXn.addEventListener('change', capNhatTrangThaiXuatNgoai);
    capNhatTrangThaiXuatNgoai();
  }

  khoiPhucThongTinDot();

  const list = layDanhSachHoSo();
  capNhatBangDanhSach(list);
  if (list.length > 0) {
    doDuLieuVaoForm(list[0]);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', khoiTaoGiaoDien);
} else {
  khoiTaoGiaoDien();
}

window.layDanhSachHoSo = layDanhSachHoSo;
window.luuDanhSachHoSo = luuDanhSachHoSo;
window.thuThapFormData = thuThapFormData;
window.doDuLieuVaoForm = doDuLieuVaoForm;
window.xoaTrangForm = xoaTrangForm;
window.xuLyLuuHoSo = xuLyLuuHoSo;
window.luuHoSo = xuLyLuuHoSo;
window.xuLyTaoMoiDot = xuLyTaoMoiDot;
window.docThongTinDot = docThongTinDot;
window.luuThongTinDot = luuThongTinDot;
window.khoiPhucThongTinDot = khoiPhucThongTinDot;

window.themDongHocVan = themDongHocVan;
window.themDongCongViec = themDongCongViec;
window.themDongBangCap = themDongBangCap;
window.themDongGiaDinh = themDongGiaDinh;
window.capNhatBacHocCaoNhatTuDong = capNhatBacHocCaoNhatTuDong;

window.khoiTaoBangHocVan = khoiTaoBangHocVan;
window.khoiTaoBangCongViec = khoiTaoBangCongViec;
window.khoiTaoBangBangCap = khoiTaoBangBangCap;
window.khoiTaoBangGiaDinh = khoiTaoBangGiaDinh;
window.GOI_Y_TEMPLATES = GOI_Y_TEMPLATES;

console.log('[NhapForm] storage.js đã nạp hoàn tất!');
