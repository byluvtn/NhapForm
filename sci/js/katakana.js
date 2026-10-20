const KATAKANA_MAP = {
  NGUYEN: 'グエン', TRAN: 'チャン', LE: 'レ', PHAM: 'ファム',
  HOANG: 'ホアン', HUYNH: 'フィン', PHAN: 'ファン', VU: 'ヴー',
  VO: 'ヴォー', DANG: 'ダン', BUI: 'ブイ', DO: 'ドー',
  HO: 'ホー', NGO: 'ゴー', DUONG: 'ズオン', LY: 'リー',
  TRUONG: 'チュオン', DINH: 'ディン', DAO: 'ダオ', DOAN: 'ドアン',
  VAN: 'ヴァン', THI: 'ティ', DUC: 'ドゥック', MINH: 'ミン',
  HUNG: 'フン', DUNG: 'ズン', PHUONG: 'フォン', ANH: 'アイン',
  TUAN: 'トゥアン', HAI: 'ハイ', THANG: 'タン', HUY: 'フイ',
  LINH: 'リン', TRI: 'チー', VUONG: 'ヴォン', NAM: 'ナム',
  TRUNG: 'チュン', TIEN: 'ティエン', HIEU: 'ヒエウ', LONG: 'ロン',
  QUAN: 'クアン', HOA: 'ホア', MAI: 'マイ', NGOC: 'ゴック',
  QUYNH: 'クイン', TRANG: 'チャン', THAO: 'タオ', HUONG: 'フオン'
};

function removeVietnameseTones(str) {
  if (!str) return '';
  str = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  str = str.replace(/[đĐ]/g, 'D');
  return str.toUpperCase().trim();
}

function convertToKatakana(fullName) {
  if (!fullName) return '';
  const cleanName = removeVietnameseTones(fullName);
  const words = cleanName.split(/\s+/);
  const kataWords = words.map(w => KATAKANA_MAP[w] || w);
  return kataWords.join('・');
}
