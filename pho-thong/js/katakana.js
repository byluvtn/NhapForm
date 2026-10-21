const KATAKANA_MAP = {
  // Họ phổ biến
  'NGUYEN': 'グエン', 'TRAN': 'チャン', 'LE': 'レ', 'PHAM': 'ファム',
  'HOANG': 'ホアン', 'HUYNH': 'フィン', 'PHAN': 'ファン', 'VU': 'ヴー',
  'VO': 'ヴォー', 'DANG': 'ダン', 'BUI': 'ブイ', 'DO': 'ドー',
  'HO': 'ホー', 'NGO': 'ゴー', 'DUONG': 'ズオン', 'LY': 'リー',
  'TRUONG': 'チュオン', 'DINH': 'ディン', 'DAO': 'ダオ', 'DOAN': 'ドアン',
  'TRINH': 'チン', 'MAI': 'マイ', 'CAO': 'カオ', 'LUONG': 'ルオン', 'QUACH': 'クアッ',

  // Tên đệm & Tên chính đầy đủ
  'THI': 'ティ', 'THAO': 'タオ', 'THANH': 'タイン', 'HIEN': 'ヒエン', 'VAN': 'ヴァン',
  'BAN': 'バン', 'SON': 'ソン', 'ANH': 'アイン', 'BAO': 'バオ', 'MANH': 'マン',
  'BINH': 'ビン', 'MINH': 'ミン', 'MAN': 'ミン', 'BAC': 'バック',
  'BACH': 'バック', 'MIEN': 'ミエン', 'BANG': 'バン', 'NAM': 'ナム',
  'CHAU': 'チャウ', 'NGHI': 'ギー', 'CHI': 'チー', 'NGOC': 'ゴック',
  'CUC': 'クック', 'CUONG': 'クン', 'NHAT': 'ニャット', 'DUY': 'ズイ',
  'NHI': 'ニー', 'DIEP': 'ディエップ', 'NHU': 'ニュ', 'DUNG': 'ズン',
  'NINH': 'ニン', 'DANH': 'ズアイン', 'DOANH': 'ズアイン', 'NHUNG': 'ニュン',
  'OANH': 'オアン', 'PHONG': 'フォン', 'DAT': 'ダット', 'PHU': 'フー',
  'PHUNG': 'フン', 'PHUONG': 'フォン', 'HUONG': 'フオン', 'GIAO': 'ザオ',
  'PHUC': 'フック', 'PHUOC': 'フック', 'GIANG': 'ザン', 'QUANG': 'クアン',
  'QUAN': 'クアン', 'HA': 'ハー', 'QUYEN': 'クエン', 'HAI': 'ハイ',
  'QUYNH': 'クイン', 'HAO': 'ハオ', 'SANG': 'サン', 'HANG': 'ハン',
  'HAN': 'ハン', 'HANH': 'ハイン', 'SUONG': 'スオン', 'HAU': 'ハウ',
  'TAM': 'タム', 'TAN': 'タン', 'HIEU': 'ヒエウ', 'HOA': 'ホア',
  'THAM': 'タム', 'HOAI': 'ホアイ', 'THU': 'トゥ', 'TRANG': 'チャン',
  'HUAN': 'フアン', 'TRAM': 'チャム', 'HUE': 'フェ', 'THUY': 'トゥイ',
  'HUNG': 'フン', 'TRUNG': 'チュン', 'HUY': 'フイ', 'TUYEN': 'トゥエン',
  'HUYEN': 'フエン', 'KHOA': 'コア', 'TRUONG': 'トゥルオン', 'KHANH': 'カイン',
  'TU': 'トゥー', 'KHANG': 'カン', 'TUAN': 'トゥアン', 'KIEN': 'キエン',
  'TUYET': 'トウエット', 'KIEU': 'キエウ', 'TUNG': 'トゥン', 'LAN': 'ラン',
  'UYEN': 'ウエン', 'LAM': 'ラム', 'LUAN': 'ルアン', 'LOAN': 'ルアン',
  'LIEN': 'レイン', 'VIET': 'ベト', 'LOC': 'ロック', 'LOI': 'ロイ',
  'VY': 'ビー', 'LONG': 'ロン', 'XUAN': 'スアン', 'YEN': 'イエン',
  'THO': 'ト', 'MY': 'ミ'
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

window.convertToKatakana = convertToKatakana;
