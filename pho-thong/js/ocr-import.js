// ocr-import.js - OCR từ ảnh/PDF để tự động điền form nhập phổ thông
// Sử dụng Tesseract.js v5 (chạy trong trình duyệt) + pdf.js để đọc PDF

(function () {
  'use strict';

  const OCR_LANG = 'vie+eng'; // Tiếng Việt + Anh
  let worker = null;
  let pdfjsLib = null;

  function setStatus(msg) {
    const el = document.getElementById('ocrStatus');
    if (el) el.textContent = msg;
  }

  // Hiển thị kết quả OCR thô để người dùng đối chiếu / copy tay
  function showRawText(text) {
    let box = document.getElementById('ocrRawBox');
    if (!box) {
      box = document.createElement('div');
      box.id = 'ocrRawBox';
      box.className = 'mt-2 border rounded p-2 bg-gray-50';
      const status = document.getElementById('ocrStatus');
      if (status && status.parentNode) status.parentNode.insertBefore(box, status.nextSibling);
      else document.body.appendChild(box);
    }
    box.innerHTML =
      '<div class="flex items-center justify-between mb-1">' +
      '<span class="text-sm font-semibold">Văn bản OCR nhận được (đối chiếu thủ công)</span>' +
      '<button type="button" id="ocrRawToggle" class="text-xs text-blue-600 underline">Ẩn/Hiện</button>' +
      '</div>' +
      '<pre id="ocrRawPre" class="text-xs whitespace-pre-wrap max-h-64 overflow-auto bg-white border rounded p-2"></pre>';
    const pre = box.querySelector('#ocrRawPre');
    pre.textContent = text || '(không nhận diện được chữ nào)';
    box.querySelector('#ocrRawToggle').addEventListener('click', () => {
      pre.style.display = pre.style.display === 'none' ? 'block' : 'none';
    });
  }

  // Tesseract v5: createWorker(langs, oem, options) -> Promise<Worker>
  // Logger phải truyền qua options.logger (không phải tham số thứ 2)
  async function ensureWorker() {
    if (worker) return worker;
    setStatus('Đang tải bộ nhận diện ngôn ngữ (lần đầu có thể mất 30-60 giây)...');
    worker = await Tesseract.createWorker(OCR_LANG, 1, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          setStatus('Đang nhận diện văn bản... ' + Math.round((m.progress || 0) * 100) + '%');
        } else if (m.status) {
          setStatus('Đang chuẩn bị OCR: ' + m.status + '...');
        }
      },
    });
    return worker;
  }

  async function initPdfJs() {
    if (pdfjsLib) return pdfjsLib;
    pdfjsLib = window.pdfjsLib || window.pdfjsDistBuildPdf || null;
    if (!pdfjsLib) {
      throw new Error('pdf.js chưa tải được');
    }
    // pdf.js v3 cần workerSrc để render
    if (pdfjsLib.GlobalWorkerOptions && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
    }
    return pdfjsLib;
  }

  async function pdfToImages(file) {
    const pdfjs = await initPdfJs();
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    const images = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      setStatus('Đang chuyển PDF sang ảnh... trang ' + i + '/' + pdf.numPages);
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 });
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
    const w = await ensureWorker();
    const result = await w.recognize(imgEl);
    return result.data.text;
  }

  function parseOcrText(text) {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
    const data = {};

    function findAfter(keyword) {
      const kw = keyword.toLowerCase();
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.toLowerCase().includes(kw)) {
          const idx = line.toLowerCase().indexOf(kw);
          let val = line.substring(idx + keyword.length).trim();
          if (val) return val;
          if (lines[i + 1]) return lines[i + 1].trim();
        }
      }
      return '';
    }

    data.hoTen = findAfter('Họ tên') || findAfter('Họ và tên') || findAfter('Họ tên:');

    const ngaySinhMatch = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (ngaySinhMatch) {
      data.ngaySinh = `${ngaySinhMatch[3]}-${ngaySinhMatch[2].padStart(2, '0')}-${ngaySinhMatch[1].padStart(2, '0')}`;
    }

    const gt = findAfter('Giới tính');
    if (/nam/i.test(gt)) data.gioiTinh = 'Nam';
    else if (/nữ|nu/i.test(gt)) data.gioiTinh = 'Nữ';
    else if (/khác/i.test(gt)) data.gioiTinh = 'Khác';

    data.danToc = findAfter('Dân tộc') || findAfter('Dân tộc:');
    data.tonGiao = findAfter('Tôn giáo') || findAfter('Tôn giáo:');
    data.noiSinh = findAfter('Nơi sinh') || findAfter('Nơi sinh:');
    data.noiOHienTai = findAfter('Nơi ở') || findAfter('Địa chỉ') || findAfter('Nơi ở hiện tại:');

    const cccdMatch = text.match(/(\d{9,12})/);
    if (cccdMatch) data.soCmnd = cccdMatch[1];

    const ngayCapMatch = text.match(/Ngày cấp[:\s]*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/i);
    if (ngayCapMatch) {
      data.ngayCap = `${ngayCapMatch[3]}-${ngayCapMatch[2].padStart(2, '0')}-${ngayCapMatch[1].padStart(2, '0')}`;
    }

    data.noiCap = findAfter('Nơi cấp') || findAfter('Nơi cấp:');
    data.queQuan = findAfter('Quê quán') || findAfter('Quê quán:');
    data.trinhDo = findAfter('Trình độ') || findAfter('Học vấn') || findAfter('Bằng cấp cao nhất:');

    const honNhan = findAfter('Hôn nhân') || findAfter('Tình trạng hôn nhân');
    if (/đã kết hôn|đã có gia đình/i.test(honNhan)) data.honNhan = 'Đã kết hôn';
    else if (/độc thân|chưa kết hôn/i.test(honNhan)) data.honNhan = 'Chưa kết hôn';

    data.ngheNghiep = findAfter('Nghề nghiệp') || findAfter('Công việc hiện tại');
    data.lyDoDiNhat = findAfter('Lý do đến Nhật') || findAfter('Lý do muốn đến Nhật') || findAfter('Mục đích');

    return data;
  }

  function autoFillForm(data) {
    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el && val) {
        el.value = val;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      }
      return false;
    };

    const filled = [];
    if (data.hoTen && set('hoTen', data.hoTen)) filled.push('hoTen');
    if (data.ngaySinh && set('ngaySinh', data.ngaySinh)) filled.push('ngaySinh');
    if (data.gioiTinh && set('gioiTinh', data.gioiTinh)) filled.push('gioiTinh');
    if (data.tonGiao && set('tonGiao', data.tonGiao)) filled.push('tonGiao');
    if (data.honNhan && set('honNhan', data.honNhan)) filled.push('honNhan');
    // Địa chỉ: form có diaChiXa / diaChiHuyen / diaChiTinh
    if (data.noiOHienTai) {
      if (set('diaChiXa', data.noiOHienTai)) filled.push('diaChiXa');
    }
    // Các trường không có trong form hiện tại: lưu vào console để người dùng tham khảo
    const extra = [];
    if (data.danToc) extra.push('Dân tộc: ' + data.danToc);
    if (data.noiSinh) extra.push('Nơi sinh: ' + data.noiSinh);
    if (data.soCmnd) extra.push('Số CMND/CCCD: ' + data.soCmnd);
    if (data.ngayCap) extra.push('Ngày cấp: ' + data.ngayCap);
    if (data.noiCap) extra.push('Nơi cấp: ' + data.noiCap);
    if (data.queQuan) extra.push('Quê quán: ' + data.queQuan);
    if (data.trinhDo) extra.push('Trình độ: ' + data.trinhDo);
    if (data.ngheNghiep) extra.push('Nghề nghiệp: ' + data.ngheNghiep);
    if (data.lyDoDiNhat) extra.push('Lý do đến Nhật: ' + data.lyDoDiNhat);
    if (extra.length) {
      console.log('[OCR] Thông tin thêm (form không có ô tương ứng):\n' + extra.join('\n'));
    }
    console.log('[OCR] Đã điền các ô:', filled.join(', ') || '(không có)');
  }

  async function processFile(file) {
    setStatus('Đang xử lý file...');

    let images = [];
    if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
      images = await pdfToImages(file);
    } else {
      images.push(URL.createObjectURL(file));
    }

    let allText = '';
    for (let i = 0; i < images.length; i++) {
      const imgSrc = images[i];
      if (images.length > 1) setStatus('Đang OCR trang ' + (i + 1) + '/' + images.length + '...');
      const img = document.createElement('img');
      img.src = imgSrc;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error('Không đọc được ảnh'));
      });
      const text = await ocrImageElement(img);
      allText += '\n--- Trang ' + (i + 1) + ' ---\n' + text;
      if (imgSrc.startsWith('blob:')) URL.revokeObjectURL(imgSrc);
    }

    showRawText(allText);
    const data = parseOcrText(allText);
    autoFillForm(data);
    setStatus('Hoàn tất OCR. Vui lòng kiểm tra và bổ sung thông tin còn thiếu.');
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
      setStatus('Lỗi OCR: ' + (err && err.message ? err.message : err));
    } finally {
      e.target.value = '';
    }
  });
})();
