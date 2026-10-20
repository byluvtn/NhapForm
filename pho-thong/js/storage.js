// ===================== pho-thong/js/storage.js =====================
const STORAGE_KEY = "danhSachPhoThong";
let dangSuaIndex = -1;

// Xử lý đổi Sở thích (Khối K): chọn "khac" thì mở ô nhập tự do, ngược lại khóa và điền giá trị đã chọn
window.xuLyDoiSoThich = function (val) {
    const input = document.getElementById("soThich");
    if (!input) return;
    if (val === "khac") {
        input.value = "";
        input.readOnly = false;
        input.className = "border rounded px-2 py-1.5 bg-white text-gray-800 ml-2";
        input.focus();
    } else {
        input.value = val;
        input.readOnly = true;
        input.className = "border rounded px-2 py-1.5 bg-gray-100 text-gray-600 ml-2";
    }
};

function getVal(id) { const el = document.getElementById(id); if (!el) return ""; return el.value !== undefined ? el.value : ""; }
function setVal(id, value) { const el = document.getElementById(id); if (!el) return; el.value = value !== undefined && value !== null ? value : ""; }
function getChecked(id) { const el = document.getElementById(id); if (!el) return false; return !!el.checked; }
function setChecked(id, value) { const el = document.getElementById(id); if (!el) return; el.checked = !!value; }

// Lấy giá trị Tôn giáo: nếu chọn "Khác" thì lấy từ ô nhập tự do #tonGiaoKhac
function getTonGiao() {
    const tonGiaoEl = document.getElementById("tonGiao");
    if (tonGiaoEl && tonGiaoEl.value === "Khác") {
        return getVal("tonGiaoKhac");
    }
    return getVal("tonGiao");
}

// Đổ giá trị Tôn giáo lên form: nếu giá trị không khớp option có sẵn thì chọn "Khác" và điền vào ô tự do
function setTonGiao(value) {
    const tonGiaoEl = document.getElementById("tonGiao");
    const tonGiaoKhacEl = document.getElementById("tonGiaoKhac");
    if (!tonGiaoEl) return;
    const options = Array.from(tonGiaoEl.options).map((opt) => opt.value);
    if (value && options.includes(value) && value !== "Khác") {
        tonGiaoEl.value = value;
        if (tonGiaoKhacEl) { tonGiaoKhacEl.value = ""; tonGiaoKhacEl.style.display = "none"; }
    } else if (value) {
        tonGiaoEl.value = "Khác";
        if (tonGiaoKhacEl) { tonGiaoKhacEl.value = value; tonGiaoKhacEl.style.display = "inline-block"; }
    } else {
        tonGiaoEl.selectedIndex = 0;
        if (tonGiaoKhacEl) { tonGiaoKhacEl.value = ""; tonGiaoKhacEl.style.display = "none"; }
    }
}

// Tính số năm/tháng kinh nghiệm dựa trên MM/YYYY, quy đổi sang chuẩn tiếng Nhật 100%
// X年Xヶ月 / X年 / Xヶ月
function tinhKinhNghiem(tuStr, denStr) {
    if (!tuStr) return "";
    const parseMMYYYY = (str) => {
        const parts = String(str).trim().split("/");
        if (parts.length !== 2) return null;
        const month = parseInt(parts[0], 10);
        const year = parseInt(parts[1], 10);
        if (isNaN(month) || isNaN(year)) return null;
        return { month, year };
    };
    const tu = parseMMYYYY(tuStr);
    if (!tu) return "";
    let den;
    if (denStr && String(denStr).trim() !== "") {
        den = parseMMYYYY(denStr);
        if (!den) return "";
    } else {
        const now = new Date();
        den = { month: now.getMonth() + 1, year: now.getFullYear() };
    }
    let totalMonths = (den.year - tu.year) * 12 + (den.month - tu.month);
    if (totalMonths < 0) return "";
    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;
    if (years <= 0 && months <= 0) return "";
    if (years > 0 && months > 0) return `${years}年${months}ヶ月`;
    if (years > 0) return `${years}年`;
    return `${months}ヶ月`;
}

