/**
 * storage.js - Quản lý LocalStorage, Dòng động bảng biểu, Xử lý form, Tính kinh nghiệm và Bắt sự kiện
 */

const STORAGE_KEY = 'nhapform_danh_sach_ung_vien';

// Danh sách gợi ý chuẩn tiếng Nhật
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
  soThich: ['サッカー', 'バドミントン', '音楽鑑賞', '料理', '旅行', '読書', 'ランニング']
};

// 1. TỰ ĐỘNG QUÉT VÀ KHÔI PHỤC DỮ LIỆU CŨ TRONG BỘ NHỚ TRÌNH DUYỆT
function layDanhSachHoSo() {
  let bestList = [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
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
      const raw = localStorage.getItem(k);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > bestList.length) bestList = parsed;
      }
    } catch (e) {}
  }

  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    try {
      const val = localStorage.getItem(k);
      if (val && val.startsWith('[')) {
        const arr = JSON.parse(val);
        if (Array.isArray(arr) && arr.length > bestList.length && (arr[0].hoTen || arr[0].furigana || arr[0].id)) {
          bestList = arr;
        }
      }
    } catch (e) {}
  }

  if (bestList.length > 0) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(bestList)); } catch (e) {}
  }

  return bestList;
}

function luuDanhSachHoSo(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.error('Lỗi ghi LocalStorage:', e);
    alert('Bộ nhớ trình duyệt bị đầy, không thể lưu thêm!');
  }
}

// 2. TÍNH KINH NGHIỆM LÀM VIỆC CHUẨN X年Xヶ月
function tinhThoiGianLam(tuStr, denStr) {
  if (!tuStr || !denStr) return '';
  const parseMY = (s) => {
    if (!s) return null;
    const parts = s.trim().split(/[\/\-]/);
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
  if (denStr.trim() === '現在') {
    const now = new Date();
    d2 = { y: now.getFullYear(), m: now.getMonth() + 1 };
  } else {
    d2 = parseMY(denStr);
  }

  if (!d1 || !d2) return '';

  const totalMonths = (d2.y - d1.y) * 12 + (d2.m - d1.m);
  if (totalMonths < 0) return '';
  if (totalMonths === 0) return '1ヶ月';

  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;

  if (years > 0 && months > 0) return `${years}年${months}ヶ月`;
  if (years > 0) return `${years}年`;
  return `${months}ヶ月`;
}

// 3. TÌM TBODY THÔNG MINH
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
    if (loai === 'bangcap' && txt.includes('bằng cấp') && (txt.includes('Ngày cấp') || txt.includes('Cấp'))) {
      return t.querySelector('tbody') || t;
    }
    if (loai === 'giadinh' && (txt.includes('Mối quan hệ') || txt.includes('間柄')) && (txt.includes('Sống chung') || txt.includes('同居'))) {
      return t.querySelector('tbody') || t;
    }
  }
  return null;
}

// 4. HỌC VẤN (Tỉnh/TP và Tên trường để người dùng tự gõ dạng text)
function themDongHocVan(data = {}) {
  const tbody = timTbody('hocvan');
  if (!tbody) return;
  const tr = document.createElement('tr');
  tr.className = 'border-b';
  tr.innerHTML = `
    <td class="p-2"><input type="text" class="hv-tu w-full border rounded px-2 py-1" placeholder="MM/YYYY" value="${data.tu || ''}"></td>
    <td class="p-2"><input type="text" class="hv-den w-full border rounded px-2 py-1" placeholder="MM/YYYY" value="${data.den || ''}"></td>
    <td class="p-2"><input type="text" class="hv-tinh w-full border rounded px-2 py-1" placeholder="Tỉnh/TP (VD: THAI NGUYEN)" value="${data.tinh || ''}"></td>
    <td class="p-2"><input type="text" class="hv-truong w-full border rounded px-2 py-1" placeholder="Tên trường (VD: THPT Lương Ngọc Quyến)" value="${data.truong || ''}"></td>
    <td class="p-2"><input type="text" class="hv-khoa w-full border rounded px-2 py-1" placeholder="Khoa/Ngành học" value="${data.khoa || ''}"></td>
    <td class="p-2 text-center"><button type="button" class="btn-xoa-dong text-red-500 font-bold px-2 py-1">Xóa</button></td>
  `;
  tbody.appendChild(tr);
}

