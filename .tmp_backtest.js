// Backtest: mo phong toan bo luong import -> storage -> hien thi cua pho-thong
// Chay: node .tmp_backtest.js  (tu thu muc goc NhapForm-main)
const path = require('path');
const fs = require('fs');
const vm = require('vm');

const ROOT = __dirname;
const PT = path.join(ROOT, 'pho-thong');

// ===== 1. DOM gia lap =====
const DOM = {};
function makeEl(id, type) {
  return { id, type: type || 'text', value: '', style: {}, addEventListener() {}, options: [] };
}
const document = {
  getElementById: (id) => DOM[id] || null,
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: (tag) => makeEl('el_' + tag, tag),
  body: { appendChild() {} },
  addEventListener: () => {}
};
const window = {};
const consoleWarns = [];

// ===== 2. Nap storage.js =====
const storageCode = fs.readFileSync(path.join(PT, 'js', 'storage.js'), 'utf8');
const sandbox = {
  document, window, console: {
    log: () => {}, warn: (m) => consoleWarns.push(String(m)), error: () => {}
  },
  localStorage: {
    _m: {},
    getItem(k) { return k in this._m ? this._m[k] : null; },
    setItem(k, v) { this._m[k] = String(v); },
    removeItem(k) { delete this._m[k]; },
    get length() { return Object.keys(this._m).length; },
    key(i) { return Object.keys(this._m)[i] || null; }
  },
  navigator: { clipboard: { writeText: () => Promise.resolve() } },
  alert: (m) => console.log('[alert]', m),
  confirm: () => true,
  setTimeout: (fn) => fn(),
  URL: { createObjectURL: () => 'blob:x' },
  Blob: class {},
  FileReader: class { readAsText() {} }
};
sandbox.ExcelJS = undefined; // se gan lai trong TEST D
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(storageCode, sandbox, { filename: 'storage.js' });

const {
  SafeStorage, DOT_STORAGE_KEY, chuanHoaNgayISO, chuanHoaThangNam, hienThiNgaySinh,
  chuanHoaHoSo, ganThongTinDot, docThongTinDot, luuThongTinDot, khoiPhucThongTinDot,
  themDongHocVan, themDongCongViec, themDongBangCap, doDuLieuVaoForm, capNhatBangDanhSach,
  timTbody, layDanhSachHoSo, luuDanhSachHoSo
} = sandbox;

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS -', name); }
  else { fail++; console.log('  FAIL -', name, extra !== undefined ? '=> ' + JSON.stringify(extra) : ''); }
}

// ===== 3. Nap excel-import.js (chi lay cac ham parse) =====
const importCode = fs.readFileSync(path.join(PT, 'js', 'excel-import.js'), 'utf8');
const sb2 = { console: { log: () => {}, warn: (m) => consoleWarns.push(String(m)), error: () => {} }, window: {}, alert: (m) => console.log('[alert]', m), document };
sb2.window = sb2;
Object.assign(sb2, { SafeStorage, DOT_STORAGE_KEY, luuDanhSachHoSo, doDuLieuVaoForm, capNhatBangDanhSach, ganThongTinDot, docThongTinDot, luuThongTinDot, khoiPhucThongTinDot, chuanHoaHoSo, layDanhSachHoSo });
sb2.document = document;
vm.createContext(sb2);
vm.runInContext(importCode, sb2, { filename: 'excel-import.js' });

// ===== 4. TEST A: cac ham chuan hoa ngay/thang =====
console.log('\n=== A. chuanHoaNgayISO / chuanHoaThangNam / hienThiNgaySinh ===');
check('chuanHoaNgayISO(Date.toString) -> 2004-02-19', chuanHoaNgayISO('Thu Feb 19 2004 07:00:00 GMT+0700 (Giờ Đông Dương)') === '2004-02-19', chuanHoaNgayISO('Thu Feb 19 2004 07:00:00 GMT+0700 (Giờ Đông Dương)'));
check('chuanHoaNgayISO(19/02/2004) -> 2004-02-19', chuanHoaNgayISO('19/02/2004') === '2004-02-19');
check('chuanHoaNgayISO(2004-02-19) giu nguyen', chuanHoaNgayISO('2004-02-19') === '2004-02-19');
check('chuanHoaNgayISO(rong) -> rong', chuanHoaNgayISO('') === '');
check('chuanHoaThangNam(Sep 01 2019 07:00 GMT) -> 09/2019', chuanHoaThangNam('Sun Sep 01 2019 07:00:00 GMT+0700 (Giờ Đông Dương)') === '09/2019', chuanHoaThangNam('Sun Sep 01 2019 07:00:00 GMT+0700 (Giờ Đông Dương)'));
check('chuanHoaThangNam(2019年9月) -> 09/2019', chuanHoaThangNam('2019年9月') === '09/2019');
check('chuanHoaThangNam(9/2019) -> 09/2019', chuanHoaThangNam('9/2019') === '09/2019');
check('chuanHoaThangNam(現在) -> 現在', chuanHoaThangNam('現在') === '現在');
check('hienThiNgaySinh(2004-02-19) -> 19/02/2004', hienThiNgaySinh('2004-02-19') === '19/02/2004', hienThiNgaySinh('2004-02-19'));
check('hienThiNgaySinh(Date.toString) -> 19/02/2004', hienThiNgaySinh('Thu Feb 19 2004 07:00:00 GMT+0700 (Giờ Đông Dương)') === '19/02/2004');

