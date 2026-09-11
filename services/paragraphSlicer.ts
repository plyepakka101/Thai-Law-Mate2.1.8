import { ParagraphSlice } from '../types';

const THAI_NUMERAL_WORDS = [
  'วรรคหนึ่ง',
  'วรรคสอง',
  'วรรคสาม',
  'วรรคสี่',
  'วรรคห้า',
  'วรรคหก',
  'วรรคเจ็ด',
  'วรรคแปด',
  'วรรคเก้า',
  'วรรคสิบ',
  'วรรคสิบเอ็ด',
  'วรรคสิบสอง',
  'วรรคสิบสาม',
  'วรรคสิบสี่',
  'วรรคสิบห้า',
  'วรรคสิบหก',
  'วรรคสิบเจ็ด',
  'วรรคสิบแปด',
  'วรรคสิบเก้า',
  'วรรคยี่สิบ'
];

/**
 * Split Thai law section text into distinct legal paragraphs (วรรค).
 * In Thai law drafting (กฤษฎีกา / กฎหมายไทย):
 * - A section consists of one or more paragraphs (วรรค).
 * - A paragraph can contain sub-clauses (อนุมาตรา เช่น (๑), (๒) หรือ ๑., ๒.) and closing penalty tails.
 * - Each distinct paragraph starts on a new line or indent without being an enumerated sub-clause.
 */
export function sliceParagraphs(rawContent: string): ParagraphSlice[] {
  if (!rawContent || !rawContent.trim()) {
    return [{ index: 1, label: 'ทั้งมาตรา', content: '' }];
  }

  let clean = rawContent.replace(/\r\n/g, '\n').trim();

  // If no newlines found, normalize tabs or 2+ consecutive spaces as paragraph breaks
  if (!clean.includes('\n') && /(\t|\s{2,})/.test(clean)) {
    clean = clean.replace(/(\t|\s{2,})/g, '\n');
  }

  // Split into raw lines
  const lines = clean
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return [{ index: 1, label: 'ทั้งมาตรา', content: clean }];
  }

  // Check if first line is a section header like "มาตรา ๕๙" or "มาตรา 59 - เจตนาและประมาท"
  let startIndex = 0;
  let headerPrefix = '';
  if (lines.length > 1 && /^มาตรา\s+[0-9๑-๙]+(\s*[-–:]\s*.*)?$/i.test(lines[0])) {
    headerPrefix = lines[0] + '\n';
    startIndex = 1;
  }

  // Regex to check if a line is an enumerated sub-clause (อนุมาตรา) like (๑), (1), (ก), ๑., 1.
  const isSubClause = (line: string) => {
    return /^(\([0-9๑-๙a-zA-Zก-ฮ]+\)|[0-9๑-๙]+\.|\([ก-ฮ]\))\s*/.test(line);
  };

  // Regex to check if a line is a penalty or closing clause completing sub-clauses in the same paragraph
  const isClosingPenalty = (line: string) => {
    return /^(ต้องระวางโทษ|ผู้นั้นต้องระวางโทษ|ให้ระวางโทษ|มีความผิดต้องระวางโทษ|มีโทษ|ศาลจะลงโทษ)/.test(line);
  };

  const paragraphs: string[] = [];
  let currentParagraph = '';
  let inSubClauses = false;

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];

    if (!currentParagraph) {
      currentParagraph = (i === startIndex && headerPrefix) ? headerPrefix + line : line;
      inSubClauses = isSubClause(line);
      continue;
    }

    if (isSubClause(line)) {
      // Sub-clause belongs to the current paragraph
      currentParagraph += '\n' + line;
      inSubClauses = true;
    } else if (inSubClauses && isClosingPenalty(line)) {
      // Penalty/closing clause completing the sub-clauses in the current paragraph
      currentParagraph += '\n' + line;
      inSubClauses = false;
    } else {
      // New legal paragraph (วรรคใหม่)
      paragraphs.push(currentParagraph);
      currentParagraph = line;
      inSubClauses = false;
    }
  }

  if (currentParagraph) {
    paragraphs.push(currentParagraph);
  }

  if (paragraphs.length <= 1) {
    return [{ index: 1, label: 'ทั้งมาตรา', content: clean }];
  }

  return paragraphs.map((part, idx) => ({
    index: idx + 1,
    label: THAI_NUMERAL_WORDS[idx] || `วรรคที่ ${idx + 1}`,
    content: part
  }));
}