function createHocVanRow(data) {
    data = data || {};
    const tr = document.createElement("tr");
    tr.innerHTML = `
    <td><input type="text" class="hocvan-tu w-full border border-gray-300 rounded px-2 py-1.5 text-center text-sm" value="${data.tu || ""}" placeholder="MM/YYYY"></td>
    <td><input type="text" class="hocvan-den w-full border border-gray-300 rounded px-2 py-1.5 text-center text-sm" value="${data.den || ""}" placeholder="MM/YYYY"></td>
    <td><input type="text" class="hocvan-tinh w-full border border-gray-300 rounded px-2 py-1.5 text-sm" value="${data.tinhTP || ""}" placeholder="Tỉnh/TP"></td>
    <td><input type="text" class="hocvan-truong w-full border border-gray-300 rounded px-2 py-1.5 text-sm" value="${data.truong || ""}" placeholder="Tên trường"></td>
    <td><input type="text" class="hocvan-nganh w-full border border-gray-300 rounded px-2 py-1.5 text-sm" list="listNganhHoc" value="${data.nganh || ""}" placeholder="普通科 hoặc tự gõ"></td>
    <td><button type="button" class="btn-xoa-dong text-red-500 hover:text-red-700 font-bold px-2 py-1 text-sm">Xóa</button></td>
  `;
    const truongInput = tr.querySelector(".hocvan-truong");
    const nganhInput = tr.querySelector(".hocvan-nganh");
    const capNhatNganhTheoTruong = () => {
        if (String(truongInput.value || "").includes("高校") && !nganhInput.value) {
            nganhInput.value = "普通科";
        }
    };
    truongInput.addEventListener("input", capNhatNganhTheoTruong);
    truongInput.addEventListener("change", capNhatNganhTheoTruong);
    tr.querySelector(".btn-xoa-dong").addEventListener("click", () => tr.remove());
    return tr;
}

function createCongViecRow(data) {
    data = data || {};
    const tr = document.createElement("tr");
    tr.innerHTML = `
    <td><input type="text" class="congviec-tu w-full border border-gray-300 rounded px-2 py-1.5 text-center text-sm" value="${data.tu || ""}" placeholder="MM/YYYY"></td>
    <td><input type="text" class="congviec-den w-full border border-gray-300 rounded px-2 py-1.5 text-center text-sm" value="${data.den || ""}" placeholder="MM/YYYY"></td>
    <td><input type="text" class="congviec-tinh w-full border border-gray-300 rounded px-2 py-1.5 text-sm" value="${data.tinhTP || ""}" placeholder="Tỉnh làm việc"></td>
    <td><input type="text" class="congviec-cty w-full border border-gray-300 rounded px-2 py-1.5 text-sm" value="${data.congTy || ""}" placeholder="Tên công ty"></td>
    <td><input type="text" class="congviec-congviec w-full border border-gray-300 rounded px-2 py-1.5 text-sm" value="${data.congViec || ""}" placeholder="Công việc"></td>
    <td><input type="text" class="congviec-luong w-full border border-gray-300 rounded px-2 py-1.5 text-center text-sm" value="${data.luong || ""}" placeholder="3万"></td>
    <td><input type="text" class="congviec-kinhnghiem w-full border border-gray-300 rounded px-2 py-1.5 text-center text-sm bg-gray-50 font-bold text-blue-700" value="${data.kinhNghiem || ""}" placeholder="1年1ヶ月" readonly></td>
    <td><button type="button" class="btn-xoa-dong text-red-500 hover:text-red-700 font-bold px-2 py-1 text-sm">Xóa</button></td>
  `;
    const tuInput = tr.querySelector(".congviec-tu");
    const denInput = tr.querySelector(".congviec-den");
    const kinhNghiemInput = tr.querySelector(".congviec-kinhnghiem");
    const capNhatKinhNghiem = () => {
        kinhNghiemInput.value = tinhKinhNghiem(tuInput.value, denInput.value);
    };
    tuInput.addEventListener("input", capNhatKinhNghiem);
    tuInput.addEventListener("change", capNhatKinhNghiem);
    denInput.addEventListener("input", capNhatKinhNghiem);
    denInput.addEventListener("change", capNhatKinhNghiem);
    if (!data.kinhNghiem) capNhatKinhNghiem();
    tr.querySelector(".btn-xoa-dong").addEventListener("click", () => tr.remove());
    return tr;
}