// ===== 5. TEST B: chuanHoaHoSo + capNhatBangDanhSach (danh sach da luu) =====
console.log('\n=== B. chuanHoaHoSo + capNhatBangDanhSach ===');
const hsRaw = {
  id: 1, hoTen: 'NGUYEN VAN A', ngaySinh: 'Thu Feb 19 2004 07:00:00 GMT+0700 (Giờ Đông Dương)',
  ngayChup: 'Sat Jun 01 2024 07:00:00 GMT+0700 (Giờ Đông Dương)',
  hocVan: [{ tu: 'Sun Sep 01 2019 07:00:00 GMT+0700 (Giờ Đông Dương)', den: 'Wed Jun 01 2022 07:00:00 GMT+0700 (Giờ Đông Dương)', tinh: 'Hà Nội', truong: 'THCS X', khoa: '' }],
  congViec: [{ tu: 'Sun Sep 01 2019 07:00:00 GMT+0700 (Giờ Đông Dương)', den: '現在', tinh: 'Bắc Ninh', cty: 'Cty Y', ndcv: 'Công nhân', luong: '500', thoiGianLam: '3 năm' }],
  bangCap: [{ ten: '高校卒業証書', ngay: 'Tue Jun 01 2021 07:00:00 GMT+0700 (Giờ Đông Dương)' }]
};
const hsFix = chuanHoaHoSo(hsRaw);
check('chuanHoaHoSo.ngaySinh -> 2004-02-19', hsFix.ngaySinh === '2004-02-19', hsFix.ngaySinh);
check('chuanHoaHoSo.hocVan[0].tu -> 09/2019', hsFix.hocVan[0].tu === '09/2019', hsFix.hocVan[0].tu);
check('chuanHoaHoSo.hocVan[0].den -> 06/2022', hsFix.hocVan[0].den === '06/2022', hsFix.hocVan[0].den);
check('chuanHoaHoSo.congViec[0].tu -> 09/2019', hsFix.congViec[0].tu === '09/2019', hsFix.congViec[0].tu);
check('chuanHoaHoSo.congViec[0].den -> 現在', hsFix.congViec[0].den === '現在', hsFix.congViec[0].den);
check('chuanHoaHoSo.bangCap[0].ngay -> 06/2021', hsFix.bangCap[0].ngay === '06/2021', hsFix.bangCap[0].ngay);
// khong sua doi object goc
check('chuanHoaHoSo khong bien doi object goc', hsRaw.ngaySinh.indexOf('Thu Feb') === 0);

// capNhatBangDanhSach: tao table gia lap
const rows = [];
const fakeTable = { querySelector: () => null };
DOM['tblDanhSach'] = null;
// timTableDanhSachHocSinh dung querySelector -> null -> ham se bao loi? kiem tra an toan
try {
  capNhatBangDanhSach([hsRaw]);
  console.log('  (capNhatBangDanhSach chay khong crash khi khong co table)');
} catch (e) {
  console.log('  (capNhatBangDanhSach throw khi khong co table - chap nhan duoc:', String(e).slice(0, 60), ')');
}

// ===== 6. TEST C: thong tin dot tuyen - ganThongTinDot + luu/khoi phuc =====
console.log('\n=== C. ganThongTinDot (import 名簿 -> form + DOT_STORAGE_KEY) ===');
['dotTenXiNghiep', 'dotNghiepDoan', 'dotNgheNghiep', 'dotNgayPhongVan'].forEach(id => DOM[id] = makeEl(id, id === 'dotNgayPhongVan' ? 'date' : 'text'));
// gia lap gia tri cu (stale) nhu screenshot
DOM.dotTenXiNghiep.value = 'イチビキ株式会社';
DOM.dotNghiepDoan.value = 'SCI協同組合';
DOM.dotNgheNghiep.value = '惣菜加工';
DOM.dotNgayPhongVan.value = '2026-11-15';
SafeStorage.setItem(DOT_STORAGE_KEY, JSON.stringify({ tenXiNghiep: 'イチビキ株式会社', nghiepDoan: 'SCI協同組合', ngheNghiep: '惣菜加工', ngayPhongVan: '2026-11-15' }));

