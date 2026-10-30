// ocr-import.js - OCR từ ảnh/PDF để tự động điền form nhập phổ thông
// Sử dụng Tesseract.js (chạy trong trình duyệt) + pdf.js để đọc PDF

(function () {
  'use strict';

  const OCR_LANG = 'vie+eng'; // Tiếng Việt + Anh (Tesseract có thể nhận diện cả hai)
  const worker = Tesseract.createWorker({
    logger: (m) => {
      if (m.status === 'recognizing text') {
        const el = document.getElementById('ocrStatus');
        if (el) el.textContent = 'Đang nhận diện văn bản... ' + Math.round(m.progress * 100) + '%';
      }
    },
  });

  let pdfjsLib = null;

  async function initPdfJs() {
    if (pdfjsLib) return pdfjsLib;
    pdfjsLib = window.pdfjsLib || window.pdfjsDistBuildPdf || null;
    if (!pdfjsLib) {
      // pdf.js CDN exposes global pdfjsLib
      pdfjsLib = window.pdfjsLib;
    }
    if (!pdfjsLib) {
      throw new Error('pdf.js chưa tải được');
    }
    return pdfjsLib;
  }

  async function pdfToImages(file) {
    const pdfjs = await initPdfJs();
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    const images = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 }); // độ phân giải cao hơn cho OCR
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      await page.render({ canvasContext: ctx, viewport: viewport }).promise;
      images.push(canvas.toDataURL('image/png'));
    }
    return images;
  }

  async function ocrImageElement(imgEl) {
    await worker.load();
    await worker.loadLanguage(OCR_LANG);
    await worker.initialize(OCR_LANG);
    const result = await worker.recognize(imgEl);
    await worker.terminate();
    return result.data.text;
  }

  function parseOcrText(text) {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
    const data = {};

    // Helper: tìm giá trị sau từ khóa
    function findAfter(keyword) {
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].toLowerCase().includes(keyword.toLowerCase())) {
          // Lấy phần sau từ khóa trên cùng dòng
          const idx = lines[i].toLowerCase().indexOf(keyword.toLowerCase());
          let val = lines[i].substring(idx + keyword.length).trim();
          if (val) return val;
          // Nếu không có, thử dòng tiếp theo
          if (lines[i + 1]) return lines[i + 1].trim();
        }
      }
      return '';
    }

    // Họ tên
    data.hoTen = findAfter('Họ tên') || findAfter('Họ và tên') || findAfter('Họ tên:');

    // Ngày sinh (tìm pattern ngày tháng năm)
    const ngaySinhMatch = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (ngaySinhMatch) {
      data.ngaySinh = `${ngaySinhMatch[3]}-${ngaySinhMatch[2].padStart(2, '0')}-${ngaySinhMatch[1].padStart(2, '0')}`;
    }

    // Giới tính
    const gt = findAfter('Giới tính');
    if (/nam/i.test(gt)) data.gioiTinh = 'Nam';
    else if (/nữ|nu/i.test(gt)) data.gioiTinh = 'Nữ';
    else if (/khác/i.test(gt)) data.gioiTinh = 'Khác';

    // Dân tộc
    data.danToc = findAfter('Dân tộc') || findAfter('Dân tộc:');

    // Tôn giáo
    data.tonGiao = findAfter('Tôn giáo') || findAfter('Tôn giáo:');

    // Nơi sinh
    data.noiSinh = findAfter('Nơi sinh') || findAfter('Nơi sinh:');

    // Nơi ở hiện tại / Địa chỉ
    data.noiOHienTai = findAfter('Nơi ở') || findAfter('Địa chỉ') || findAfter('Nơi ở hiện tại:');

    // Số CMND/CCCD
    const cccdMatch = text.match(/(\d{9,12})/);
    if (cccdMatch) data.soCmnd = cccdMatch[1];

    // Ngày cấp
    const ngayCapMatch = text.match(/Ngày cấp[:\s]*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/i);
    if (ngayCapMatch) {
      data.ngayCap = `${ngayCapMatch[3]}-${ngayCapMatch[2].padStart(2, '0')}-${ngayCapMatch[1].padStart(2, '0')}`;
    }

    // Nơi cấp
    data.noiCap = findAfter('Nơi cấp') || findAfter('Nơi cấp:');

    // Quê quán
    data.queQuan = findAfter('Quê quán') || findAfter('Quê quán:');

    // Học vấn cao nhất
    data.trinhDo = findAfter('Trình độ') || findAfter('Học vấn') || findAfter('Bằng cấp cao nhất:');

    // Tình trạng hôn nhân
    const honNhan = findAfter('Hôn nhân') || findAfter('Tình trạng hôn nhân');
    if (/đã kết hôn|đã có gia đình/i.test(honNhan)) data.honNhan = 'Đã kết hôn';
    else if (/độc thân|chưa kết hôn/i.test(honNhan)) data.honNhan = 'Độc thân';

    // Nghề nghiệp
    data.ngheNghiep = findAfter('Nghề nghiệp') || findAfter('Công việc hiện tại');

    // Lý do đến Nhật
    data.lyDoDiNhat = findAfter('Lý do đến Nhật') || findAfter('Lý do muốn đến Nhật') || findAfter('Mục đích');

    return data;
  }

  function autoFillForm(data) {
    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el && val) {
        el.value = val;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
    };

    if (data.hoTen) set('hoTen', data.hoTen);
    if (data.ngaySinh) set('ngaySinh', data.ngaySinh);
    if (data.gioiTinh) set('gioiTinh', data.gioiTinh);
    if (data.danToc) set('danToc', data.danToc);
    if (data.tonGiao) set('tonGiao', data.tonGiao);
    if (data.noiSinh) set('noiSinh', data.noiSinh);
    if (data.noiOHienTai) set('diaChiHienTai', data.noiOHienTai);
    if (data.soCmnd) set('soCmnd', data.soCmnd);
    if (data.ngayCap) set('ngayCap', data.ngayCap);
    if (data.noiCap) set('noiCap', data.noiCap);
    if (data.queQuan) set('queQuan', data.queQuan);
    if (data.trinhDo) set('trinhDo', data.trinhDo);
    if (data.honNhan) set('honNhan', data.honNhan);
    if (data.ngheNghiep) set('ngheNghiep', data.ngheNghiep);
    if (data.lyDoDiNhat) set('lyDoDiNhat', data.lyDoDiNhat);

    const status = document.getElementById('ocrStatus');
    if (status) status.textContent = 'Đã OCR xong. Vui lòng kiểm tra lại các thông tin đã điền.';
  }

  async function processFile(file) {
    const status = document.getElementById('ocrStatus');
    if (status) status.textContent = 'Đang xử lý file...';

    let images = [];
    if (file.type === 'application/pdf') {
      images = await pdfToImages(file);
    } else {
      images.push(URL.createObjectURL(file));
    }

    let allText = '';
    for (const imgSrc of images) {
      const img = document.createElement('img');
      img.src = imgSrc;
      await new Promise((r) => (img.onload = r));
      const text = await ocrImageElement(img);
      allText += '\n--- Trang ---\n' + text;
      URL.revokeObjectURL(imgSrc);
    }

    const data = parseOcrText(allText);
    autoFillForm(data);
    if (status) status.textContent = 'Hoàn tất OCR. Vui lòng kiểm tra và bổ sung thông tin còn thiếu.';
  }

  document.getElementById('btnOcrPdf').addEventListener('click', () => {
    document.getElementById('inputOcrPdf').click();
  });

  document.getElementById('inputOcrPdf').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      await processFile(file);
    } catch (err) {
      console.error(err);
      const status = document.getElementById('ocrStatus');
      if (status) status.textContent = 'Lỗi OCR: ' + err.message;
    }
  });
})();