function createBangCapRow(data) {
    data = data || {};
    const tr = document.createElement("tr");
    tr.innerHTML = `
    <td><input type="text" class="bc-thoigian w-full border border-gray-300 rounded px-2 py-1.5 text-center text-sm" value="${data.thoiGian || ""}" placeholder="MM/YYYY"></td>
    <td><input type="text" class="bc-ten w-full border border-gray-300 rounded px-2 py-1.5 text-sm" value="${data.ten || ""}" placeholder="Tên bằng cấp"></td>
    <td><button type="button" class="btn-xoa-dong text-red-500 hover:text-red-700 font-bold px-2 py-1 text-sm">Xóa</button></td>
  `;
    tr.querySelector(".btn-xoa-dong").addEventListener("click", () => tr.remove());
    return tr;
}

function createGiaDinhRow(data) {
    data = data || {};
    const songChungChecked = data.songChung === "Có" || data.songChung === true;
    const daMatChecked = data.daMat === true || data.daMat === "true";
    const tr = document.createElement("tr");
    tr.innerHTML = `
    <td>
      <select class="giadinh-quanhe gd-quanhe w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
        <option value="父" ${data.quanHe === "父" ? "selected" : ""}>父</option>
        <option value="母" ${data.quanHe === "母" ? "selected" : ""}>母</option>
        <option value="兄" ${data.quanHe === "兄" ? "selected" : ""}>兄</option>
        <option value="姉" ${data.quanHe === "姉" ? "selected" : ""}>姉</option>
        <option value="弟" ${data.quanHe === "弟" ? "selected" : ""}>弟</option>
        <option value="妹" ${data.quanHe === "妹" ? "selected" : ""}>妹</option>
        <option value="妻" ${data.quanHe === "妻" ? "selected" : ""}>妻</option>
        <option value="夫" ${data.quanHe === "夫" ? "selected" : ""}>夫</option>
        <option value="子" ${data.quanHe === "子" ? "selected" : ""}>子</option>
      </select>
    </td>
    <td><input type="number" class="gd-tuoi w-full border border-gray-300 rounded px-2 py-1.5 text-center text-sm" value="${data.tuoi || ""}" placeholder="Tuổi"></td>
    <td>
      <select class="gd-songchung w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
        <option value="Có" ${songChungChecked ? "selected" : ""}>Có</option>
        <option value="Không" ${!songChungChecked ? "selected" : ""}>Không</option>
      </select>
    </td>
    <td><input type="text" class="gd-nghe w-full border border-gray-300 rounded px-2 py-1.5 text-sm" value="${data.ngheNghiep || ""}" placeholder="Nghề nghiệp"></td>
    <td><input type="text" class="gd-thunhap w-full border border-gray-300 rounded px-2 py-1.5 text-center text-sm" value="${data.thuNhap || ""}" placeholder="Thu nhập"></td>
    <td class="text-center">
      <label class="inline-flex items-center gap-1 cursor-pointer">
        <input type="checkbox" class="gd-damat" ${daMatChecked ? "checked" : ""}>
        <span>Đã mất (死去)</span>
      </label>
    </td>
    <td><button type="button" class="btn-xoa-dong text-red-500 hover:text-red-700 font-bold px-2 py-1 text-sm">Xóa</button></td>
  `;

    const tuoiInput = tr.querySelector(".gd-tuoi");
    const songChungSelect = tr.querySelector(".gd-songchung");
    const ngheInput = tr.querySelector(".gd-nghe");
    const thuNhapInput = tr.querySelector(".gd-thunhap");
    const daMatCheckbox = tr.querySelector(".gd-damat");

    const capNhatLockTrangThai = () => {
        const isDead = daMatCheckbox.checked;
        [tuoiInput, songChungSelect, ngheInput, thuNhapInput].forEach((el) => {
            el.disabled = isDead;
            el.classList.toggle("opacity-50", isDead);
            el.classList.toggle("bg-gray-100", isDead);
        });
    };
    daMatCheckbox.addEventListener("change", capNhatLockTrangThai);
    capNhatLockTrangThai();

    tr.querySelector(".btn-xoa-dong").addEventListener("click", () => tr.remove());
    return tr;
}

function themDongHocVanMacDinh() {
    const tbody = document.getElementById("hocVanBody");
    if (!tbody) return;
    tbody.innerHTML = "";
    tbody.appendChild(createHocVanRow({}));
}

function themDongCongViecMacDinh() {
    const tbody = document.getElementById("quaTrinhLamViecBody");
    if (!tbody) return;
    tbody.innerHTML = "";
}