ganThongTinDot({ tenXiNghiep: '角田工業株式会社　様', nghiepDoan: 'Techno Trade 協同組合', ngheNghiep: '強化プラスチック成形', ngayPhongVan: '2024-12-18' });
check('form dotTenXiNghiep = 角田工業株式会社　様', DOM.dotTenXiNghiep.value === '角田工業株式会社　様', DOM.dotTenXiNghiep.value);
check('form dotNghiepDoan = Techno Trade 協同組合', DOM.dotNghiepDoan.value === 'Techno Trade 協同組合', DOM.dotNghiepDoan.value);
check('form dotNgheNghiep = 強化プラスチック成形', DOM.dotNgheNghiep.value === '強化プラスチック成形', DOM.dotNgheNghiep.value);
check('form dotNgayPhongVan = 2024-12-18', DOM.dotNgayPhongVan.value === '2024-12-18', DOM.dotNgayPhongVan.value);
const saved = JSON.parse(SafeStorage.getItem(DOT_STORAGE_KEY));
check('DOT_STORAGE_KEY da cap nhat tenXiNghiep', saved.tenXiNghiep === '角田工業株式会社　様', saved);
check('DOT_STORAGE_KEY da cap nhat ngayPhongVan', saved.ngayPhongVan === '2024-12-18', saved);

// khoi phuc sau reload
DOM.dotTenXiNghiep.value = ''; DOM.dotNghiepDoan.value = ''; DOM.dotNgheNghiep.value = ''; DOM.dotNgayPhongVan.value = '';
khoiPhucThongTinDot();
check('khoiPhucThongTinDot tra lai gia tri moi sau reload', DOM.dotTenXiNghiep.value === '角田工業株式会社　様', DOM.dotTenXiNghiep.value);

// gan rong -> khong ghi de
ganThongTinDot({ tenXiNghiep: '', nghiepDoan: '', ngheNghiep: '', ngayPhongVan: '' });
check('ganThongTinDot rong khong xoa gia tri hien co', DOM.dotTenXiNghiep.value === '角田工業株式会社　様');

// docThongTinDot doc tu form
const doc = docThongTinDot();
check('docThongTinDot doc dung tu form', doc.tenXiNghiep === '角田工業株式会社　様' && doc.ngayPhongVan === '2024-12-18', doc);

