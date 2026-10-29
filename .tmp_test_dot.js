// Test mo phong luong: dien form -> Luu -> xoaTrangForm -> Xuat Excel
const mem = {};
const SafeStorage = {
  getItem: (k) => (k in mem ? mem[k] : null),
  setItem: (k, v) => { mem[k] = String(v); },
  removeItem: (k) => { delete mem[k]; }
};
const DOT_STORAGE_KEY = 'nhapform_thong_tin_dot';

// DOM gia lap
const DOM = {
  dotTenXiNghiep: { id: 'dotTenXiNghiep', value: '', type: 'text', addEventListener(){} },
  dotNghiepDoan: { id: 'dotNghiepDoan', value: '', type: 'text', addEventListener(){} },
  dotNgheNghiep: { id: 'dotNgheNghiep', value: '', type: 'text', addEventListener(){} },
  dotNgayPhongVan: { id: 'dotNgayPhongVan', value: '', type: 'date', addEventListener(){} },
  hoTen: { id: 'hoTen', value: '', type: 'text', addEventListener(){} }
};
const document = {
  getElementById: (id) => DOM[id] || null,
  querySelector: () => null,
  body: { querySelectorAll: (sel) => Object.values(DOM) }
};
const window = {};

const DS_ID = { tenXiNghiep: 'dotTenXiNghiep', nghiepDoan: 'dotNghiepDoan', nghiep: 'dotNgheNghiep', ngay: 'dotNgayPhongVan' };

function docMotOTThongTinDot(id) {
  const el = document.getElementById(id);
  if (el && String(el.value || '').trim() !== '') return String(el.value).trim();
  return '';
}
function rong(o) {
  return !o || ['tenXiNghiep','nghiepDoan','ngheNghiep','ngayPhongVan'].every(k => !String(o[k]||'').trim());
}
function docThongTinDot() {
  const kq = {
    tenXiNghiep: docMotOTThongTinDot(DS_ID.tenXiNghiep),
    nghiepDoan: docMotOTThongTinDot(DS_ID.nghiepDoan),
    ngheNghiep: docMotOTThongTinDot(DS_ID.nghiep),
    ngayPhongVan: docMotOTThongTinDot(DS_ID.ngay)
  };
  if (rong(kq)) {
    const raw = SafeStorage.getItem(DOT_STORAGE_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (d && !rong(d)) {
        kq.tenXiNghiep = d.tenXiNghiep; kq.nghiepDoan = d.nghiepDoan;
        kq.ngheNghiep = d.ngheNghiep; kq.ngayPhongVan = d.ngayPhongVan;
      }
    }
  } else {
    SafeStorage.setItem(DOT_STORAGE_KEY, JSON.stringify(kq));
  }
  return kq;
}
function luuThongTinDot() {
  const d = docThongTinDot();
  const co = ['tenXiNghiep','nghiepDoan','ngheNghiep','ngayPhongVan'].some(k => String(d[k]||'').trim() !== '');
  if (co) SafeStorage.setItem(DOT_STORAGE_KEY, JSON.stringify(d));
}
function khoiPhucThongTinDot() {
  const raw = SafeStorage.getItem(DOT_STORAGE_KEY);
  if (raw) {
    const d = JSON.parse(raw);
    ['dotTenXiNghiep','dotNghiepDoan','dotNgheNghiep','dotNgayPhongVan'].forEach(id => {
      const key = { dotTenXiNghiep:'tenXiNghiep', dotNghiepDoan:'nghiepDoan', dotNgheNghiep:'ngheNghiep', dotNgayPhongVan:'ngayPhongVan' }[id];
      if (DOM[id]) DOM[id].value = d[key] || '';
    });
  }
}
function xoaTrangForm() {
  const ID_GIU_LAI = ['dotTenXiNghiep','dotNghiepDoan','dotNgheNghiep','dotNgayPhongVan'];
  Object.values(DOM).forEach(inp => {
    if (ID_GIU_LAI.includes(inp.id)) return;
    inp.value = '';
  });
  khoiPhucThongTinDot();
}

// ====== KICH BAN ======
console.log('--- 1. Nguoi dung dien form ---');
DOM.dotTenXiNghiep.value = 'ABS';
DOM.dotNghiepDoan.value = 'abc';
DOM.dotNgheNghiep.value = '123';
DOM.dotNgayPhongVan.value = '2026-11-15';
DOM.hoTen.value = 'TRAN DANG KHOI';
console.log('docThongTinDot:', docThongTinDot());

console.log('--- 2. Bam LUU HO SO ---');
luuThongTinDot();
xoaTrangForm();
console.log('Sau khi luu - form con gia tri?');
console.log('  tenXiNghiep =', JSON.stringify(DOM.dotTenXiNghiep.value));
console.log('  nghiepDoan  =', JSON.stringify(DOM.dotNghiepDoan.value));
console.log('  ngheNghiep  =', JSON.stringify(DOM.dotNgheNghiep.value));
console.log('  ngayPV      =', JSON.stringify(DOM.dotNgayPhongVan.value));
console.log('  hoTen (phai rong) =', JSON.stringify(DOM.hoTen.value));

console.log('--- 3. Bam XUAT EXCEL ---');
const kq = docThongTinDot();
console.log('Gia tri ghi vao Excel:', kq);
const pass = kq.tenXiNghiep === 'ABS' && kq.nghiepDoan === 'abc' && kq.ngheNghiep === '123' && kq.ngayPhongVan === '2026-11-15';
console.log(pass ? '==> PASS' : '==> FAIL');

console.log('--- 4. Reload trang (F5) ---');
DOM.dotTenXiNghiep.value = ''; DOM.dotNghiepDoan.value = ''; DOM.dotNgheNghiep.value = ''; DOM.dotNgayPhongVan.value = '';
khoiPhucThongTinDot();
console.log('Sau reload - khoi phuc:');
console.log('  tenXiNghiep =', JSON.stringify(DOM.dotTenXiNghiep.value));
console.log('  ngayPV      =', JSON.stringify(DOM.dotNgayPhongVan.value));
const pass2 = DOM.dotTenXiNghiep.value === 'ABS';
console.log(pass2 ? '==> PASS reload' : '==> FAIL reload');

console.log('--- 5. Xuat Excel NGAY sau reload (khong dien lai) ---');
console.log('Gia tri:', docThongTinDot());
