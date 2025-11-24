
export const thaiToArabic = (text: string): string => {
  if (!text) return '';
  const map: Record<string, string> = {
    '๐': '0', '๑': '1', '๒': '2', '๓': '3', '๔': '4',
    '๕': '5', '๖': '6', '๗': '7', '๘': '8', '๙': '9'
  };
  return text.replace(/[๐-๙]/g, (match) => map[match]);
};

export const normalizeSearchQuery = (text: string): string => {
  if (!text) return '';
  // Convert Thai numerals to Arabic, lowercase, and remove whitespace
  return thaiToArabic(text).toLowerCase().replace(/\s+/g, '');
};

export const createHighlightRegex = (query: string): RegExp | null => {
  const trimmed = query.trim();
  if (!trimmed) return null;

  // Escape special regex characters
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // Create a mapping to match both Thai and Arabic numerals interchangeably
  const digitMap: Record<string, string> = {
    '0': '[0๐]', '1': '[1๑]', '2': '[2๒]', '3': '[3๓]', '4': '[4๔]',
    '5': '[5๕]', '6': '[6๖]', '7': '[7๗]', '8': '[8๘]', '9': '[9๙]',
    '๐': '[0๐]', '๑': '[1๑]', '๒': '[2๒]', '๓': '[3๓]', '๔': '[4๔]',
    '๕': '[5๕]', '๖': '[6๖]', '๗': '[7๗]', '๘': '[8๘]', '๙': '[9๙]'
  };

  // Replace digits in the query with the character class matching both
  const pattern = escaped.split('').map(char => digitMap[char] || char).join('');
  
  return new RegExp(`(${pattern})`, 'gi');
};

export const VALID_SUFFIXES = ['ทวิ', 'ตรี', 'จัตวา', 'เบญจ', 'ฉ', 'สัตต', 'อัฏฐ', 'นว', 'ทศ'];

// Regex to match "มาตรา 123", "มาตรา ๑๒๓", "มาตรา 123/1", "มาตรา 30 ทวิ"
// Captures the number part for linking
export const SECTION_REF_REGEX = new RegExp(`มาตรา\\s*([๐-๙\\d]+(?:\\/[๐-๙\\d]+)?(?:\\s+(?:${VALID_SUFFIXES.join('|')}))?)`, 'g');