function themDongBangCapMacDinh() {
    const tbody = document.getElementById("bangCapBody");
    if (!tbody) return;
    tbody.innerHTML = "";
    tbody.appendChild(createBangCapRow({ thoiGian: "", ten: "高校卒業証書" }));
}

function themDongGiaDinhMacDinh() {
    const tbody = document.getElementById("giaDinhBody");
    if (!tbody) return;
    tbody.innerHTML = "";
    tbody.appendChild(createGiaDinhRow({ quanHe: "父", tuoi: "", songChung: "Có", ngheNghiep: "", thuNhap: "" }));
    tbody.appendChild(createGiaDinhRow({ quanHe: "母", tuoi: "", songChung: "Có", ngheNghiep: "", thuNhap: "" }));
}

function collectFormData() {
    const data = {};
    data.hoTen = getVal("hoTen");
    data.tenKatakana = getVal("tenKatakana");
    data.ngaySinh = getVal("ngaySinh");
    data.tuoi = getVal("tuoi");
    data.gioiTinh = getVal("gioiTinh");
    data.honNhan = getVal("honNhan");
    data.diaChiTinh = getVal("diaChiTinh");
    data.diaChiHuyen = getVal("diaChiHuyen");
    data.diaChiXa = getVal("diaChiXa");
    data.tonGiao = getTonGiao();
    data.chieuCao = getVal("chieuCao");
    data.canNang = getVal("canNang");
    data.nhomMau = getVal("nhomMau");
    data.tayThuan = getVal("tayThuan");
    data.thiLucPhai = getVal("thiLucPhai");
    data.thiLucTrai = getVal("thiLucTrai");
    data.muMau = getVal("muMau");
    data.hutThuoc = getVal("hutThuoc");
    data.xamMinh = getVal("xamMinh");
    data.ngayChupAnh = getVal("ngayChupAnh");
    data.iq1 = getVal("iq1");
    data.iq2 = getVal("iq2");
    data.iq3 = getVal("iq3");
    data.iq4 = getVal("iq4");

    data.bacHocCaoNhat = getVal("bacHocCaoNhat");
    data.tiengNhatTu = getVal("tiengNhatTu");
    data.tiengNhatDen = getVal("tiengNhatDen");
    data.tiengNhatDiaDiem = getVal("tiengNhatDiaDiem");
    data.tiengNhatTruong = getVal("tiengNhatTruong");
    data.tiengNhatMon = getVal("tiengNhatMon");

    data.hocVan = [];
    document.querySelectorAll("#hocVanBody tr").forEach((tr) => {
        data.hocVan.push({
            tu: tr.querySelector(".hocvan-tu") ? tr.querySelector(".hocvan-tu").value : "",
            den: tr.querySelector(".hocvan-den") ? tr.querySelector(".hocvan-den").value : "",
            tinhTP: tr.querySelector(".hocvan-tinh") ? tr.querySelector(".hocvan-tinh").value : "",
            truong: tr.querySelector(".hocvan-truong") ? tr.querySelector(".hocvan-truong").value : "",
            nganh: tr.querySelector(".hocvan-nganh") ? tr.querySelector(".hocvan-nganh").value : "",
        });
    });

    data.quaTrinhLamViec = [];
    document.querySelectorAll("#quaTrinhLamViecBody tr").forEach((tr) => {
        data.quaTrinhLamViec.push({
            tu: tr.querySelector(".congviec-tu") ? tr.querySelector(".congviec-tu").value : "",
            den: tr.querySelector(".congviec-den") ? tr.querySelector(".congviec-den").value : "",
            tinhTP: tr.querySelector(".congviec-tinh") ? tr.querySelector(".congviec-tinh").value : "",
            congTy: tr.querySelector(".congviec-cty") ? tr.querySelector(".congviec-cty").value : "",
            congViec: tr.querySelector(".congviec-congviec") ? tr.querySelector(".congviec-congviec").value : "",
            luong: tr.querySelector(".congviec-luong") ? tr.querySelector(".congviec-luong").value : "",
            kinhNghiem: tr.querySelector(".congviec-kinhnghiem") ? tr.querySelector(".congviec-kinhnghiem").value : "",
        });
    });

    data.bangCap = [];
    document.querySelectorAll("#bangCapBody tr").forEach((tr) => {
        data.bangCap.push({
            thoiGian: tr.querySelector(".bc-thoigian") ? tr.querySelector(".bc-thoigian").value : "",
            ten: tr.querySelector(".bc-ten") ? tr.querySelector(".bc-ten").value : "",
        });
    });

    data.giaDinh = [];
    document.querySelectorAll("#giaDinhBody tr").forEach((tr) => {
        const songChungEl = tr.querySelector(".gd-songchung");
        const daMatEl = tr.querySelector(".gd-damat");
        data.giaDinh.push({
            quanHe: tr.querySelector(".gd-quanhe") ? tr.querySelector(".gd-quanhe").value : "",
            tuoi: tr.querySelector(".gd-tuoi") ? tr.querySelector(".gd-tuoi").value : "",
            songChung: songChungEl ? songChungEl.value : "",
            ngheNghiep: tr.querySelector(".gd-nghe") ? tr.querySelector(".gd-nghe").value : "",
            thuNhap: tr.querySelector(".gd-thunhap") ? tr.querySelector(".gd-thunhap").value : "",
            daMat: daMatEl ? daMatEl.checked : false,
        });
    });

    data.xuatNgoai = getVal("xuatNgoai");
    data.xuatNgoaiNuoc = getVal("xuatNgoaiNuoc");
    data.xuatNgoaiNoiDung = getVal("xuatNgoaiNoiDung");
    data.theThaoTen = getVal("tenTheThao");
    data.theThaoNam = getVal("soNamTheThao");
    data.nguoiQuenNhat = getVal("coNguoiQuenNhat");
    data.quanHeNguoiQuenNhat = getVal("nguoiQuenQuanHe");
    data.nguoiQuenTuCach = getVal("nguoiQuenTuCach");
    data.nguoiQuenNoiO = getVal("nguoiQuenNoiO");

    data.thoiGianHocTiengNhat = getVal("thoiGianHocTiengNhat");
    data.baiMinna = getVal("baiMinna");
    data.songTapTheNam = getVal("songTapTheNam");
    data.songTapTheLoai = getVal("songTapTheLoai");
    data.songTapTheSoNguoi = getVal("songTapTheSoNguoi");
    data.songTapTheChiTiet =
        (data.songTapTheLoai || "会社の寮") + "で" + (data.songTapTheSoNguoi || 6) + "人部屋で共同生活しました";
    data.soThich = getVal("soThich");
    data.tinhCach = getVal("tinhCach");
    data.quanTamNhat = getVal("quanTamNhat");

    return data;
}

