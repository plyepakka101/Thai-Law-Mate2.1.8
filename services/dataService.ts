
import { LawSection, UserNote, BackupData, AppSettings, LawBook } from '../types';
import { parseLaws } from './lawParser';
import { thaiToArabic } from '../utils/textUtils';

// Import Law Data
import { RAW_CRIMINAL_CODE } from './rawLawData';
import { RAW_CIVIL_CODE } from './lawCivil';
import { RAW_CIVIL_PROCEDURE } from './lawCivilProc';
import { RAW_CRIMINAL_PROCEDURE } from './lawCrimProc';
import { RAW_CONSTITUTION } from './lawConst';
import { RAW_BANKRUPTCY } from './lawBankruptcy';
import { RAW_KWAENG } from './lawKwaeng';
import { RAW_COURT_CONST } from './lawCourtConst';

export const BOOKS: LawBook[] = [
  {
    id: 'crim',
    name: 'ประมวลกฎหมายอาญา',
    abbreviation: 'ป.อ.',
    content: RAW_CRIMINAL_CODE,
    color: 'bg-red-500',
    description: 'ความผิดและโทษทางอาญา',
    sourceUrl: 'https://searchlaw.ocs.go.th/council-of-state/#/public/doc/cGFqZ1lmZFpjSzUyM3BFY0Z2TVJ0Zz09',
    lastUpdated: '10 ก.พ. 2567'
  },
  {
    id: 'civil',
    name: 'ประมวลกฎหมายแพ่งและพาณิชย์',
    abbreviation: 'ป.พ.พ.',
    content: RAW_CIVIL_CODE,
    color: 'bg-blue-500',
    description: 'นิติกรรม สัญญา หนี้ เอกเทศสัญญา ทรัพย์สิน ครอบครัว มรดก',
    sourceUrl: 'https://searchlaw.ocs.go.th/council-of-state/#/public/doc/Qko1NGNVa1FhMG9hTTNGcU9sTGxydz09',
    lastUpdated: '10 ก.พ. 2567'
  },
  {
    id: 'civil_proc',
    name: 'ประมวลกฎหมายวิธีพิจารณาความแพ่ง',
    abbreviation: 'ป.วิ.พ.',
    content: RAW_CIVIL_PROCEDURE,
    color: 'bg-indigo-500',
    description: 'กระบวนพิจารณาคดีแพ่ง',
    sourceUrl: 'https://searchlaw.ocs.go.th/council-of-state/#/public/doc/VjZQcUR4VG1iVHZGS09TMUMvY2Vsdz09',
    lastUpdated: '10 ก.พ. 2567'
  },
  {
    id: 'crim_proc',
    name: 'ประมวลกฎหมายวิธีพิจารณาความอาญา',
    abbreviation: 'ป.วิ.อ.',
    content: RAW_CRIMINAL_PROCEDURE,
    color: 'bg-orange-600',
    description: 'กระบวนพิจารณาคดีอาญา',
    sourceUrl: 'https://searchlaw.ocs.go.th/council-of-state/#/public/doc/UVdzUTNzUFZlT3VBOEw2allVWTZxZz09',
    lastUpdated: '10 ก.พ. 2567'
  },
  {
    id: 'const',
    name: 'รัฐธรรมนูญแห่งราชอาณาจักรไทย',
    abbreviation: 'รธน.',
    content: RAW_CONSTITUTION,
    color: 'bg-yellow-500',
    description: 'กฎหมายสูงสุดของประเทศ',
    sourceUrl: 'https://searchlaw.ocs.go.th/council-of-state/#/public/doc/VG9mbS9RRXZhdjNGYy9Xcm5LTjd1Zz09',
    lastUpdated: '10 ก.พ. 2567'
  },
  {
    id: 'bankruptcy',
    name: 'พระราชบัญญัติล้มละลาย',
    abbreviation: 'พ.ร.บ. ล้มละลาย',
    content: RAW_BANKRUPTCY,
    color: 'bg-emerald-600',
    description: 'กระบวนการล้มละลายและการฟื้นฟูกิจการ',
    sourceUrl: 'https://searchlaw.ocs.go.th/council-of-state/#/public/doc/dWNDc0pxS3NteHBmaHJoTE9KakhKdz09',
    lastUpdated: '10 ก.พ. 2567'
  },
  {
    id: 'kwaeng',
    name: 'พ.ร.บ. จัดตั้งศาลแขวงและวิธีพิจารณาความอาญาในศาลแขวง',
    abbreviation: 'ศาลแขวง',
    content: RAW_KWAENG,
    color: 'bg-teal-500',
    description: 'กระบวนพิจารณาคดีอาญาศาลแขวง',
    sourceUrl: 'https://searchlaw.ocs.go.th/council-of-state/#/public/doc/SUlSbFpqUG95RlJ6RDd2c3BKSXBWdz09',
    lastUpdated: '10 ก.พ. 2567'
  },
  {
    id: 'court_const',
    name: 'พระธรรมนูญศาลยุติธรรม',
    abbreviation: 'พระธรรมนูญ',
    content: RAW_COURT_CONST,
    color: 'bg-slate-600',
    description: 'เขตอำนาจศาลและผู้พิพากษา',
    sourceUrl: 'https://searchlaw.ocs.go.th/council-of-state/#/public/doc/b2oxcEd6U0M2bzhQVktyQmFRaEVLdz09',
    lastUpdated: '10 ก.พ. 2567'
  }
];

