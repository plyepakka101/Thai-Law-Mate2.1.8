/**
 * Common legal keywords for Thai law examination and Active Recall / Cloze Deletion
 */
export const THAI_LEGAL_KEYWORDS = [
  'ผู้ใด',
  'ฆ่าผู้อื่น',
  'เอาไป',
  'โดยเจตนา',
  'โดยประมาท',
  'โดยทุจริต',
  'โดยมิชอบ',
  'โดยชอบด้วยกฎหมาย',
  'เพื่อประโยชน์',
  'เพื่อให้เกิดความเสียหาย',
  'ทำให้เสียหาย',
  'ทำลาย',
  'ทำให้เสื่อมค่า',
  'ทำให้ไร้ประโยชน์',
  'หลอกลวง',
  'ด้วยประการใดๆ',
  'ข่มขืนใจ',
  'ใช้กำลังประทุษร้าย',
  'ขู่เข็ญ',
  'ว่าจะใช้กำลังประทุษร้าย',
  'มีอาวุธ',
  'ร่วมกระทำความผิด',
  'ตัวการ',
  'ผู้สนับสนุน',
  'ผู้ใช้',
  'โฆษณา',
  'พยายามกระทำความผิด',
  'ป้องกัน',
  'จำเป็น',
  'บันดาลโทสะ',
  'สำคัญผิด',
  'ระวางโทษ',
  'ประหารชีวิต',
  'จำคุกตลอดชีวิต',
  'จำคุก',
  'ปรับ',
  'ริบทรัพย์สิน',
  'กักขัง',
  'นิติกรรม',
  'โมฆะ',
  'โมฆียะ',
  'ละเมิด',
  'จงใจ',
  'ชำระหนี้',
  'บอกเลิกสัญญา',
  'อายุความ',
  'ผู้เสียหาย',
  'ผู้ต้องหา',
  'จำเลย',
  'พนักงานสอบสวน',
  'พนักงานอัยการ',
  'ศาล'
];

export interface ClozeBlank {
  id: number;
  word: string;
  options: string[]; // 3-4 options including the correct word
}

export interface MaskedContent {
  original: string;
  maskedText: string;
  blanks: ClozeBlank[];
}

/**
 * Generate Cloze Deletion blanks from Thai law text.
 */
export function generateClozeBlanks(text: string, maxBlanks = 4): MaskedContent {
  if (!text || !text.trim()) {
    return { original: '', maskedText: '', blanks: [] };
  }

  // Find all matches of keywords in the text
  const matchedKeywords: { word: string; index: number }[] = [];
  for (const kw of THAI_LEGAL_KEYWORDS) {
    let pos = text.indexOf(kw);
    while (pos !== -1) {
      matchedKeywords.push({ word: kw, index: pos });
      pos = text.indexOf(kw, pos + kw.length);
    }
  }

  // Sort by position and avoid overlapping
  matchedKeywords.sort((a, b) => a.index - b.index);

  const selected: { word: string; index: number }[] = [];
  let lastEnd = -1;
  for (const match of matchedKeywords) {
    if (match.index >= lastEnd) {
      selected.push(match);
      lastEnd = match.index + match.word.length;
    }
  }

  // Pick up to maxBlanks keywords
  const chosen = selected.slice(0, maxBlanks);

  if (chosen.length === 0) {
    // If no predefined keywords match, pick phrases separated by spaces or punctuation
    return { original: text, maskedText: text, blanks: [] };
  }

  // Build blanks and masked text
  const blanks: ClozeBlank[] = [];
  let masked = text;

  // Replace from end to start so indices stay valid
  for (let i = chosen.length - 1; i >= 0; i--) {
    const item = chosen[i];
    const blankId = i + 1;

    // Pick 3 random distractor options from keywords
    const distractors = THAI_LEGAL_KEYWORDS
      .filter(k => k !== item.word)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);

    const options = [item.word, ...distractors].sort(() => 0.5 - Math.random());

    blanks.unshift({
      id: blankId,
      word: item.word,
      options
    });

    masked =
      masked.substring(0, item.index) +
      `[ช่องที่ ${blankId}]` +
      masked.substring(item.index + item.word.length);
  }

  return {
    original: text,
    maskedText: masked,
    blanks
  };
}
