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
  'วรรคสิบ'
];

/**
 * Split Thai law section text into distinct legal paragraphs (วรรค).
 * In Thai law drafting, each indentation or double-newline represents a "วรรค".
 */
export function sliceParagraphs(rawContent: string): ParagraphSlice[] {
  if (!rawContent || !rawContent.trim()) {
    return [{ index: 1, label: 'วรรคหนึ่ง', content: '' }];
  }

  const clean = rawContent.replace(/\r\n/g, '\n').trim();

  // Split by double newline or single newline with leading whitespace/tab
  const rawParts = clean
    .split(/\n\s*\n|\n(?=\s{2,}|\t|ถ้า|เมื่อ|ในกรณี|แต่ถ้า|ผู้ใด|บทบัญญัติ)/)
    .map(p => p.trim())
    .filter(Boolean);

  // If only 1 part found, try standard single newline split
  let parts = rawParts;
  if (parts.length <= 1) {
    const lines = clean.split('\n').map(l => l.trim()).filter(Boolean);
    // Only split lines if they have reasonable sentence length (> 20 chars)
    if (lines.length > 1 && lines.every(l => l.length > 15)) {
      parts = lines;
    }
  }

  if (parts.length <= 1) {
    return [{ index: 1, label: 'ทั้งมาตรา', content: clean }];
  }

  return parts.map((part, idx) => ({
    index: idx + 1,
    label: THAI_NUMERAL_WORDS[idx] || `วรรคที่ ${idx + 1}`,
    content: part
  }));
}
