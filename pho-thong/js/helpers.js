function calculateAge(birthDateString) {
  if (!birthDateString) return '';
  const birthDate = new Date(birthDateString);
  if (isNaN(birthDate.getTime())) return '';
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age > 0 ? age : '';
}

function convertVndToManYen(vndAmount, exchangeRate = 168) {
  if (!vndAmount || isNaN(vndAmount)) return '';
  const yen = vndAmount / exchangeRate;
  const manYen = Math.round(yen / 10000);
  return manYen > 0 ? `${manYen} 万円` : '';
}

function setupAutoHelpers() {
  const hoTenInput = document.getElementById('hoTen');
  const katakanaInput = document.getElementById('tenKatakana');
  if (hoTenInput && katakanaInput) {
    hoTenInput.addEventListener('input', (e) => {
      // Nếu người dùng đã chủ động gõ sửa ô Katakana, không tự động ghi đè nữa
      // (giữ nguyên nội dung họ tự chỉnh, đặc biệt với tên người dân tộc).
      if (katakanaInput.dataset.userEdited === 'true') return;
      if (typeof convertToKatakana === 'function') {
        katakanaInput.value = convertToKatakana(e.target.value);
      }
    });
  }

  const ngaySinhInput = document.getElementById('ngaySinh');
  const tuoiInput = document.getElementById('tuoi');
  if (ngaySinhInput && tuoiInput) {
    const handleAge = (e) => {
      tuoiInput.value = calculateAge(e.target.value);
    };
    ngaySinhInput.addEventListener('change', handleAge);
    ngaySinhInput.addEventListener('input', handleAge);
  }

  const mucTieuVndInput = document.getElementById('mucTieuTietKiem');
  const tyGiaInput = document.getElementById('tyGiaYen');
  const vanYenInput = document.getElementById('mucTieuTietKiemVanYen');
  function updateYen() {
    if (!mucTieuVndInput || !vanYenInput) return;
    const rate = tyGiaInput && tyGiaInput.value ? parseFloat(tyGiaInput.value) : 168;
    const vnd = parseFloat(mucTieuVndInput.value);
    vanYenInput.value = !isNaN(vnd) && vnd > 0 ? convertVndToManYen(vnd, rate) : '';
  }
  if (mucTieuVndInput) mucTieuVndInput.addEventListener('input', updateYen);
  if (tyGiaInput) tyGiaInput.addEventListener('input', updateYen);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupAutoHelpers);
} else {
  setupAutoHelpers();
}