function doDuLieuLenForm(hs) {
    if (!hs) return;
    setVal("hoTen", hs.hoTen);
    setVal("tenKatakana", hs.tenKatakana);
    setVal("ngaySinh", hs.ngaySinh);
    setVal("tuoi", hs.tuoi);
    setVal("gioiTinh", hs.gioiTinh);
    setVal("honNhan", hs.honNhan);
    setVal("diaChiTinh", hs.diaChiTinh);
    setVal("diaChiHuyen", hs.diaChiHuyen);
    setVal("diaChiXa", hs.diaChiXa);
    setTonGiao(hs.tonGiao);
    setVal("chieuCao", hs.chieuCao);
    setVal("canNang", hs.canNang);
    setVal("nhomMau", hs.nhomMau);
    setVal("tayThuan", hs.tayThuan);
    setVal("thiLucPhai", hs.thiLucPhai);
    setVal("thiLucTrai", hs.thiLucTrai);
    setVal("muMau", hs.muMau);
    setVal("hutThuoc", hs.hutThuoc);
    setVal("xamMinh", hs.xamMinh);
    setVal("ngayChupAnh", hs.ngayChupAnh);
    setVal("iq1", hs.iq1);
    setVal("iq2", hs.iq2);
    setVal("iq3", hs.iq3);
    setVal("iq4", hs.iq4);

    setVal("bacHocCaoNhat", hs.bacHocCaoNhat);
    setVal("tiengNhatTu", hs.tiengNhatTu);
    setVal("tiengNhatDen", hs.tiengNhatDen);
    setVal("tiengNhatDiaDiem", hs.tiengNhatDiaDiem);
    setVal("tiengNhatTruong", hs.tiengNhatTruong);
    setVal("tiengNhatMon", hs.tiengNhatMon);

    const hocVanBody = document.getElementById("hocVanBody");
    if (hocVanBody) {
        hocVanBody.innerHTML = "";
        const list = Array.isArray(hs.hocVan) && hs.hocVan.length > 0 ? hs.hocVan : [{}];
        list.forEach((item) => hocVanBody.appendChild(createHocVanRow(item)));
    }

    const congViecBody = document.getElementById("quaTrinhLamViecBody");
    if (congViecBody) {
        congViecBody.innerHTML = "";
        const list = Array.isArray(hs.quaTrinhLamViec) ? hs.quaTrinhLamViec : [];
        list.forEach((item) => congViecBody.appendChild(createCongViecRow(item)));
    }

    const bangCapBody = document.getElementById("bangCapBody");
    if (bangCapBody) {
        bangCapBody.innerHTML = "";
        const list = Array.isArray(hs.bangCap) && hs.bangCap.length > 0 ? hs.bangCap : [{ ten: "高校卒業証書" }];
        list.forEach((item) => bangCapBody.appendChild(createBangCapRow(item)));
    }

    const giaDinhBody = document.getElementById("giaDinhBody");
    if (giaDinhBody) {
        giaDinhBody.innerHTML = "";
        const list = Array.isArray(hs.giaDinh) && hs.giaDinh.length > 0 ? hs.giaDinh : [{ quanHe: "父" }, { quanHe: "母" }];
        list.forEach((item) => giaDinhBody.appendChild(createGiaDinhRow(item)));
    }

    setVal("xuatNgoai", hs.xuatNgoai);
    setVal("xuatNgoaiNuoc", hs.xuatNgoaiNuoc);
    setVal("xuatNgoaiNoiDung", hs.xuatNgoaiNoiDung);
    if (typeof capNhatKhoaXuatNgoai === "function") capNhatKhoaXuatNgoai();

    setVal("tenTheThao", hs.theThaoTen);
    setVal("soNamTheThao", hs.theThaoNam);
    setVal("coNguoiQuenNhat", hs.nguoiQuenNhat);
    setVal("nguoiQuenQuanHe", hs.quanHeNguoiQuenNhat);
    setVal("nguoiQuenTuCach", hs.nguoiQuenTuCach);
    setVal("nguoiQuenNoiO", hs.nguoiQuenNoiO);

    setVal("thoiGianHocTiengNhat", hs.thoiGianHocTiengNhat);
    setVal("baiMinna", hs.baiMinna);
    setVal("songTapTheNam", hs.songTapTheNam);
    setVal("songTapTheLoai", hs.songTapTheLoai);
    setVal("songTapTheSoNguoi", hs.songTapTheSoNguoi);

    const selectSoThichEl = document.getElementById("selectSoThich");
    if (selectSoThichEl) {
        const options = Array.from(selectSoThichEl.options).map((opt) => opt.value);
        if (hs.soThich && options.includes(hs.soThich)) {
            selectSoThichEl.value = hs.soThich;
        } else if (hs.soThich) {
            selectSoThichEl.value = "khac";
        }
    }
    setVal("soThich", hs.soThich);
    if (hs.soThich) {
        const soThichEl = document.getElementById("soThich");
        if (soThichEl) {
            const isKhac = !selectSoThichEl || selectSoThichEl.value === "khac";
            soThichEl.readOnly = !isKhac;
            soThichEl.className = isKhac
                ? "border rounded px-2 py-1.5 bg-white text-gray-800 ml-2"
                : "border rounded px-2 py-1.5 bg-gray-100 text-gray-600 ml-2";
        }
    }
    setVal("tinhCach", hs.tinhCach);
    setVal("quanTamNhat", hs.quanTamNhat);

    const katakanaEl = document.getElementById("tenKatakana");
    if (katakanaEl) katakanaEl.dataset.userEdited = "true";
}

