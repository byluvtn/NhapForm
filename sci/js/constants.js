// constants.js - Các giá trị mặc định dùng chung cho form

const GENDER_OPTIONS = [
  { value: "", label: "-- Chọn --" },
  { value: "nam", label: "Nam" },
  { value: "nu", label: "Nữ" },
];

const MARITAL_STATUS_OPTIONS = [
  { value: "", label: "-- Chọn --" },
  { value: "chua_ket_hon", label: "Chưa kết hôn" },
  { value: "da_ket_hon", label: "Đã kết hôn" },
  { value: "da_ly_hon", label: "Đã ly hôn" },
];

const BLOOD_TYPE_OPTIONS = [
  { value: "", label: "-- Chọn --" },
  { value: "A", label: "A" },
  { value: "B", label: "B" },
  { value: "AB", label: "AB" },
  { value: "O", label: "O" },
];

const HANDEDNESS_OPTIONS = [
  { value: "", label: "-- Chọn --" },
  { value: "phai", label: "Tay phải" },
  { value: "trai", label: "Tay trái" },
  { value: "ca_hai", label: "Cả hai" },
];

const YES_NO_OPTIONS = [
  { value: "co", label: "Có" },
  { value: "khong", label: "Không" },
];

// Options dạng Không/Có, mặc định "Không" được chọn trước (dùng cho thói quen, bệnh lý...)
const KHONG_CO_OPTIONS = [
  { value: "khong", label: "Không" },
  { value: "co", label: "Có" },
];

// Mù màu: Bình thường / Có
const MU_MAU_OPTIONS = [
  { value: "binh_thuong", label: "Bình thường" },
  { value: "co", label: "Có" },
];

// Đã có người yêu chưa: Chưa / Có
const NGUOI_YEU_OPTIONS = [
  { value: "chua", label: "Chưa" },
  { value: "co", label: "Có" },
];

// Đơn vị thời gian sống tập thể: Năm / Tháng
const THOI_GIAN_UNIT_OPTIONS = [
  { value: "nam", label: "Năm" },
  { value: "thang", label: "Tháng" },
];

// Gia đình đã đồng ý đi Nhật chưa, mặc định "Đã đồng ý"
const DONG_Y_GIA_DINH_OPTIONS = [
  { value: "da_dong_y", label: "Đã đồng ý (承諾済)" },
  { value: "chua_dong_y", label: "Chưa đồng ý" },
];

// Lý do nghỉ việc - các lựa chọn nhanh thường gặp
const LY_DO_NGHI_VIEC_OPTIONS = [
  { value: "", label: "-- Chọn nhanh --" },
  { value: "契約満了", label: "契約満了 - Hết hợp đồng" },
  { value: "日本語学校入学", label: "日本語学校入学 - Học tiếng Nhật" },
  { value: "会社都合", label: "会社都合 - Cty giảm biên chế" },
  { value: "給料が安い", label: "給料が安い - Lương thấp" },
];

// Gợi ý nhanh cho khối Phân tích bản thân đã chuyển sang js/templates.js (SELF_ANALYSIS_TEMPLATES)

// Gợi ý mặc định cho chi tiết kinh nghiệm sống tập thể
const SONG_TAP_THE_SUGGESTION = "アパートで5人部屋で共同生活しました";

// Các cấp học cố định hiển thị trong bảng Học vấn (Nhóm 3)
const EDUCATION_LEVELS = [
  { key: "cap1", label: "Cấp 1" },
  { key: "cap2", label: "Cấp 2" },
  { key: "cap3", label: "Cấp 3" },
  { key: "cap4", label: "Cấp 4/ĐH/CĐ" },
];

// Số lượng tối đa công ty / thành viên gia đình có thể thêm
const MAX_COMPANIES = 4;
const MAX_FAMILY_MEMBERS = 8;

// 7 câu hỏi khảo sát SCI, mặc định đã chọn sẵn theo yêu cầu
const SCI_QUESTIONS = [
  {
    key: "n4TruocXuatCanh",
    label: "1. Đạt N4 trước xuất cảnh?",
    defaultValue: "co",
  },
  {
    key: "khongBaoDamTangCa",
    label: "2. Không bảo đảm tăng ca vẫn đồng ý?",
    defaultValue: "co",
  },
  {
    key: "camKet3Nam",
    label: "3. Cam kết 3 năm không về nước?",
    defaultValue: "co",
  },
  {
    key: "khongDauLung",
    label: "4. Không đau lưng?",
    defaultValue: "co",
  },
  {
    key: "coPhauThuatBenhNang",
    label: "5. Có phẫu thuật/bệnh nặng không?",
    defaultValue: "khong",
  },
  {
    key: "giaDinhMacBenhNang",
    label: "6. Gia đình có ai mắc bệnh nặng không?",
    defaultValue: "khong",
  },
  {
    key: "tuanThuLuatPhap",
    label: "7. Tuân thủ luật pháp/nội quy Nhật Bản?",
    defaultValue: "co",
  },
];