// Parse all books at startup
const INITIAL_LAWS = BOOKS.flatMap(book => parseLaws(book.content, book.id, book.name));

const CUSTOM_LAWS_KEY = 'thai_law_mate_custom_laws';
const NOTES_KEY = 'thai_law_mate_notes';
const SETTINGS_KEY = 'thai_law_mate_settings';

export const getBooks = (): LawBook[] => BOOKS;

// Helper: Get the original built-in content for a law ID
export const getOriginalLaw = (id: string): LawSection | undefined => {
  return INITIAL_LAWS.find(l => l.id === id);
};

export const getLaws = (): LawSection[] => {
  const storedCustom = localStorage.getItem(CUSTOM_LAWS_KEY);
  const customLaws: LawSection[] = storedCustom ? JSON.parse(storedCustom) : [];
  
  // Merge Logic: Use a Map to let custom laws override built-in ones by ID
  const lawMap = new Map<string, LawSection>();
  
  // 1. Load built-ins
  INITIAL_LAWS.forEach(law => lawMap.set(law.id, law));
  
  // 2. Override with custom/edited laws
  customLaws.forEach(law => lawMap.set(law.id, law));

  const allLaws = Array.from(lawMap.values());

  // Helper to parse section number components for sorting
  const parseSectionComponents = (s: string) => {
      let clean = thaiToArabic(s).trim();
      let main = 0;
      let sub = 0;
      let suffixVal = 0;

      // Check for Thai suffixes
      const suffixes = [
        { key: 'ทวิ', val: 1 }, { key: 'ตรี', val: 2 }, { key: 'จัตวา', val: 3 },
        { key: 'เบญจ', val: 4 }, { key: 'ฉ', val: 6 }, { key: 'สัตต', val: 7 },
        { key: 'อัฏฐ', val: 8 }, { key: 'นว', val: 9 }, { key: 'ทศ', val: 10 }
      ];

      for (const suf of suffixes) {
          if (clean.includes(suf.key)) {
              suffixVal = suf.val;
              // Remove suffix to parse the rest
              clean = clean.replace(suf.key, '').trim();
              break;
          }
      }

      if (clean.includes('/')) {
          const parts = clean.split('/');
          const p0 = parseFloat(parts[0]);
          const p1 = parseFloat(parts[1]);
          main = isNaN(p0) ? 0 : p0;
          sub = isNaN(p1) ? 0 : p1;
      } else {
          const p = parseFloat(clean);
          main = isNaN(p) ? 0 : p;
      }
      
      return { main, sub, suffixVal };
  };

  // Sort logic: Sort by Book Index first, then by Section Number
  return allLaws.sort((a, b) => {
      // Get book priority
      const bookIndexA = BOOKS.findIndex(book => book.id === a.bookId);
      const bookIndexB = BOOKS.findIndex(book => book.id === b.bookId);
      
      const idxA = bookIndexA === -1 ? 99 : bookIndexA;
      const idxB = bookIndexB === -1 ? 99 : bookIndexB;

      if (idxA !== idxB) {
          return idxA - idxB;
      }
      
      // If custom law without specific bookId, push to end or separate
      if (a.isCustom && !a.bookId) return 1;
      if (b.isCustom && !b.bookId) return -1;

      const valA = parseSectionComponents(a.sectionNumber);
      const valB = parseSectionComponents(b.sectionNumber);

      if (valA.main !== valB.main) {
          return valA.main - valB.main;
      }
      if (valA.sub !== valB.sub) {
          return valA.sub - valB.sub;
      }
      return valA.suffixVal - valB.suffixVal;
  });
};