function xoaTrangForm() {
    const ids = [
        "hoTen", "tenKatakana", "ngaySinh", "tuoi", "gioiTinh", "honNhan",
        "diaChiTinh", "diaChiHuyen", "diaChiXa",
        "chieuCao", "canNang", "nhomMau", "tayThuan", "thiLucPhai", "thiLucTrai",
        "muMau", "hutThuoc", "xamMinh",
        "ngayChupAnh", "iq1", "iq2", "iq3", "iq4",
        "xuatNgoai", "xuatNgoaiNuoc", "xuatNgoaiNoiDung",
        "tenTheThao", "soNamTheThao",
        "coNguoiQuenNhat", "nguoiQuenQuanHe", "nguoiQuenTuCach", "nguoiQuenNoiO",
        "thoiGianHocTiengNhat", "baiMinna", "songTapTheNam",
        "songTapTheLoai", "songTapTheSoNguoi",
        "soThich", "tinhCach", "quanTamNhat",
    ];
    ids.forEach((id) => setVal(id, ""));

    // Tôn giáo: trả về lựa chọn đầu tiên và ẩn ô "Khác"
    const tonGiaoEl = document.getElementById("tonGiao");
    if (tonGiaoEl) tonGiaoEl.selectedIndex = 0;
    const tonGiaoKhacEl = document.getElementById("tonGiaoKhac");
    if (tonGiaoKhacEl) { tonGiaoKhacEl.value = ""; tonGiaoKhacEl.style.display = "none"; }

    if (typeof capNhatKhoaXuatNgoai === "function") capNhatKhoaXuatNgoai();
    const katakanaEl = document.getElementById("tenKatakana");
    if (katakanaEl) delete katakanaEl.dataset.userEdited;

    // Bậc học cao nhất: trả về lựa chọn đầu tiên (mặc định), không xóa trắng
    const bacHocEl = document.getElementById("bacHocCaoNhat");
    if (bacHocEl) bacHocEl.selectedIndex = 0;

    // Dòng tiếng Nhật cố định: giữ nguyên giá trị mặc định có sẵn trong HTML, không xóa trắng
    setVal("tiengNhatTu", "10/2026");
    setVal("tiengNhatTruong", "GICC日本語センター");
    const diaDiemEl = document.getElementById("tiengNhatDiaDiem");
    if (diaDiemEl) diaDiemEl.selectedIndex = 0;

    themDongHocVanMacDinh();
    themDongCongViecMacDinh();
    themDongBangCapMacDinh();
    themDongGiaDinhMacDinh();
}