// ===== 7. TEST D: import excel that (template.xlsx) qua nhapExcelPhoThong =====
console.log('\n=== D. import template.xlsx (nhapExcelPhoThong) ===');
(async () => {
  try {
    const ExcelJS = require('/tmp/ejslib/node_modules/exceljs');
    const buf = fs.readFileSync(path.join(PT, 'template.xlsx'));
    const fakeFile = { arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) };

    // DOM day du cho doDuLieuVaoForm
    const ids = ['hoTen','tenKatakana','ngaySinh','tuoi','gioiTinh','honNhan','diaChiXa','diaChiHuyen','diaChiTinh',
      'chieuCao','canNang','nhomMau','tayThuan','thiLucTrai','thiLucPhai','tiengNhatTu','tiengNhatDen','tiengNhatTruong',
      'tiengNhatDiaDiem','tiengNhatMon','bacHocCaoNhat','xuatNgoai','xuatNgoaiNuoc','xuatNgoaiNoiDung','tenTheThao',
      'soNamTheThao','nguoiQuenSoLuong','nguoiQuenQuanHe','nguoiQuenTuCach','nguoiQuenCongViec','nguoiQuenNoiO',
      'nguoiQuenNhat','thoiGianHocTiengNhat','baiMinna','lyDoDiNhat','songTapTheNam','songTapTheLoai','songTapTheLoaiTuDien',
      'songTapTheSoNguoi','xamMinh','xamMinhChiTiet','hutThuoc','soThich','tinhCach','iq1','iq2','iq3','iq4',
      'ngayChup','ngayChupThang','ngayChupNam','soDienThoai','tonGiao','tonGiaoKhac','muMau','uongRuou','mucTieuVeNuoc','soTienTietKiem','furigana'];
    ids.forEach(id => { if (!DOM[id]) DOM[id] = makeEl(id); });
    DOM['songTapTheLoai'].options = [];
    DOM['xamMinh'].options = [];

    // tbody gia lap cho 4 bang
    const mkTbody = () => ({ innerHTML: '', appendChild() {}, rows: [] });
    const tbodies = { hocvan: mkTbody(), congviec: mkTbody(), bangcap: mkTbody(), giadinh: mkTbody() };
    sandbox.document.querySelector = (sel) => {
      if (sel === 'table[data-loai="hocvan"] tbody' || sel === '#tbodyHocVan') return tbodies.hocvan;
      if (sel === 'table[data-loai="congviec"] tbody' || sel === '#tbodyCongViec') return tbodies.congviec;
      if (sel === 'table[data-loai="bangcap"] tbody' || sel === '#tbodyBangCap') return tbodies.bangcap;
      if (sel === 'table[data-loai="giadinh"] tbody' || sel === '#tbodyGiaDinh') return tbodies.giadinh;
      return null;
    };
    sandbox.document.querySelectorAll = () => [];
    sb2.document.querySelector = sandbox.document.querySelector;
    sb2.document.querySelectorAll = sandbox.document.querySelectorAll;

    // alert -> log
    sandbox.alert = (m) => console.log('  [alert]', m);
    sb2.alert = (m) => console.log('  [alert]', m);

    // gan ExcelJS vao sandbox import + cho import.js dung
    sb2.ExcelJS = ExcelJS;
    sb2.document = document;
    sb2.window.document = document;

    // chay import
    await sb2.window.nhapExcelPhoThong(fakeFile);

    // Kiem tra ket qua trong DOM form
    console.log('  ngaySinh input =', JSON.stringify(DOM['ngaySinh'].value));
    check('import: ngaySinh la yyyy-mm-dd', /^\d{4}-\d{2}-\d{2}$/.test(DOM['ngaySinh'].value), DOM['ngaySinh'].value);
    check('import: ngaySinh khong chua "GMT"', DOM['ngaySinh'].value.indexOf('GMT') < 0);

    // thong tin dot tuyen tu 名簿
    console.log('  dotTenXiNghiep =', JSON.stringify(DOM.dotTenXiNghiep.value));
    console.log('  dotNghiepDoan  =', JSON.stringify(DOM.dotNghiepDoan.value));
    console.log('  dotNgheNghiep  =', JSON.stringify(DOM.dotNgheNghiep.value));
    console.log('  dotNgayPhongVan= ', JSON.stringify(DOM.dotNgayPhongVan.value));
    check('import: dotTenXiNghiep tu C3', DOM.dotTenXiNghiep.value === '有限会社イーシー・キッツ　様', DOM.dotTenXiNghiep.value);
    check('import: dotNghiepDoan tu C4', DOM.dotNghiepDoan.value === 'アセアン事業支援協同組合', DOM.dotNghiepDoan.value);
    check('import: dotNgheNghiep tu M3', DOM.dotNgheNghiep.value === '内装仕上げ', DOM.dotNgheNghiep.value);
    check('import: dotNgayPhongVan tu M4 (yyyy-mm-dd)', DOM.dotNgayPhongVan.value === '2026-10-08', DOM.dotNgayPhongVan.value);
    const saved2 = JSON.parse(SafeStorage.getItem(DOT_STORAGE_KEY));
    check('import: DOT_STORAGE_KEY = thong tin moi', saved2.tenXiNghiep === '有限会社イーシー・キッツ　様', saved2);

    // danh sach da luu
    const list = layDanhSachHoSo();
    check('import: luu duoc danh sach', Array.isArray(list) && list.length > 0, list && list.length);
    if (list.length > 0) {
      const hs0 = list[0];
      console.log('  hs[0].ngaySinh =', JSON.stringify(hs0.ngaySinh));
      check('import: hs[0].ngaySinh ISO', /^\d{4}-\d{2}-\d{2}$/.test(hs0.ngaySinh), hs0.ngaySinh);
      check('import: hs[0].hocVan MM/YYYY', (hs0.hocVan || []).every(e => !e.tu || /^\d{2}\/\d{4}$/.test(e.tu) || e.den === '現在'), hs0.hocVan);
      check('import: hs[0].congViec MM/YYYY', (hs0.congViec || []).every(e => !e.tu || /^\d{2}\/\d{4}$/.test(e.tu)), hs0.congViec);
      check('import: hs[0].bangCap MM/YYYY', (hs0.bangCap || []).every(e => !e.ngay || /^\d{2}\/\d{4}$/.test(e.ngay)), hs0.bangCap);
      // hien thi cot ngay sinh
      const hien = hienThiNgaySinh(hs0.ngaySinh);
      check('import: hienThiNgaySinh(hs0) DD/MM/YYYY', /^\d{2}\/\d{2}\/\d{4}$/.test(hien), hien);
    }
  } catch (e) {
    fail++;
    console.log('  FAIL - import template.xlsx throw:', e && e.stack ? e.stack.split('\n').slice(0, 4).join(' | ') : e);
  }

  console.log('\n==============================');
  console.log('KET QUA: ' + pass + ' PASS, ' + fail + ' FAIL');
  process.exit(fail > 0 ? 1 : 0);
})();