export const saveCustomLaw = (law: LawSection | Omit<LawSection, 'id'>) => {
  const storedCustom = localStorage.getItem(CUSTOM_LAWS_KEY);
  let customLaws: LawSection[] = storedCustom ? JSON.parse(storedCustom) : [];
  
  let newLaw: LawSection;

  // Check if there's an ID provided or if we can find a matching built-in law to override
  const normalizedSection = thaiToArabic(law.sectionNumber);
  
  // Attempt to find an existing built-in ID if one wasn't passed explicitly
  let existingId = 'id' in law ? law.id : undefined;
  
  if (!existingId && law.bookId && law.bookId !== 'custom') {
      // Try to construct ID or find it
      const targetId = `${law.bookId}-${normalizedSection.replace(/\//g, '-').replace(/\s+/g, '-')}`;
      const builtIn = INITIAL_LAWS.find(l => l.id === targetId);
      if (builtIn) {
          existingId = builtIn.id;
      } else {
          // New section in an existing book
          existingId = targetId;
      }
  }

  if (existingId) {
    // Updating/Overriding existing law
    newLaw = { 
        ...law, 
        sectionNumber: normalizedSection,
        id: existingId, 
        isCustom: true 
    }; 
    const index = customLaws.findIndex(l => l.id === existingId);
    if (index >= 0) {
      customLaws[index] = newLaw;
    } else {
      customLaws.push(newLaw);
    }
  } else {
    // Creating brand new custom law (no specific book context found)
    newLaw = {
      ...law,
      sectionNumber: normalizedSection, 
      id: `custom-${Date.now()}`,
      category: law.category || 'กฎหมายเพิ่มเติม',
      isCustom: true,
      bookId: law.bookId || 'custom' 
    };
    customLaws.push(newLaw);
  }
  
  localStorage.setItem(CUSTOM_LAWS_KEY, JSON.stringify(customLaws));
  return newLaw;
};

export const restoreOriginalLaw = (id: string) => {
    const storedCustom = localStorage.getItem(CUSTOM_LAWS_KEY);
    if(!storedCustom) return;
    const customLaws: LawSection[] = JSON.parse(storedCustom);
    const updated = customLaws.filter(l => l.id !== id);
    localStorage.setItem(CUSTOM_LAWS_KEY, JSON.stringify(updated));
}

export const getNotes = (): Record<string, UserNote> => {
  const stored = localStorage.getItem(NOTES_KEY);
  return stored ? JSON.parse(stored) : {};
};

export const saveNote = (note: UserNote) => {
  const notes = getNotes();
  
  const hasText = note.text && note.text.trim().length > 0;
  const hasHighlight = note.isHighlighted;
  const hasTextHighlights = note.textHighlights && note.textHighlights.length > 0;

  if (!hasText && !hasHighlight && !hasTextHighlights) {
    delete notes[note.sectionId];
  } else {
    notes[note.sectionId] = note;
  }
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  return notes;
};

// This is now effectively "Restore Original" for built-ins, or Delete for pure custom
export const deleteCustomLaw = (id: string) => {
    restoreOriginalLaw(id);
}

export const exportData = (): string => {
  const notes = getNotes();
  const storedCustom = localStorage.getItem(CUSTOM_LAWS_KEY);
  const customLaws = storedCustom ? JSON.parse(storedCustom) : [];

  const backup: BackupData = {
    version: 1,
    timestamp: Date.now(),
    notes,
    customLaws
  };

  return JSON.stringify(backup, null, 2);
};

export const importData = (jsonString: string): boolean => {
  try {
    const data: BackupData = JSON.parse(jsonString);
    if (!data.notes || !Array.isArray(data.customLaws)) {
      console.error("Invalid backup format");
      return false;
    }
    localStorage.setItem(NOTES_KEY, JSON.stringify(data.notes));
    localStorage.setItem(CUSTOM_LAWS_KEY, JSON.stringify(data.customLaws));
    return true;
  } catch (e) {
    console.error("Import failed:", e);
    return false;
  }
};

export const resetData = () => {
  localStorage.removeItem(NOTES_KEY);
  localStorage.removeItem(CUSTOM_LAWS_KEY);
};

export const getSettings = (): AppSettings => {
  const stored = localStorage.getItem(SETTINGS_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  return {
    darkMode: false,
    fontSize: 2,
    fontStyle: 'modern',
    voiceURI: '',
    speakingRate: 1.0
  };
};

export const saveSettings = (settings: AppSettings) => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};
