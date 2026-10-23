// excel-import.js — Nhập dữ liệu từ file Excel đã xuất (pho-thong) để tự điền form chỉnh sửa
// Phụ thuộc: ExcelJS (global), storage.js (doDuLieuVaoForm, luuDanhSachHoSo, capNhatBangDanhSach, SafeStorage, DOT_STORAGE_KEY, DS_ID_THONG_TIN_DOT)

(function () {
  'use strict';

  function pad2(v) { return ('0' + String(v)).slice(-2); }

  function cellVal(ws, r, c) {
    var cell = ws.getCell(r, c);
    if (!cell) return '';
    var v = cell.value;
    if (v === null || v === undefined) return '';
    if (typeof v === 'object') {
      if (v instanceof Date) return formatDateObj(v);
      if (v.richText) return v.richText.map(function (x) { return x.text || ''; }).join('');
      if (v.text !== undefined) return String(v.text);
      if (v.result !== undefined) {
        if (v.result instanceof Date) return formatDateObj(v.result);
        return String(v.result);
      }
      // Ô kiểu công thức/ngày: ExcelJS có thể trả về {result:..., ...} hoặc serial number
      if (typeof v.value !== 'undefined' && v.value !== null) {
        if (v.value instanceof Date) return formatDateObj(v.value);
        return String(v.value);
      }
      return String(v);
    }
    return String(v);
  }

  // Date -> yyyy-mm-dd theo giờ ĐỊA PHƯƠNG (không dùng toISOString vì lệch múi giờ)
  function formatDateObj(d) {
    if (!(d instanceof Date) || isNaN(d.getTime())) return '';
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function trim(s) { return String(s == null ? '' : s).trim(); }

  // Chuỗi ngày bất kỳ -> yyyy-mm-dd (dùng cho input type="date")
  // Hỗ trợ: Date object, yyyy年M月d日, yyyy-mm-dd, yyyy/mm/dd, dd/mm/yyyy, d.m.yyyy
  function toISODate(s) {
    if (s instanceof Date) return formatDateObj(s);
    s = trim(s);
    if (!s) return '';

    // yyyy年M月d日
    var m = s.match(/(\d{4})\s*[年\/\-\.]\s*(\d{1,2})\s*[月\/\-\.]\s*(\d{1,2})/);
    if (m) return m[1] + '-' + pad2(m[2]) + '-' + pad2(m[3]);

    // yyyy-mm-dd / yyyymmdd
    m = s.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (m) return m[1] + '-' + m[2] + '-' + m[3];
    m = s.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
    if (m) return m[1] + '-' + pad2(m[2]) + '-' + pad2(m[3]);

    // dd/mm/yyyy (định dạng hiển thị của trình duyệt VN)
    m = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
    if (m) return m[3] + '-' + pad2(m[2]) + '-' + pad2(m[1]);

    // Chuỗi kiểu "Thu Feb 19 2004 07:00:00 GMT+0700" hoặc ISO
    var d = new Date(s);
    if (!isNaN(d.getTime())) return formatDateObj(d);

    return s;
  }

  // yyyy年M月d日 -> yyyy-mm-dd
  function parseBirth(s) { return toISODate(s); }

  // Chuỗi tháng bất kỳ -> MM/YYYY
  // Hỗ trợ: yyyy年MM月, MM/YYYY, YYYY/MM, YYYY-MM, Date object, "Sun Sep 01 2019 07:00 GMT"
  function parseYearMonth(s) {
    if (s instanceof Date) {
      if (isNaN(s.getTime())) return '';
      return pad2(s.getMonth() + 1) + '/' + s.getFullYear();
    }
    s = trim(s);
    if (!s) return '';
    if (s === '現在') return '現在';

    // yyyy年MM月 (bắt buộc phải có 月 để tránh khớp nhầm ngày)
    var m = s.match(/(\d{4})\s*年\s*(\d{1,2})\s*月/);
    if (m) return pad2(m[2]) + '/' + m[1];

    // MM/YYYY | MM-YYYY
    m = s.match(/^(\d{1,2})\s*[\/\-\.]\s*(\d{4})$/);
    if (m) return pad2(m[1]) + '/' + m[2];

    // YYYY/MM | YYYY-MM
    m = s.match(/^(\d{4})\s*[\/\-\.]\s*(\d{1,2})$/);
    if (m) return pad2(m[2]) + '/' + m[1];

    // YYYYMM
    m = s.match(/^(\d{4})(\d{2})$/);
    if (m) return m[2] + '/' + m[1];

    // Chuỗi kiểu Date object toString / ISO -> lấy tháng-năm theo giờ ĐỊA PHƯƠNG
    var d = new Date(s);
    if (!isNaN(d.getTime()) && /[a-zA-Z]/.test(s)) {
      return pad2(d.getMonth() + 1) + '/' + d.getFullYear();
    }

    return s;
  }
  // yyyy年M月d日 -> yyyy-mm-dd (ngày phỏng vấn)
  function parseNgayPhongVan(s) { return parseBirth(s); }

  function fullToHalf(s) {
    return String(s).replace(/[０-９]/g, function (ch) {
      return String.fromCharCode(ch.charCodeAt(0) - 0xFEE0);
    });
  }

  function parseSoNguoi(s) {
    s = trim(s);
    var m = s.match(/(\d+)\s*人/);
    if (m) return fullToHalf(m[1]);
    return '';
  }

  function parseLoaiHinh(s) {
    s = trim(s);
    // "アパートで５人部屋で集団生活しました" -> loaiHinh = アパート
    var m = s.match(/^(.+?)で\d+人部屋/);
    if (m) return m[1];
    return s;
  }

  function parseThoiGianHoc(s) {
    // "1ヶ月・みんなの日本語第8課" -> {tg:'1ヶ月', bai:'8'}
    var tg = '', bai = '';
    var m = s.match(/^(.+?)・みんなの日本語第(\d+)課/);
    if (m) { tg = m[1]; bai = m[2]; }
    else if (s === '一週間・自己紹介') { tg = '一週間'; bai = ''; }
    return { tg: tg, bai: bai };
  }

  function parseNamSinhGiaDinh(s) {
    s = trim(s);
    if (s === '死去') return { namSinh: '死去', daMat: true };
    return { namSinh: s, daMat: false };
  }

  function parseXamMinh(s) {
    s = trim(s);
    if (s === '無') return '無';
    // "有(左手、背中)" -> giữ nguyên chuỗi để ganHinhXamVaoForm xử lý
    return s;
  }

  function parseTheThao(s) {
    s = trim(s);
    if (s === 'ー' || s === '') return '';
    return s;
  }
  function parseSoNamTheThao(s) {
    s = trim(s);
    if (s === 'ー' || s === '') return '';
    return s.replace(/年$/, '');
  }

  function parseNguoiQuen(s) {
    s = trim(s);
    if (s === 'ー' || s === '') return '';
    return s;
  }

  function parseXuatNgoai(s) {
    s = trim(s);
    if (s === '無') return 'Không';
    return 'Có';
  }

  function parseHutThuoc(s) {
    s = trim(s);
    if (s === '有') return 'Có';
    return 'Không';
  }

  function parseTayThuan(s) {
    s = trim(s);
    if (s === '左') return 'Trái';
    if (s === '右') return 'Phải';
    return s;
  }

  function parseGioiTinh(s) {
    s = trim(s);
    if (s === '男') return 'Nam';
    if (s === '女') return 'Nữ';
    return s;
  }

  function parseHonNhan(s) {
    s = trim(s);
    if (s === '既婚') return 'Đã kết hôn';
    if (s === '独身') return 'Chưa kết hôn';
    return s;
  }

  function parseNhomMau(s) {
    s = trim(s);
    if (s === 'CHƯA BIẾT') return 'Chưa biết';
    return s;
  }

  function parseBangCapTen(s) {
    s = trim(s);
    if (s === 'ー' || s === '') return '';
    return s;
  }

  function parseNgayChup(sNgay, sThang, sNam) {
    var d = trim(sNgay), m = trim(sThang), y = trim(sNam);
    if (!d && !m && !y) return '';
    d = ('0' + d).slice(-2);
    m = ('0' + m).slice(-2);
    return y + '-' + m + '-' + d;
  }

  function docMotUngVien(ws, stt) {
    var r = 5 + stt;
    var hs = {};
    hs.id = Date.now() + stt;
    hs.hoTen = trim(cellVal(ws, r, 2));
    hs.tenKatakana = trim(cellVal(ws, r, 3));
    hs.ngaySinh = parseBirth(cellVal(ws, r, 4));
    hs.tuoi = trim(cellVal(ws, r, 5));
    hs.gioiTinh = parseGioiTinh(cellVal(ws, r, 6));
    hs.honNhan = parseHonNhan(cellVal(ws, r, 7));
    // dia chi
    hs.diaChiXa = trim(cellVal(ws, r, 8));
    hs.diaChiHuyen = trim(cellVal(ws, r, 9));
    hs.diaChiTinh = trim(cellVal(ws, r, 10));
    hs.queQuan = [hs.diaChiXa, hs.diaChiHuyen, hs.diaChiTinh].filter(Boolean).join(', ');
    hs.chieuCao = trim(cellVal(ws, r, 12));
    hs.canNang = trim(cellVal(ws, r, 13));
    hs.nhomMau = parseNhomMau(cellVal(ws, r, 14));
    hs.tayThuan = parseTayThuan(cellVal(ws, r, 15));
    hs.thiLucTrai = trim(cellVal(ws, r, 16));
    hs.thiLucPhai = trim(cellVal(ws, r, 17));
    // hoc van 4 slot: cols 20..39 (5 cols each)
    var hocVan = [];
    var giccRow = null;
    for (var i = 0; i < 4; i++) {
      var base = 20 + i * 5;
      var tu = trim(cellVal(ws, r, base));
      var den = trim(cellVal(ws, r, base + 1));
      var tinh = trim(cellVal(ws, r, base + 2));
      var truong = trim(cellVal(ws, r, base + 3));
      var khoa = trim(cellVal(ws, r, base + 4));
      if (!tu && !den && !tinh && !truong && !khoa) continue;
      if (truong.indexOf('GICC') >= 0 || truong.indexOf('日本語') >= 0) {
        giccRow = { tu: tu, den: den, tinh: tinh, truong: truong, khoa: khoa };
        continue;
      }
      hocVan.push({
        tu: parseYearMonth(tu),
        den: parseYearMonth(den),
        tinh: tinh,
        truong: truong,
        khoa: khoa
      });
    }
    hs.hocVan = hocVan;
    if (giccRow) {
      hs.tiengNhatTu = parseYearMonth(giccRow.tu);
      hs.tiengNhatDen = parseYearMonth(giccRow.den);
      hs.tiengNhatTruong = giccRow.truong || 'GICC日本語センター';
      hs.tiengNhatDiaDiem = giccRow.tinh || '';
      hs.tiengNhatMon = giccRow.khoa || '日本語学習';
    } else {
      hs.tiengNhatTu = '';
      hs.tiengNhatDen = '現在';
      hs.tiengNhatTruong = 'GICC日本語センター';
      hs.tiengNhatDiaDiem = '';
      hs.tiengNhatMon = '日本語学習';
    }
    // cong viec 4 slot: cols 40..67 (7 cols each)
    var congViec = [];
    for (var j = 0; j < 4; j++) {
      var cb = 40 + j * 7;
      var ctu = trim(cellVal(ws, r, cb));
      var cden = trim(cellVal(ws, r, cb + 1));
      var ctinh = trim(cellVal(ws, r, cb + 2));
      var ccty = trim(cellVal(ws, r, cb + 3));
      var cndcv = trim(cellVal(ws, r, cb + 4));
      var cluong = trim(cellVal(ws, r, cb + 5));
      var cthoigian = trim(cellVal(ws, r, cb + 6));
      if (!ctu && !cden && !ctinh && !ccty && !cndcv && !cluong && !cthoigian) continue;
      congViec.push({
        tu: parseYearMonth(ctu),
        den: parseYearMonth(cden),
        tinh: ctinh,
        cty: ccty,
        ndcv: cndcv,
        luong: cluong,
        thoiGianLam: cthoigian
      });
    }
    hs.congViec = congViec;
    // bang cap: cols 68-71 (68/70 = THÁNG/NĂM cấp, 69/71 = TÊN bằng)
    var bangCap = [];
    var bc68 = parseYearMonth(cellVal(ws, r, 68));
    var bc69 = parseBangCapTen(cellVal(ws, r, 69));
    var bc70 = parseYearMonth(cellVal(ws, r, 70));
    var bc71 = parseBangCapTen(cellVal(ws, r, 71));
    if (bc69 || bc68) bangCap.push({ ten: bc69, ngay: bc68 });
    if (bc71 || bc70) bangCap.push({ ten: bc71, ngay: bc70 });
    hs.bangCap = bangCap;
    hs.bacHocCaoNhat = trim(cellVal(ws, r, 72));
    // gia dinh 8 slot: cols 73..112 (5 cols each)
    var giaDinh = [];
    for (var k = 0; k < 8; k++) {
      var gb = 73 + k * 5;
      var gquanhe = trim(cellVal(ws, r, gb));
      var gtuoi = trim(cellVal(ws, r, gb + 1));
      var gsongchung = trim(cellVal(ws, r, gb + 2));
      var gnghe = trim(cellVal(ws, r, gb + 3));
      var gthu = trim(cellVal(ws, r, gb + 4));
      if (!gquanhe && !gtuoi && !gsongchung && !gnghe && !gthu) continue;
      var parsed = parseNamSinhGiaDinh(gtuoi);
      giaDinh.push({
        quanHe: gquanhe,
        namSinh: parsed.namSinh,
        songChung: (gsongchung === '有'),
        ngheNghiep: gnghe,
        thuNhap: gthu,
        daMat: parsed.daMat
      });
    }
    hs.giaDinh = giaDinh;
    // xuat ngoai
    var xnNuoc = trim(cellVal(ws, r, 113));
    var xnNoiDung = trim(cellVal(ws, r, 114));
    if (xnNuoc === '無') { hs.xuatNgoai = 'Không'; hs.xuatNgoaiNuoc = ''; hs.xuatNgoaiNoiDung = ''; }
    else { hs.xuatNgoai = 'Có'; hs.xuatNgoaiNuoc = (xnNuoc === '無' ? '' : xnNuoc); hs.xuatNgoaiNoiDung = (xnNoiDung === '無' ? '' : xnNoiDung); }
    // the thao
    hs.tenTheThao = parseTheThao(cellVal(ws, r, 115));
    hs.soNamTheThao = parseSoNamTheThao(cellVal(ws, r, 116));
    // nguoi quen
    var nqSo = trim(cellVal(ws, r, 117));
    hs.nguoiQuenSoLuong = (nqSo === 'ー' ? '' : nqSo);
    hs.nguoiQuenQuanHe = parseNguoiQuen(cellVal(ws, r, 118));
    hs.nguoiQuenTuCach = parseNguoiQuen(cellVal(ws, r, 119));
    hs.nguoiQuenCongViec = parseNguoiQuen(cellVal(ws, r, 120));
    hs.nguoiQuenNoiO = parseNguoiQuen(cellVal(ws, r, 121));
    hs.nguoiQuenNhat = (hs.nguoiQuenSoLuong ? '有' : '無');
    // tieng nhat hoc tap
    var tgHoc = parseThoiGianHoc(trim(cellVal(ws, r, 122)));
    hs.thoiGianHocTiengNhat = tgHoc.tg;
    hs.baiMinna = tgHoc.bai;
    hs.lyDoDiNhat = trim(cellVal(ws, r, 123));
    hs.songTapTheNam = trim(cellVal(ws, r, 124));
    var songStr = trim(cellVal(ws, r, 125));
    hs.songTapTheLoai = parseLoaiHinh(songStr);
    hs.songTapTheSoNguoi = parseSoNguoi(songStr);
    // xam minh
    hs.xamMinh = parseXamMinh(cellVal(ws, r, 126));
    hs.hutThuoc = parseHutThuoc(cellVal(ws, r, 127));
    hs.soThich = trim(cellVal(ws, r, 128));
    hs.tinhCach = trim(cellVal(ws, r, 129));
    hs.iq1 = trim(cellVal(ws, r, 130));
    hs.iq2 = trim(cellVal(ws, r, 131));
    hs.iq3 = trim(cellVal(ws, r, 132));
    hs.iq4 = trim(cellVal(ws, r, 133));
    // Ngày chụp ảnh ưu tiên đọc ô ngày đầy đủ (nếu có), nếu không thì ghép ngày/tháng/năm
    var ngayChupFull = toISODate(cellVal(ws, r, 134));
    hs.ngayChup = /^\d{4}-\d{2}-\d{2}$/.test(ngayChupFull)
      ? ngayChupFull
      : parseNgayChup(cellVal(ws, r, 135), cellVal(ws, r, 136), cellVal(ws, r, 137));
    // cac truong khong co trong excel -> de trong
    hs.soDienThoai = '';
    hs.tonGiao = '';
    hs.tonGiaoKhac = '';
    hs.muMau = '';
    hs.uongRuou = '';
    hs.mucTieuVeNuoc = '';
    hs.soTienTietKiem = '';
    hs.furigana = hs.tenKatakana;
    return hs;
  }

  async function nhapExcelPhoThong(file) {
    if (!file) return;
    if (typeof ExcelJS === 'undefined') { alert('ExcelJS chưa tải xong.'); return; }
    try {
      var buf = await file.arrayBuffer();
      var wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buf);
      var ws = wb.getWorksheet('総合データ');
      if (!ws) { alert('Không tìm thấy sheet "総合データ" trong file.'); return; }
      // doc thong tin dot tuyen tu 4 o cua sheet 名簿: C3=機関, M3=職種, C4=団体, M4=面接日
      var wsMeibo = wb.getWorksheet('名簿');
      if (wsMeibo) {
        try {
          var tenXN = trim(cellVal(wsMeibo, 3, 3));
          var ngheNghiep = trim(cellVal(wsMeibo, 3, 13));
          var nghiepDoan = trim(cellVal(wsMeibo, 4, 3));
          var ngayPV = parseNgayPhongVan(cellVal(wsMeibo, 4, 13));
          // Gán vào form "Thông tin đợt tuyển" + lưu vào kho lưu chuẩn (DOT_STORAGE_KEY)
          if (typeof window.ganThongTinDot === 'function') {
            window.ganThongTinDot({
              tenXiNghiep: tenXN,
              nghiepDoan: nghiepDoan,
              ngheNghiep: ngheNghiep,
              ngayPhongVan: ngayPV
            });
          } else {
            // dự phòng: gán trực tiếp vào form
            var el;
            if (tenXN) { el = document.getElementById('dotTenXiNghiep'); if (el) el.value = tenXN; }
            if (nghiepDoan) { el = document.getElementById('dotNghiepDoan'); if (el) el.value = nghiepDoan; }
            if (ngheNghiep) { el = document.getElementById('dotNgheNghiep'); if (el) el.value = ngheNghiep; }
            if (ngayPV) { el = document.getElementById('dotNgayPhongVan'); if (el) el.value = ngayPV; }
          }
          console.log('[名簿] Đã đọc thông tin đợt tuyển:', { tenXN: tenXN, nghiepDoan: nghiepDoan, ngheNghiep: ngheNghiep, ngayPV: ngayPV });
        } catch (e) { console.warn('doc dot info loi:', e); }
      }
      // doc danh sach ung vien: bat dau tu row 6 (stt=1)
      var list = [];
      var stt = 1;
      while (true) {
        var hoTen = trim(cellVal(ws, 5 + stt, 2));
        if (!hoTen) break;
        if (stt > 500) break;
        var hs = docMotUngVien(ws, stt);
        list.push(hs);
        stt++;
      }
      if (list.length === 0) { alert('Không tìm thấy dữ liệu ứng viên trong file.'); return; }
      if (typeof luuDanhSachHoSo === 'function') luuDanhSachHoSo(list);
      if (typeof doDuLieuVaoForm === 'function') doDuLieuVaoForm(list[0]);
      if (typeof capNhatBangDanhSach === 'function') capNhatBangDanhSach(list);
      alert('Đã nhập ' + list.length + ' ứng viên từ Excel. Đang hiển thị người đầu tiên để chỉnh sửa.');
    } catch (err) {
      console.error('nhapExcelPhoThong error:', err);
      alert('Lỗi khi đọc file Excel: ' + (err && err.message ? err.message : err));
    }
  }

  window.nhapExcelPhoThong = nhapExcelPhoThong;
})();
