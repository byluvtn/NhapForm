/**
 * storage.js
 * Quản lý lưu trữ danh sách học sinh vào LocalStorage trình duyệt.
 */

const STORAGE_KEY = 'danhSachHocSinh';

/**
 * Lấy giá trị của 1 input/select/textarea theo id, trả về '' nếu không tồn tại.
 * @param {string} id
 * @returns {string}
 */
function getFieldValue(id) {
    const el = document.getElementById(id);
    if (!el) return '';
    if (el.type === 'checkbox') return el.checked;
    if (el.type === 'radio') {
        const checked = document.querySelector(`input[name="${el.name}"]:checked`);
        return checked ? checked.value : '';
    }
    return el.value || '';
}

/**
 * Gán giá trị cho 1 input/select/textarea theo id, bỏ qua nếu không tồn tại.
 * @param {string} id
 * @param {*} value
 */
function setFieldValue(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.type === 'checkbox') {
        el.checked = !!value;
        return;
    }
    if (el.type === 'radio') {
        const target = document.querySelector(`input[name="${el.name}"][value="${value}"]`);
        if (target) target.checked = true;
        return;
    }
    el.value = value !== undefined && value !== null ? value : '';
}

/**
 * Thu thập toàn bộ dữ liệu đang có trên form thành 1 object học sinh.
 * @returns {Object}
 */
function collectFormData() {
    const student = {
        maHS: getFieldValue('maHS'),
        hoTen: getFieldValue('hoTen'),
        tenKatakana: getFieldValue('tenKatakana'),
        ngaySinh: getFieldValue('ngaySinh'),
        gioiTinh: getFieldValue('gioiTinh'),
        theLuc: getFieldValue('theLuc'),
        hocVan: getFieldValue('hocVan'),
        congViec: getFieldValue('congViec'),
        giaDinh: getFieldValue('giaDinh'),
        sci: {
            diemSCI: getFieldValue('diemSCI'),
            ghiChuSCI: getFieldValue('ghiChuSCI'),
        },
        id: Date.now(),
        createAt: new Date(),
    };

    return student;
}

/**
 * Đọc danh sách học sinh từ LocalStorage.
 * @returns {Array<Object>}
 */
function getStudentList() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (error) {
        console.error('Lỗi khi đọc danh sách học sinh từ LocalStorage:', error);
        return [];
    }
}

/**
 * Lưu danh sách học sinh vào LocalStorage.
 * @param {Array<Object>} list
 */
function setStudentList(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

/**
 * Xóa trắng form về trạng thái mặc định.
 */
function resetForm() {
    const form = document.querySelector('form');
    if (form) {
        form.reset();
        return;
    }

    [
        'maHS',
        'hoTen',
        'tenKatakana',
        'ngaySinh',
        'gioiTinh',
        'theLuc',
        'hocVan',
        'congViec',
        'giaDinh',
        'diemSCI',
        'ghiChuSCI',
    ].forEach((id) => setFieldValue(id, ''));
}

/**
 * Hiển thị thông báo lưu thành công.
 * @param {string} message
 */
function showSaveNotification(message) {
    alert(message || 'Lưu hồ sơ học sinh thành công!');
}

/**
 * Lấy object từ collectFormData(), lưu vào LocalStorage, hiển thị thông báo,
 * xóa trắng form và render lại bảng danh sách học sinh.
 */
function saveProfile() {
    const student = collectFormData();
    const list = getStudentList();

    list.push(student);
    setStudentList(list);

    showSaveNotification('Lưu hồ sơ học sinh thành công!');
    resetForm();
    renderStudentTable();
}

/**
 * Render danh sách học sinh từ LocalStorage thành bảng HTML.
 */
function renderStudentTable() {
    const container = document.getElementById('danhSachHocSinhContainer');
    if (!container) return;

    const list = getStudentList();

    if (!list.length) {
        container.innerHTML = '<p>Chưa có học sinh nào được lưu.</p>';
        return;
    }

    const rows = list
        .map((student, index) => {
            const loaiForm = student.sci && (student.sci.diemSCI || student.sci.ghiChuSCI)
                ? 'SCI'
                : 'Phổ thông';

            return `
        <tr>
          <td>${index + 1}</td>
          <td>${student.maHS || ''}</td>
          <td>${student.hoTen || ''}</td>
          <td>${student.tenKatakana || ''}</td>
          <td>${student.ngaySinh || ''}</td>
          <td>${loaiForm}</td>
          <td>
            <button type="button" onclick="editProfile(${student.id})">Sửa</button>
            <button type="button" onclick="deleteProfile(${student.id})">Xóa</button>
          </td>
        </tr>
      `;
        })
        .join('');

    container.innerHTML = `
    <table border="1" cellspacing="0" cellpadding="5" style="width:100%; border-collapse: collapse;">
      <thead>
        <tr>
          <th>STT</th>
          <th>Mã HS</th>
          <th>Họ tên</th>
          <th>Tên Katakana</th>
          <th>Ngày sinh</th>
          <th>Loại form</th>
          <th>Hành động</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

/**
 * Tìm học sinh theo id và đổ toàn bộ dữ liệu ngược lại vào form để sửa/kiểm tra.
 * @param {number} id
 */
function editProfile(id) {
    const list = getStudentList();
    const student = list.find((item) => item.id === id);

    if (!student) {
        alert('Không tìm thấy học sinh cần sửa.');
        return;
    }

    setFieldValue('maHS', student.maHS);
    setFieldValue('hoTen', student.hoTen);
    setFieldValue('tenKatakana', student.tenKatakana);
    setFieldValue('ngaySinh', student.ngaySinh);
    setFieldValue('gioiTinh', student.gioiTinh);
    setFieldValue('theLuc', student.theLuc);
    setFieldValue('hocVan', student.hocVan);
    setFieldValue('congViec', student.congViec);
    setFieldValue('giaDinh', student.giaDinh);

    if (student.sci) {
        setFieldValue('diemSCI', student.sci.diemSCI);
        setFieldValue('ghiChuSCI', student.sci.ghiChuSCI);
    }
}

/**
 * Xóa học sinh khỏi LocalStorage sau khi xác nhận, rồi render lại bảng.
 * @param {number} id
 */
function deleteProfile(id) {
    const confirmed = confirm('Bạn có chắc chắn muốn xóa học sinh này không?');
    if (!confirmed) return;

    const list = getStudentList();
    const newList = list.filter((item) => item.id !== id);

    setStudentList(newList);
    renderStudentTable();
}

// Tự động render bảng danh sách học sinh và gắn sự kiện khi trang vừa tải xong.
document.addEventListener('DOMContentLoaded', () => {
    renderStudentTable();

    const btnLuuHoSo = document.getElementById('btnLuuHoSo');
    if (btnLuuHoSo) {
        btnLuuHoSo.addEventListener('click', saveProfile);
    }
});
