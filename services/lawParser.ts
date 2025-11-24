
import { LawSection } from '../types';
import { thaiToArabic, VALID_SUFFIXES } from '../utils/textUtils';

export const parseLaws = (rawText: string, bookId: string, bookName: string): LawSection[] => {
  const lines = rawText.split('\n');
  const laws: LawSection[] = [];
  
  let currentPart = ''; // ภาค / บรรพ
  let currentTitle = ''; // ลักษณะ
  let currentChapter = ''; // หมวด
  let currentSectionGroup = ''; // ส่วนที่
  
  let currentSectionNumber = '';
  let currentContent: string[] = [];
  
  const flushSection = () => {
    if (currentSectionNumber && currentContent.length > 0) {
      // Prepend Book Name to category hierarchy
      const categoryParts = [bookName, currentPart, currentTitle, currentChapter, currentSectionGroup].filter(Boolean);
      const category = categoryParts.length > 0 ? categoryParts.join(' > ') : bookName;
      
      // Clean content: remove footnote markers like [1], [120]
      const cleanContent = currentContent
        .join('\n')
        .replace(/\[\d+\]/g, '') 
        .trim();

      if (cleanContent) {
        // Generate a deterministic ID based on the book prefix and section number
        const normNum = thaiToArabic(currentSectionNumber).replace(/\//g, '-').replace(/\s+/g, '-');
        laws.push({
          id: `${bookId}-${normNum}`, // e.g., crim-112, civil-1
          sectionNumber: currentSectionNumber, 
          content: cleanContent,
          category: category,
          bookId: bookId
        });
      }
      
      currentContent = [];
      currentSectionNumber = '';
    }
  };

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    
    // Skip empty lines or page delimiters
    if (!line || line.startsWith('==') || line.match(/^\[\d+\]$/)) continue;

    // Helper to check if next line is a description of the header
    const getNextLineDescription = () => {
       if (i + 1 >= lines.length) return null;
       const nextLine = lines[i+1].trim();
       // Check if next line is a keyword or empty
       if (!nextLine) return null;
       const keywords = ['ภาค ', 'บรรพ ', 'ลักษณะ ', 'หมวด ', 'ส่วนที่ ', 'มาตรา '];
       if (keywords.some(k => nextLine.startsWith(k))) return null;
       // Also exclude footnotes just in case
       if (nextLine.match(/^\[\d+\]$/)) return null;
       
       return nextLine;
    };

    // Detect Hierarchy Headers
    if (line.startsWith('ภาค ') || line.startsWith('บรรพ ')) {
      flushSection();
      currentPart = line;
      const desc = getNextLineDescription();
      if (desc) {
          currentPart += ' ' + desc;
          i++; // Consume next line
      }
      currentTitle = '';
      currentChapter = '';
      currentSectionGroup = '';
      continue;
    }
    if (line.startsWith('ลักษณะ ')) {
      flushSection();
      currentTitle = line;
      const desc = getNextLineDescription();
      if (desc) {
          currentTitle += ' ' + desc;
          i++; // Consume next line
      }
      currentChapter = '';
      currentSectionGroup = '';
      continue;
    }
    if (line.startsWith('หมวด ')) {
      flushSection();
      currentChapter = line;
      const desc = getNextLineDescription();
      if (desc) {
          currentChapter += ' ' + desc;
          i++; // Consume next line
      }
      currentSectionGroup = '';
      continue;
    }
    if (line.startsWith('ส่วนที่ ')) {
        flushSection();
        currentSectionGroup = line;
        const desc = getNextLineDescription();
        if (desc) {
            currentSectionGroup += ' ' + desc;
            i++; // Consume next line
        }
        continue;
    }

    // Detect Section Start (มาตรา)
    // Matches "มาตรา ๑", "มาตรา ๒๘๕/๑"
    const baseMatch = line.match(/^มาตรา\s+([๐-๙\d]+(?:\/[๐-๙\d]+)?)(.*)/);
    
    if (baseMatch) {
      flushSection(); // Save the previous section
      
      let sectionNum = baseMatch[1];
      let remainder = baseMatch[2];

      // Check if the remainder starts with a valid suffix (e.g. " ทวิ")
      // We check for space + suffix + boundary
      const suffixRegex = new RegExp(`^\\s+(${VALID_SUFFIXES.join('|')})(?:\\s+|$)`);
      const suffixMatch = remainder.match(suffixRegex);

      if (suffixMatch) {
        // It is a suffix, append to section number
        sectionNum += suffixMatch[0].trimEnd(); 
        // Remove suffix from remainder
        remainder = remainder.substring(suffixMatch[0].length);
      }

      currentSectionNumber = sectionNum;
      if (remainder && remainder.trim()) {
        currentContent.push(remainder.trim());
      }
    } else {
      // It's content line. Only add if we are inside a section.
      if (currentSectionNumber) {
        currentContent.push(line);
      }
    }
  }
  
  // Flush the last section
  flushSection();

  return laws;
};