function khoiTaoBangHocVan() {
  const tbody = timTbody('hocvan');
  if (!tbody) return;
  tbody.innerHTML = '';
  // Dòng 1: Cấp 3 (tự gõ tỉnh và trường)
  themDongHocVan({ tu: '09/2020', den: '06/2023', tinh: 'THAI NGUYEN', truong: 'THPT', khoa: '普通科' });
  // Dòng 2: Trung tâm tiếng Nhật GICC
  themDongHocVan({ tu: '10/2026', den: '現在', tinh: 'HA NOI', truong: 'GICC日本語センター', khoa: '日本語学習' });
}

// 5. CÔNG VIỆC
function themDongCongViec(data = {}) {
  const tbody = timTbody('congviec');
  if (!tbody) return;
  const tr = document.createElement('tr');
  tr.className = 'border-b';
  tr.innerHTML = `
    <td class="p-2"><input type="text" class="cv-tu w-full border rounded px-2 py-1" placeholder="MM/YYYY" value="${data.tu || ''}"></td>
    <td class="p-2"><input type="text" class="cv-den w-full border rounded px-2 py-1" placeholder="MM/YYYY" value="${data.den || ''}"></td>
    <td class="p-2"><input type="text" class="cv-tinh w-full border rounded px-2 py-1" placeholder="Tỉnh làm việc" value="${data.tinh || ''}"></td>
    <td class="p-2"><input type="text" class="cv-cty w-full border rounded px-2 py-1" placeholder="Tên công ty" value="${data.cty || ''}"></td>
    <td class="p-2"><input type="text" class="cv-ndcv w-full border rounded px-2 py-1" placeholder="Công việc" value="${data.ndcv || ''}"></td>
    <td class="p-2"><input type="text" class="cv-luong w-full border rounded px-2 py-1" placeholder="Lương" value="${data.luong || ''}"></td>
    <td class="p-2"><input type="text" class="cv-thoigian w-full border rounded px-2 py-1" placeholder="VD: 1年2ヶ月" value="${data.thoiGianLam || ''}"></td>
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

// 6. BẰNG CẤP (Đổi vị trí: Cột 1 là Ngày cấp, Cột 2 là Tên bằng cấp)
function themDongBangCap(data = {}) {
  const tbody = timTbody('bangcap');
  if (!tbody) return;
  const tr = document.createElement('tr');
  tr.className = 'border-b';
  tr.innerHTML = `
    <td class="p-2"><input type="text" class="bc-ngay w-full border rounded px-2 py-1" placeholder="MM/YYYY" value="${data.ngay || ''}"></td>
    <td class="p-2"><input type="text" class="bc-ten w-full border rounded px-2 py-1" placeholder="Tên bằng (VD: 高校卒業証書, 大学卒業証書)" value="${data.ten || ''}"></td>
    <td class="p-2 text-center"><button type="button" class="btn-xoa-dong text-red-500 font-bold px-2 py-1">Xóa</button></td>
  `;
  tbody.appendChild(tr);
}

function khoiTaoBangBangCap() {
  const tbody = timTbody('bangcap');
  if (!tbody) return;
  tbody.innerHTML = '';
  themDongBangCap({ ngay: '06/2023', ten: '高校卒業証書' });
}

// 7. GIA ĐÌNH (Sống chung chỉ chọn 有 / 無; tích Đã mất thì khóa và hiện dấu -)
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
        <option value="兄" ${data.quanHe === '兄' ? 'selected' : ''}>Anh trai (兄)</option>
        <option value="弟" ${data.quanHe === '弟' ? 'selected' : ''}>Em trai (弟)</option>
        <option value="姉" ${data.quanHe === '姉' ? 'selected' : ''}>Chị gái (姉)</option>
        <option value="妹" ${data.quanHe === '妹' ? 'selected' : ''}>Em gái (妹)</option>
        <option value="妻" ${data.quanHe === '妻' ? 'selected' : ''}>Vợ (妻)</option>
        <option value="夫" ${data.quanHe === '夫' ? 'selected' : ''}>Chồng (夫)</option>
        <option value="子" ${data.quanHe === '子' ? 'selected' : ''}>Con (子)</option>
      </select>
    </td>
    <td class="p-2"><input type="text" class="gd-nam-sinh w-full border rounded px-2 py-1" placeholder="Tuổi/Năm sinh" value="${data.namSinh || ''}"></td>
    <td class="p-2">
      <select class="gd-song-chung w-full border rounded px-2 py-1">
        <option value="有" ${data.songChung === '有' ? 'selected' : ''}>有</option>
        <option value="無" ${data.songChung === '無' ? 'selected' : ''}>無</option>
      </select>
    </td>
    <td class="p-2"><input type="text" class="gd-nghe-nghiep w-full border rounded px-2 py-1" placeholder="Nghề nghiệp" value="${data.ngheNghiep || ''}"></td>
    <td class="p-2"><input type="text" class="gd-thu-nhap w-full border rounded px-2 py-1" placeholder="Thu nhập (VD: 3万)" value="${data.thuNhap || ''}"></td>
    <td class="p-2 text-center"><input type="checkbox" class="gd-da-mat h-5 w-5 cursor-pointer" ${data.daMat ? 'checked' : ''}></td>
    <td class="p-2 text-center"><button type="button" class="btn-xoa-dong text-red-500 font-bold px-2 py-1">Xóa</button></td>
  `;

  // Xử lý logic Đã mất (死去)
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

// 8. XỬ LÝ KHÓA/MỞ Ô XUẤT NGOẠI
function capNhatTrangThaiXuatNgoai() {
  const selXn = document.getElementById('diNuocNgoai') || document.querySelector('[name="diNuocNgoai"]');
  const inpNuoc = document.getElementById('diNuocNgoaiNuoc') || document.querySelector('[name="diNuocNgoaiNuoc"]');
  const inpMucDich = document.getElementById('diNuocNgoaiMucDich') || document.querySelector('[name="diNuocNgoaiMucDich"]');

  if (!selXn || !inpNuoc || !inpMucDich) return;
  const isCo = selXn.value === 'co' || selXn.value === 'Có';

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
function thuThapFormData() {
  const getVal = (id) => {
    const el = document.getElementById(id) || document.querySelector(`[name="${id}"]`);
    return el ? el.value.trim() : '';
  };
  const getSelect = (id) => {
    const el = document.getElementById(id) || document.querySelector(`[name="${id}"]`);
    return el ? el.value : '';
  };

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
      const ngay = row.querySelector('.bc-ngay')?.value.trim() || '';
      const ten = row.querySelector('.bc-ten')?.value.trim() || '';
      if (ten || ngay) bangCap.push({ ngay, ten });
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

  const today = new Date().toISOString().slice(0, 10);
  return {
    id: document.getElementById('hoSoId')?.value || ('HS_' + Date.now()),
    ngayChupAnh: getVal('ngayChupAnh') || getVal('ngayChup') || today,
    hoTen: getVal('hoTen'),
    furigana: getVal('furigana'),
    gioiTinh: getSelect('gioiTinh') || 'Nam',
    ngaySinh: getVal('ngaySinh'),
    honNhan: getSelect('honNhan') || 'Chưa kết hôn',
    queQuan: getVal('queQuan'),
    soDienThoai: getVal('soDienThoai'),
    thiLucTrai: getVal('thiLucTrai') || '1.0',
    thiLucPhai: getVal('thiLucPhai') || '1.0',
    tayThuan: getSelect('tayThuan') || 'Phải',
    chieuCao: getVal('chieuCao'),
    canNang: getVal('canNang'),
    nhomMau: getSelect('nhomMau') || 'A',
    hutThuoc: getSelect('hutThuoc') || 'Không',
    uongRuou: getSelect('uongRuou') || 'Không',
    hinhXam: getSelect('hinhXam') || 'Không',
    soThich: getVal('soThich') || 'サッカー',

    tiengNhatTu: getVal('tiengNhatTu'),
    tiengNhatDen: getVal('tiengNhatDen') || '現在',
    tiengNhatTrungTam: getVal('tiengNhatTrungTam') || 'GICC日本語センター',
    tiengNhatDiaChi: getVal('tiengNhatDiaChi') || 'HA NOI',
    tiengNhatMon: getVal('tiengNhatMon') || '日本語学習',
    tiengNhatCapDo: getVal('tiengNhatCapDo'),
    tiengNhatThoiGian: getVal('tiengNhatThoiGian'),
    tiengNhatBai: getVal('tiengNhatBai'),

    nguoiQuenNhat: getSelect('nguoiQuenNhat') || 'khong',
    nguoiQuenSoLuong: getVal('nguoiQuenSoLuong') || '1',
    nguoiQuenQuanHe: getVal('nguoiQuenQuanHe'),
    nguoiQuenTuCach: getVal('nguoiQuenTuCach'),
    nguoiQuenCongViec: getVal('nguoiQuenCongViec'),
    nguoiQuenNoiO: getVal('nguoiQuenNoiO'),

    diNuocNgoai: getSelect('diNuocNgoai') || 'khong',
    diNuocNgoaiNuoc: getVal('diNuocNgoaiNuoc'),
    diNuocNgoaiMucDich: getVal('diNuocNgoaiMucDich'),
    diNuocNgoaiThoiGian: getVal('diNuocNgoaiThoiGian'),
    theThaoTen: getVal('theThaoTen'),
    theThaoThoiGian: getVal('theThaoThoiGian'),

    lyDoDiNhat: getVal('lyDoDiNhat'),
    mucTieuVeNuoc: getVal('mucTieuVeNuoc'),
    soTienTietKiem: getVal('soTienTietKiem'),
    diemManh: getVal('diemManh'),
    diemYeu: getVal('diemYeu'),

    hocVan,
    congViec,
    bangCap,
    giaDinh
  };
}

function doDuLieuVaoForm(hs) {
  if (!hs) return;
  const setVal = (id, val) => {
    const el = document.getElementById(id) || document.querySelector(`[name="${id}"]`);
    if (el) el.value = val !== undefined && val !== null ? val : '';
  };

  setVal('hoSoId', hs.id);
  setVal('ngayChupAnh', hs.ngayChupAnh || new Date().toISOString().slice(0, 10));
  setVal('ngayChup', hs.ngayChupAnh || new Date().toISOString().slice(0, 10));
  setVal('hoTen', hs.hoTen);
  setVal('furigana', hs.furigana);
  setVal('gioiTinh', hs.gioiTinh);
  setVal('ngaySinh', hs.ngaySinh);
  setVal('honNhan', hs.honNhan);
  setVal('queQuan', hs.queQuan);
  setVal('soDienThoai', hs.soDienThoai);
  setVal('thiLucTrai', hs.thiLucTrai);
  setVal('thiLucPhai', hs.thiLucPhai);
  setVal('tayThuan', hs.tayThuan);
  setVal('chieuCao', hs.chieuCao);
  setVal('canNang', hs.canNang);
  setVal('nhomMau', hs.nhomMau);
  setVal('hutThuoc', hs.hutThuoc);
  setVal('uongRuou', hs.uongRuou);
  setVal('hinhXam', hs.hinhXam);
  setVal('soThich', hs.soThich || 'サッカー');

  setVal('tiengNhatTu', hs.tiengNhatTu);
  setVal('tiengNhatDen', hs.tiengNhatDen || '現在');
  setVal('tiengNhatTrungTam', hs.tiengNhatTrungTam || 'GICC日本語センター');
  setVal('tiengNhatDiaChi', hs.tiengNhatDiaChi || 'HA NOI');
  setVal('tiengNhatMon', hs.tiengNhatMon || '日本語学習');
  setVal('tiengNhatCapDo', hs.tiengNhatCapDo);
  setVal('tiengNhatThoiGian', hs.tiengNhatThoiGian);
  setVal('tiengNhatBai', hs.tiengNhatBai);

  setVal('nguoiQuenNhat', hs.nguoiQuenNhat || 'khong');
  setVal('nguoiQuenSoLuong', hs.nguoiQuenSoLuong || '1');
  setVal('nguoiQuenQuanHe', hs.nguoiQuenQuanHe);
  setVal('nguoiQuenTuCach', hs.nguoiQuenTuCach);
  setVal('nguoiQuenCongViec', hs.nguoiQuenCongViec);
  setVal('nguoiQuenNoiO', hs.nguoiQuenNoiO);

  setVal('diNuocNgoai', hs.diNuocNgoai || 'khong');
  setVal('diNuocNgoaiNuoc', hs.diNuocNgoaiNuoc);
  setVal('diNuocNgoaiMucDich', hs.diNuocNgoaiMucDich);
  setVal('diNuocNgoaiThoiGian', hs.diNuocNgoaiThoiGian);
  setVal('theThaoTen', hs.theThaoTen);
  setVal('theThaoThoiGian', hs.theThaoThoiGian);

  setVal('lyDoDiNhat', hs.lyDoDiNhat);
  setVal('mucTieuVeNuoc', hs.mucTieuVeNuoc);
  setVal('soTienTietKiem', hs.soTienTietKiem);
  setVal('diemManh', hs.diemManh);
  setVal('diemYeu', hs.diemYeu);

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
  const selNguoiQuen = document.getElementById('nguoiQuenNhat');
  if (selNguoiQuen) selNguoiQuen.dispatchEvent(new Event('change'));
}

function xoaTrangForm() {
  const form = document.querySelector('form') || document.body;
  const inputs = form.querySelectorAll('input:not([type="button"]):not([type="submit"]):not([type="reset"])');
  inputs.forEach(input => {
    if (input.type === 'checkbox' || input.type === 'radio') input.checked = false;
    else input.value = '';
  });

  const selects = form.querySelectorAll('select');
  selects.forEach(sel => { sel.selectedIndex = 0; });
  const textareas = form.querySelectorAll('textarea');
  textareas.forEach(ta => { ta.value = ''; });

  const setVal = (id, val) => {
    const el = document.getElementById(id) || document.querySelector(`[name="${id}"]`);
    if (el) el.value = val;
  };

  setVal('hoSoId', 'HS_' + Date.now());
  const today = new Date().toISOString().slice(0, 10);
  setVal('ngayChupAnh', today);
  setVal('ngayChup', today);
  setVal('tiengNhatDen', '現在');
  setVal('tiengNhatTrungTam', 'GICC日本語センター');
  setVal('tiengNhatDiaChi', 'HA NOI');
  setVal('tiengNhatMon', '日本語学習');
  setVal('soThich', 'サッカー');
  setVal('thiLucTrai', '1.0');
  setVal('thiLucPhai', '1.0');
  setVal('nguoiQuenSoLuong', '1');

  khoiTaoBangHocVan();
  khoiTaoBangCongViec();
  khoiTaoBangBangCap();
  khoiTaoBangGiaDinh();
  capNhatTrangThaiXuatNgoai();
}

// 10. LƯU HỒ SƠ & HIỂN THỊ DANH SÁCH HỌC SINH ĐÃ LƯU
function xuLyLuuHoSo() {
  const hs = thuThapFormData();
  if (!hs.hoTen) {
    alert('Vui lòng nhập họ và tên ứng viên trước khi lưu!');
    return;
  }

  const list = layDanhSachHoSo();
  const existingIdx = list.findIndex(item => item.id === hs.id);
  if (existingIdx >= 0) {
    list[existingIdx] = hs;
  } else {
    list.push(hs);
  }

  luuDanhSachHoSo(list);
  capNhatBangDanhSach(list);
  alert(`Đã lưu thành công hồ sơ của: ${hs.hoTen.toUpperCase()}`);
}

function capNhatBangDanhSach(list) {
  let tbody = document.querySelector('#table-danh-sach tbody') ||
              document.querySelector('#table-danh-sach-ung-vien tbody') ||
              document.querySelector('#danh-sach-hoc-sinh tbody');

  if (!tbody) {
    const allTables = document.querySelectorAll('table');
    for (const t of allTables) {
      if (t.textContent.includes('Họ tên') && t.textContent.includes('Ngày sinh') && (t.textContent.includes('Giới tính') || t.textContent.includes('Thao tác'))) {
        tbody = t.querySelector('tbody') || t;
        break;
      }
    }
  }

  if (!tbody) return;
  tbody.innerHTML = '';

  list.forEach((hs, idx) => {
    const tr = document.createElement('tr');
    tr.className = 'border-b hover:bg-gray-50';
    tr.innerHTML = `
      <td class="p-2 text-center font-bold">${idx + 1}</td>
      <td class="p-2 font-semibold">${hs.hoTen ? hs.hoTen.toUpperCase() : ''}</td>
      <td class="p-2 text-center">${hs.ngaySinh || ''}</td>
      <td class="p-2 text-center">${hs.gioiTinh || ''}</td>
      <td class="p-2 text-center space-x-2">
        <button type="button" class="btn-sua-hs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-sm">Sửa</button>
        <button type="button" class="btn-xoa-hs bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-sm">Xóa</button>
      </td>
    `;
    tr.querySelector('.btn-sua-hs').onclick = () => doDuLieuVaoForm(hs);
    tr.querySelector('.btn-xoa-hs').onclick = () => {
      if (confirm(`Bạn có chắc muốn xóa ứng viên: ${hs.hoTen}?`)) {
        const curList = layDanhSachHoSo().filter(item => item.id !== hs.id);
        luuDanhSachHoSo(curList);
        capNhatBangDanhSach(curList);
        xoaTrangForm();
      }
    };
    tbody.appendChild(tr);
  });
}

// 11. BẮT SỰ KIỆN CLICK TOÀN TRANG (EVENT DELEGATION - BẤM LÀ ĂN NGAY)
document.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const txt = (btn.textContent || '').trim();

  // Thêm dòng các bảng
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
    if (tr) tr.remove();
  }

  // Nút Lưu hồ sơ
  else if (txt.includes('Lưu hồ sơ') || btn.id === 'btn-luu' || btn.id === 'btnLuu' || btn.id === 'btn-save') {
    e.preventDefault();
    xuLyLuuHoSo();
  }

  // Nút Xuất Excel
  else if (txt.includes('Xuất Excel') || btn.id === 'btn-xuat-excel' || btn.id === 'btnXuatExcel') {
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

// 12. KHỞI TẠO HỆ THỐNG
function khoiTaoGiaoDien() {
  const tbHv = timTbody('hocvan');
  if (tbHv && tbHv.children.length === 0) khoiTaoBangHocVan();

  const tbCv = timTbody('congviec');
  if (tbCv && tbCv.children.length === 0) khoiTaoBangCongViec();

  const tbBc = timTbody('bangcap');
  if (tbBc && tbBc.children.length === 0) khoiTaoBangBangCap();

  const tbGd = timTbody('giadinh');
  if (tbGd && tbGd.children.length === 0) khoiTaoBangGiaDinh();

  const inpDate = document.getElementById('ngayChupAnh') || document.getElementById('ngayChup');
  if (inpDate && !inpDate.value) inpDate.value = new Date().toISOString().slice(0, 10);

  const selXn = document.getElementById('diNuocNgoai') || document.querySelector('[name="diNuocNgoai"]');
  if (selXn) {
    selXn.addEventListener('change', capNhatTrangThaiXuatNgoai);
    capNhatTrangThaiXuatNgoai();
  }

  const list = layDanhSachHoSo();
  capNhatBangDanhSach(list);
  if (list.length > 0) {
    doDuLieuVaoForm(list[0]);
  }
}

khoiTaoGiaoDien();
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', khoiTaoGiaoDien);
}
window.addEventListener('load', khoiTaoGiaoDien);

// Xuất các hàm ra window
window.layDanhSachHoSo = layDanhSachHoSo;
window.luuDanhSachHoSo = luuDanhSachHoSo;
window.thuThapFormData = thuThapFormData;
window.doDuLieuVaoForm = doDuLieuVaoForm;
window.xoaTrangForm = xoaTrangForm;
window.xuLyLuuHoSo = xuLyLuuHoSo;
window.luuHoSo = xuLyLuuHoSo;

window.themDongHocVan = themDongHocVan;
window.themDongCongViec = themDongCongViec;
window.themDongBangCap = themDongBangCap;
window.themDongGiaDinh = themDongGiaDinh;

window.khoiTaoBangHocVan = khoiTaoBangHocVan;
window.khoiTaoBangCongViec = khoiTaoBangCongViec;
window.khoiTaoBangBangCap = khoiTaoBangBangCap;
window.khoiTaoBangGiaDinh = khoiTaoBangGiaDinh;
window.GOI_Y_TEMPLATES = GOI_Y_TEMPLATES;

console.log('[NhapForm] storage.js đã nạp thành công!');