function layDanhSach() {
    try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : []; } catch (e) { return []; }
}
function luuDanhSach(list) { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); }

function luuHoSo() {
    const hoTen = getVal("hoTen").trim();
    if (!hoTen) { alert("Vui lòng nhập Họ tên trước khi lưu hồ sơ!"); return; }
    const studentData = collectFormData();
    const list = layDanhSach();
    if (dangSuaIndex >= 0 && dangSuaIndex < list.length) {
        studentData.stt = dangSuaIndex + 1;
        list[dangSuaIndex] = studentData;
        dangSuaIndex = -1;
        const btnLuu = document.getElementById("btnLuuHoSo");
        if (btnLuu) btnLuu.innerText = "💾 Lưu & Nhập tiếp";
        list.forEach((item, index) => { item.stt = index + 1; });
        luuDanhSach(list);
        alert("Cập nhật hồ sơ thành công!");
    } else {
        list.push(studentData);
        list.forEach((item, index) => { item.stt = index + 1; });
        luuDanhSach(list);
        alert("Lưu hồ sơ mới thành công!");
    }
    xoaTrangForm();
    renderDanhSachHocSinh();
}

function renderDanhSachHocSinh() {
    const tbody = document.getElementById("danhSachHocSinhBody");
    if (!tbody) return;
    const list = layDanhSach();
    tbody.innerHTML = "";
    list.forEach((hs, index) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${hs.hoTen || ""}</td>
      <td>${hs.tenKatakana || ""}</td>
      <td>${hs.ngaySinh || ""}</td>
      <td>
        <button type="button" class="btn-sua" data-index="${index}">Sửa</button>
        <button type="button" class="btn-xoa" data-index="${index}">Xóa</button>
      </td>
    `;
        tbody.appendChild(tr);
    });
    tbody.querySelectorAll(".btn-sua").forEach((btn) => btn.addEventListener("click", () => suaHoSo(parseInt(btn.dataset.index, 10))));
    tbody.querySelectorAll(".btn-xoa").forEach((btn) => btn.addEventListener("click", () => xoaHoSo(parseInt(btn.dataset.index, 10))));
}

function suaHoSo(index) {
    const list = layDanhSach();
    const hs = list[index];
    if (!hs) return;
    dangSuaIndex = index;
    const btnLuu = document.getElementById("btnLuuHoSo");
    if (btnLuu) btnLuu.innerText = "💾 Cập nhật thay đổi";
    doDuLieuLenForm(hs);
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function xoaHoSo(index) {
    if (!confirm("Bạn có chắc muốn xóa hồ sơ này?")) return;
    const list = layDanhSach();
    list.splice(index, 1);
    list.forEach((item, i) => { item.stt = i + 1; });
    luuDanhSach(list);
    if (dangSuaIndex === index || dangSuaIndex >= list.length) {
        dangSuaIndex = -1;
        const btnLuu = document.getElementById("btnLuuHoSo");
        if (btnLuu) btnLuu.innerText = "💾 Lưu & Nhập tiếp";
    }
    renderDanhSachHocSinh();
}

function initKatakanaEditableGuard() {
    const katakanaEl = document.getElementById("tenKatakana");
    if (!katakanaEl) return;
    katakanaEl.addEventListener("input", () => { katakanaEl.dataset.userEdited = "true"; });
}

function initTinhTuoi() {
    const ngaySinhEl = document.getElementById("ngaySinh");
    if (!ngaySinhEl) return;
    ngaySinhEl.addEventListener("change", () => {
        if (typeof calculateAge === "function") {
            const tuoi = calculateAge(ngaySinhEl.value);
            if (tuoi !== null && tuoi !== undefined) { setVal("tuoi", tuoi); }
        }
    });
}

// Requirement #5: khóa 2 trường Tên nước/Nội dung khi chọn "Không"
function capNhatKhoaXuatNgoai() {
    const selectEl = document.getElementById("xuatNgoai");
    const nuocEl = document.getElementById("xuatNgoaiNuoc");
    const noiDungEl = document.getElementById("xuatNgoaiNoiDung");
    if (!selectEl) return;
    const isKhong = selectEl.value === "Không" || selectEl.value === "無" || selectEl.value === "";
    [nuocEl, noiDungEl].forEach((el) => {
        if (!el) return;
        el.disabled = isKhong;
        el.classList.toggle("opacity-50", isKhong);
        el.classList.toggle("bg-gray-100", isKhong);
        if (isKhong) el.value = "";
    });
}

function initXuatNgoai() {
    const selectEl = document.getElementById("xuatNgoai");
    if (!selectEl) return;
    selectEl.addEventListener("change", capNhatKhoaXuatNgoai);
    capNhatKhoaXuatNgoai();
}

// Hiện/ẩn ô nhập tự do khi chọn Tôn giáo "Khác"
function initTonGiao() {
    const tonGiaoEl = document.getElementById("tonGiao");
    const tonGiaoKhacEl = document.getElementById("tonGiaoKhac");
    if (!tonGiaoEl || !tonGiaoKhacEl) return;
    tonGiaoKhacEl.style.display = tonGiaoEl.value === "Khác" ? "inline-block" : "none";
}

function initThemDongButtons() {
    const btnHocVan = document.getElementById("btnThemHocVan");
    if (btnHocVan) { btnHocVan.addEventListener("click", () => { const tbody = document.getElementById("hocVanBody"); if (tbody) tbody.appendChild(createHocVanRow({})); }); }
    const btnCongViec = document.getElementById("btnThemCongViec");
    if (btnCongViec) { btnCongViec.addEventListener("click", () => { const tbody = document.getElementById("quaTrinhLamViecBody"); if (tbody) tbody.appendChild(createCongViecRow({})); }); }
    const btnBangCap = document.getElementById("btnThemBangCap");
    if (btnBangCap) { btnBangCap.addEventListener("click", () => { const tbody = document.getElementById("bangCapBody"); if (tbody) tbody.appendChild(createBangCapRow({})); }); }
    const btnGiaDinh = document.getElementById("btnThemGiaDinh");
    if (btnGiaDinh) { btnGiaDinh.addEventListener("click", () => { const tbody = document.getElementById("giaDinhBody"); if (tbody) tbody.appendChild(createGiaDinhRow({})); }); }
}

function initStorage() {
    initKatakanaEditableGuard();
    initTinhTuoi();
    initThemDongButtons();
    initXuatNgoai();
    initTonGiao();
    themDongHocVanMacDinh();
    themDongCongViecMacDinh();
    themDongBangCapMacDinh();
    themDongGiaDinhMacDinh();
    const btnLuu = document.getElementById("btnLuuHoSo");
    if (btnLuu) { btnLuu.addEventListener("click", luuHoSo); }
    renderDanhSachHocSinh();
}
document.addEventListener("DOMContentLoaded", initStorage);
