import { LawSection, UserNote, BackupData, AppSettings, LawBook } from '../types';
import { parseLaws } from './lawParser';
import { thaiToArabic } from '../utils/textUtils';
import { RAW_CRIMINAL_CODE } from './rawLawData';
import { RAW_CIVIL_CODE } from './lawCivil';
import { RAW_CIVIL_PROCEDURE } from './lawCivilProc';
import { RAW_CRIMINAL_PROCEDURE } from './lawCrimProc';
import { RAW_CONSTITUTION } from './lawConst';
import { RAW_BANKRUPTCY } from './lawBankruptcy';
import { RAW_KWAENG } from './lawKwaeng';
import { RAW_COURT_CONST } from './lawCourtConst';

export const BOOKS: LawBook[] = [
  { id: 'crim', name: 'ประมวลกฎหมายอาญา', abbreviation: 'ป.อ.', content: RAW_CRIMINAL_CODE, color: 'bg-red-500', description: 'ความผิดและโทษทางอาญา', sourceUrl: 'https://searchlaw.ocs.go.th/council-of-state/#/public/doc/cGFqZ1lmZFpjSzUyM3BFY0Z2TVJ0Zz09', lastUpdated: '10 ก.พ. 2567' },
  { id: 'civil', name: 'ประมวลกฎหมายแพ่งและพาณิชย์', abbreviation: 'ป.พ.พ.', content: RAW_CIVIL_CODE, color: 'bg-blue-500', description: 'นิติกรรม สัญญา หนี้ เอกเทศสัญญา ทรัพย์สิน ครอบครัว มรดก', sourceUrl: 'https://searchlaw.ocs.go.th/council-of-state/#/public/doc/Qko1NGNVa1FhMG9hTTNGcU9sTGxydz09', lastUpdated: '10 ก.พ. 2567' },
  { id: 'civil_proc', name: 'ประมวลกฎหมายวิธีพิจารณาความแพ่ง', abbreviation: 'ป.วิ.พ.', content: RAW_CIVIL_PROCEDURE, color: 'bg-indigo-500', description: 'กระบวนพิจารณาคดีแพ่ง', sourceUrl: 'https://searchlaw.ocs.go.th/council-of-state/#/public/doc/VjZQcUR4VG1iVHZGS09TMUMvY2Vsdz09', lastUpdated: '10 ก.พ. 2567' },
  { id: 'crim_proc', name: 'ประมวลกฎหมายวิธีพิจารณาความอาญา', abbreviation: 'ป.วิ.อ.', content: RAW_CRIMINAL_PROCEDURE, color: 'bg-orange-600', description: 'กระบวนพิจารณาคดีอาญา', sourceUrl: 'https://searchlaw.ocs.go.th/council-of-state/#/public/doc/UVdzUTNzUFZlT3VBOEw2allVWTZxZz09', lastUpdated: '10 ก.พ. 2567' },
  { id: 'const', name: 'รัฐธรรมนูญแห่งราชอาณาจักรไทย', abbreviation: 'รธน.', content: RAW_CONSTITUTION, color: 'bg-yellow-500', description: 'กฎหมายสูงสุดของประเทศ', sourceUrl: 'https://searchlaw.ocs.go.th/council-of-state/#/public/doc/VG9mbS9RRXZhdjNGYy9Xcm5LTjd1Zz09', lastUpdated: '10 ก.พ. 2567' },
  { id: 'bankruptcy', name: 'พระราชบัญญัติล้มละลาย', abbreviation: 'พ.ร.บ. ล้มละลาย', content: RAW_BANKRUPTCY, color: 'bg-emerald-600', description: 'กระบวนการล้มละลายและการฟื้นฟูกิจการ', sourceUrl: 'https://searchlaw.ocs.go.th/council-of-state/#/public/doc/dWNDc0pxS3NteHBmaHJoTE9KakhKdz09', lastUpdated: '10 ก.พ. 2567' },
  { id: 'kwaeng', name: 'พ.ร.บ. จัดตั้งศาลแขวงและวิธีพิจารณาความอาญาในศาลแขวง', abbreviation: 'ศาลแขวง', content: RAW_KWAENG, color: 'bg-teal-500', description: 'กระบวนพิจารณาคดีอาญาศาลแขวง', sourceUrl: 'https://searchlaw.ocs.go.th/council-of-state/#/public/doc/SUlSbFpqUG95RlJ6RDd2c3BKSXBWdz09', lastUpdated: '10 ก.พ. 2567' },
  { id: 'court_const', name: 'พระธรรมนูญศาลยุติธรรม', abbreviation: 'พระธรรมนูญ', content: RAW_COURT_CONST, color: 'bg-slate-600', description: 'เขตอำนาจศาลและผู้พิพากษา', sourceUrl: 'https://searchlaw.ocs.go.th/council-of-state/#/public/doc/b2oxcEd6U0M2bzhQVktyQmFRaEVLdz09', lastUpdated: '10 ก.พ. 2567' }
];

const INITIAL_LAWS = BOOKS.flatMap(book => parseLaws(book.content, book.id, book.name));
const CUSTOM_LAWS_KEY = 'thai_law_mate_custom_laws';
const CUSTOM_BOOKS_KEY = 'thai_law_mate_custom_books';
const NOTES_KEY = 'thai_law_mate_notes';
const SETTINGS_KEY = 'thai_law_mate_settings';
const NEON_STATUS_KEY = 'thai_law_mate_neon_status';
const SYNC_ERRORS_KEY = 'thai_law_mate_sync_errors';

const readJson = <T,>(key: string, fallback: T): T => {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : fallback; } catch { return fallback; }
};

// Listeners for background data updates
type SyncListener = () => void;
const syncListeners: Set<SyncListener> = new Set();
export const onDataSynced = (listener: SyncListener) => {
  syncListeners.add(listener);
  return () => syncListeners.delete(listener);
};
const notifyListeners = () => syncListeners.forEach(l => l());

// =====================================================================
// NEW: Sync error tracking (the actual bug fix)
//
// Previously every Neon sync call used `.catch(e => console.warn(...))`
// on the raw fetch(). fetch() only rejects on network-level failures —
// a 400/500 response from the API resolves normally, so `.catch` never
// fired. That meant server-side failures (bad payload, DB error, cold
// start, etc.) were invisible: the item was already saved to
// localStorage, the UI looked fine, and Neon silently never got the
// write. `syncMutation` below fixes that by explicitly checking
// `res.ok`, and every failure (network OR HTTP-level) is now:
//   1. logged to console.error with detail,
//   2. recorded to localStorage so it survives a refresh, and
//   3. broadcast to any UI listener via `onSyncError`, so components
//      (see components/SyncErrorBanner.tsx) can actually show it.
// =====================================================================

export interface SyncErrorEntry {
  message: string;
  timestamp: number;
}

type SyncErrorListener = (entry: SyncErrorEntry) => void;
const syncErrorListeners: Set<SyncErrorListener> = new Set();

export const onSyncError = (listener: SyncErrorListener) => {
  syncErrorListeners.add(listener);
  return () => syncErrorListeners.delete(listener);
};

export const getSyncErrors = (): SyncErrorEntry[] => readJson<SyncErrorEntry[]>(SYNC_ERRORS_KEY, []);

export const clearSyncErrors = () => {
  localStorage.removeItem(SYNC_ERRORS_KEY);
};

const recordSyncError = (message: string) => {
  const entry: SyncErrorEntry = { message, timestamp: Date.now() };
  const existing = getSyncErrors();
  // Keep only the most recent 20 so this never grows unbounded.
  const updated = [...existing, entry].slice(-20);
  localStorage.setItem(SYNC_ERRORS_KEY, JSON.stringify(updated));
  syncErrorListeners.forEach(l => l(entry));
};

/**
 * Fire a mutation request to a Neon-backed API route and actually check
 * whether it succeeded. Returns true/false instead of throwing, so call
 * sites can stay "fire and forget" if they want — but failures are no
 * longer silent.
 */
const syncMutation = async (url: string, options: RequestInit, label: string): Promise<boolean> => {
  try {
    const res = await fetch(url, options);
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({} as { error?: string }));
      const msg = `${label} ไม่สำเร็จ: ${errBody.error || `เซิร์ฟเวอร์ตอบกลับ HTTP ${res.status}`}`;
      console.error('[Neon sync failed]', msg);
      recordSyncError(msg);
      return false;
    }
    return true;
  } catch (e) {
    const msg = `${label} ไม่สำเร็จ: ${e instanceof Error ? e.message : 'เชื่อมต่อเครือข่ายไม่ได้'}`;
    console.error('[Neon sync failed]', msg);
    recordSyncError(msg);
    return false;
  }
};

const BOOK_COLORS_OVERRIDE_KEY = 'thai_law_mate_book_colors_override';

export const getBookColorOverrides = (): Record<string, string> => readJson<Record<string, string>>(BOOK_COLORS_OVERRIDE_KEY, {});

export const updateBookColor = (bookId: string, newColor: string): LawBook | undefined => {
  const overrides = getBookColorOverrides();
  overrides[bookId] = newColor;
  localStorage.setItem(BOOK_COLORS_OVERRIDE_KEY, JSON.stringify(overrides));

  const customBooks = getCustomBooks();
  const customIdx = customBooks.findIndex(b => b.id === bookId);
  if (customIdx >= 0) {
    customBooks[customIdx].color = newColor;
    localStorage.setItem(CUSTOM_BOOKS_KEY, JSON.stringify(customBooks));
  }

  const allBooks = getBooks();
  const book = allBooks.find(b => b.id === bookId);
  if (book) {
    book.color = newColor;
    syncMutation('/api/books', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(book)
    }, 'บันทึกสีหนังสือกฎหมาย');
  }

  notifyListeners();
  return book;
};

export const getCustomBooks = (): LawBook[] => readJson<LawBook[]>(CUSTOM_BOOKS_KEY, []);
export const getBooks = (): LawBook[] => {
  const overrides = getBookColorOverrides();
  const all = [...BOOKS, ...getCustomBooks()];
  return all.map(b => ({
    ...b,
    color: overrides[b.id] || b.color || 'bg-law-600'
  }));
};

export const saveCustomBook = (book: LawBook): LawBook => {
  const books = getCustomBooks();
  const normalized: LawBook = {
    ...book,
    id: book.id || `custom-book-${Date.now()}`,
    isCustom: true,
    content: book.content || '',
    abbreviation: book.abbreviation || 'กำหนดเอง',
    color: book.color || 'bg-law-600'
  };
  const index = books.findIndex(b => b.id === normalized.id);
  if (index >= 0) books[index] = normalized; else books.push(normalized);
  localStorage.setItem(CUSTOM_BOOKS_KEY, JSON.stringify(books));

  syncMutation('/api/books', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(normalized)
  }, `บันทึกหนังสือกฎหมาย "${normalized.name}"`);

  return normalized;
};

export const saveCustomBookAsync = async (book: LawBook): Promise<LawBook> => {
  const normalized = saveCustomBook(book);
  try {
    const res = await fetch('/api/books', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(normalized)
    });
    if (!res.ok) {
      console.warn('Neon sync book status:', res.status);
    }
  } catch (e) {
    console.warn('Neon sync book network error:', e);
  }
  return normalized;
};

export const deleteCustomBook = (bookId: string) => {
  localStorage.setItem(CUSTOM_BOOKS_KEY, JSON.stringify(getCustomBooks().filter(b => b.id !== bookId)));
  localStorage.setItem(CUSTOM_LAWS_KEY, JSON.stringify(readJson<LawSection[]>(CUSTOM_LAWS_KEY, []).filter(l => l.bookId !== bookId)));

  syncMutation(`/api/books?id=${encodeURIComponent(bookId)}`, { method: 'DELETE' }, 'ลบหนังสือกฎหมาย');
};

export const getOriginalLaw = (id: string): LawSection | undefined => INITIAL_LAWS.find(l => l.id === id);

const sectionKey = (s: string) => {
  let clean = thaiToArabic(s).trim();
  let suffixVal = 0;
  ['ทวิ','ตรี','จัตวา','เบญจ','ฉ','สัตต','อัฏฐ','นว','ทศ'].forEach((suffix, index) => {
    if (clean.includes(suffix)) { suffixVal = index + 1; clean = clean.replace(suffix, '').trim(); }
  });
  const parts = clean.split('/');
  return { main: Number(parts[0]) || 0, sub: Number(parts[1]) || 0, suffixVal };
};

export const getLaws = (): LawSection[] => {
  const customBooks = getCustomBooks();
  const generated = customBooks.flatMap(book => parseLaws(book.content, book.id, book.name));
  const storedCustom = readJson<LawSection[]>(CUSTOM_LAWS_KEY, []);
  const map = new Map<string, LawSection>();
  [...INITIAL_LAWS, ...generated].forEach(l => map.set(l.id, l));
  storedCustom.forEach(l => map.set(l.id, l));
  const books = getBooks();
  return Array.from(map.values()).sort((a, b) => {
    const ia = books.findIndex(book => book.id === a.bookId);
    const ib = books.findIndex(book => book.id === b.bookId);
    const ba = ia < 0 ? 999 : ia, bb = ib < 0 ? 999 : ib;
    if (ba !== bb) return ba - bb;
    const sa = sectionKey(a.sectionNumber), sb = sectionKey(b.sectionNumber);
    return sa.main - sb.main || sa.suffixVal - sb.suffixVal || sa.sub - sb.sub;
  });
};

/**
 * Saves a custom law section. Returns immediately with the saved section
 * (local write is synchronous, as before) while the Neon sync happens in
 * the background — but a failed sync is now tracked, see `onSyncError`.
 */
export const saveCustomLaw = (law: LawSection | Omit<LawSection, 'id'>) => {
  const customLaws = readJson<LawSection[]>(CUSTOM_LAWS_KEY, []);
  const normalizedSection = thaiToArabic(law.sectionNumber).trim();
  const existingId = 'id' in law ? law.id : undefined;
  const id = existingId || (law.bookId && law.bookId !== 'custom' ? `${law.bookId}-${normalizedSection.replace(/\//g, '-').replace(/\s+/g, '-')}` : `custom-${Date.now()}`);
  const newLaw: LawSection = { ...law, id, sectionNumber: normalizedSection, category: law.category || 'กฎหมายเพิ่มเติม', isCustom: true, bookId: law.bookId || 'custom' };
  const index = customLaws.findIndex(l => l.id === id);
  if (index >= 0) customLaws[index] = newLaw; else customLaws.push(newLaw);
  localStorage.setItem(CUSTOM_LAWS_KEY, JSON.stringify(customLaws));

  syncMutation('/api/laws', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newLaw)
  }, `บันทึกมาตรา ${newLaw.sectionNumber}`);

  return newLaw;
};

export const saveCustomLawAsync = async (law: LawSection | Omit<LawSection, 'id'>): Promise<LawSection> => {
  const newLaw = saveCustomLaw(law);
  try {
    const res = await fetch('/api/laws', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newLaw)
    });
    if (!res.ok) {
      console.warn('Neon sync law status:', res.status);
    }
  } catch (e) {
    console.warn('Neon sync law network error:', e);
  }
  return newLaw;
};

export const saveCustomLawsBatch = async (laws: LawSection[]): Promise<boolean> => {
  if (!laws.length) return true;
  const customLaws = readJson<LawSection[]>(CUSTOM_LAWS_KEY, []);
  const preparedLaws: LawSection[] = laws.map(law => {
    const normalizedSection = thaiToArabic(law.sectionNumber).trim();
    const existingId = law.id;
    const id = existingId || (law.bookId && law.bookId !== 'custom' 
      ? `${law.bookId}-${normalizedSection.replace(/\//g, '-').replace(/\s+/g, '-')}` 
      : `custom-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
    return {
      ...law,
      id,
      sectionNumber: normalizedSection,
      category: law.category || 'กฎหมายเพิ่มเติม',
      isCustom: true,
      bookId: law.bookId || 'custom'
    };
  });

  for (const law of preparedLaws) {
    const idx = customLaws.findIndex(l => l.id === law.id);
    if (idx >= 0) customLaws[idx] = law; else customLaws.push(law);
  }
  localStorage.setItem(CUSTOM_LAWS_KEY, JSON.stringify(customLaws));

  try {
    const res = await fetch('/api/laws', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(preparedLaws)
    });
    return res.ok;
  } catch (e) {
    console.warn('Neon batch sync laws network error:', e);
    return false;
  }
};

export const restoreOriginalLaw = (id: string) => {
  localStorage.setItem(CUSTOM_LAWS_KEY, JSON.stringify(readJson<LawSection[]>(CUSTOM_LAWS_KEY, []).filter(l => l.id !== id)));
  syncMutation(`/api/laws?id=${encodeURIComponent(id)}`, { method: 'DELETE' }, 'ลบมาตรา');
};
export const deleteCustomLaw = (id: string) => restoreOriginalLaw(id);

export const getNotes = (): Record<string, UserNote> => readJson<Record<string, UserNote>>(NOTES_KEY, {});
export const saveNote = (note: UserNote) => {
  const notes = getNotes();
  if (!note.text?.trim() && !note.isHighlighted && !(note.textHighlights?.length)) {
    delete notes[note.sectionId];
    syncMutation(`/api/notes?sectionId=${encodeURIComponent(note.sectionId)}`, { method: 'DELETE' }, 'ลบโน้ต');
  } else {
    notes[note.sectionId] = note;
    syncMutation('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(note)
    }, 'บันทึกโน้ต');
  }
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  return notes;
};

export const getSettings = (): AppSettings => readJson<AppSettings>(SETTINGS_KEY, { darkMode: false, fontSize: 2, fontStyle: 'modern' });
export const saveSettings = (settings: AppSettings) => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  syncMutation('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings)
  }, 'บันทึกการตั้งค่า');
};

export const exportData = (): string => JSON.stringify({
  version: 3,
  timestamp: Date.now(),
  notes: getNotes(),
  customLaws: readJson<LawSection[]>(CUSTOM_LAWS_KEY, []),
  customBooks: getCustomBooks()
}, null, 2);

export const importData = (jsonString: string): boolean => {
  try {
    const data = JSON.parse(jsonString) as BackupData;
    if (!data || typeof data !== 'object') return false;
    if (data.notes) localStorage.setItem(NOTES_KEY, JSON.stringify(data.notes));
    if (Array.isArray(data.customLaws)) localStorage.setItem(CUSTOM_LAWS_KEY, JSON.stringify(data.customLaws));
    if (Array.isArray(data.customBooks)) localStorage.setItem(CUSTOM_BOOKS_KEY, JSON.stringify(data.customBooks));

    syncToNeon().catch(e => console.warn('Auto sync after import warning:', e));
    return true;
  } catch { return false; }
};

export const resetData = () => {
  localStorage.removeItem(NOTES_KEY);
  localStorage.removeItem(CUSTOM_LAWS_KEY);
  localStorage.removeItem(CUSTOM_BOOKS_KEY);
};

// =====================================================================
// Neon Database Cloud Sync & Health
// =====================================================================

export interface NeonStatus {
  connected: boolean;
  message?: string;
  stats?: {
    books: number;
    sections: number;
    notes: number;
  };
  lastChecked?: number;
}

export const getCachedNeonStatus = (): NeonStatus => {
  return readJson<NeonStatus>(NEON_STATUS_KEY, { connected: false, message: 'ยังไม่ได้ตรวจสอบการเชื่อมต่อ' });
};

export const checkNeonStatus = async (): Promise<NeonStatus> => {
  try {
    const res = await fetch('/api/sync', { method: 'GET' });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const status: NeonStatus = { connected: false, message: errData.error || `HTTP ${res.status}`, lastChecked: Date.now() };
      localStorage.setItem(NEON_STATUS_KEY, JSON.stringify(status));
      return status;
    }
    const data = await res.json();
    const status: NeonStatus = {
      connected: Boolean(data.connected),
      stats: data.stats,
      message: data.connected ? 'เชื่อมต่อฐานข้อมูล Neon สำเร็จ' : (data.message || 'ไม่ได้ตั้งค่า DATABASE_URL'),
      lastChecked: Date.now()
    };
    localStorage.setItem(NEON_STATUS_KEY, JSON.stringify(status));
    return status;
  } catch (error) {
    const status: NeonStatus = {
      connected: false,
      message: 'ออฟไลน์ หรือยังไม่ได้เชื่อมต่อ API',
      lastChecked: Date.now()
    };
    localStorage.setItem(NEON_STATUS_KEY, JSON.stringify(status));
    return status;
  }
};

export const syncToNeon = async (): Promise<{ success: boolean; message: string; details?: any }> => {
  try {
    const payload = {
      books: getCustomBooks(),
      laws: readJson<LawSection[]>(CUSTOM_LAWS_KEY, []),
      notes: getNotes(),
      settings: getSettings()
    };

    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = err.error || `ซิงค์ไม่สำเร็จ (HTTP ${res.status})`;
      recordSyncError(`ซิงค์ทั้งหมด: ${msg}`);
      return { success: false, message: msg };
    }

    const result = await res.json();
    return {
      success: true,
      message: 'ซิงค์ข้อมูลขึ้น Neon สำเร็จแล้ว',
      details: result.synced
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการเชื่อมต่อ';
    recordSyncError(`ซิงค์ทั้งหมด: ${msg}`);
    return {
      success: false,
      message: msg
    };
  }
};

export const syncFromNeon = async (): Promise<{ success: boolean; message: string; counts?: { books: number; laws: number; notes: number }; stats?: any }> => {
  try {
    const res = await fetch('/api/sync?pull=1', { method: 'GET' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, message: err.error || `ซิงค์ไม่สำเร็จ (HTTP ${res.status})` };
    }

    const data = await res.json();
    if (!data.connected) {
      const status: NeonStatus = { connected: false, message: data.message || 'ไม่ได้ตั้งค่า DATABASE_URL', lastChecked: Date.now() };
      localStorage.setItem(NEON_STATUS_KEY, JSON.stringify(status));
      return { 
        success: false, 
        message: data.message || 'ยังไม่ได้เชื่อมต่อฐานข้อมูล Neon (กรุณาตั้งค่า DATABASE_URL บน Vercel)' 
      };
    }

    let syncedBookCount = 0;
    let syncedLawCount = 0;
    let syncedNoteCount = 0;

    // 1. Sync custom books
    if (Array.isArray(data.customBooks) && data.customBooks.length > 0) {
      const localBooks = getCustomBooks();
      const bookMap = new Map<string, LawBook>();
      localBooks.forEach(b => bookMap.set(b.id, b));
      data.customBooks.forEach((b: LawBook) => bookMap.set(b.id, b));
      const mergedBooks = Array.from(bookMap.values());
      localStorage.setItem(CUSTOM_BOOKS_KEY, JSON.stringify(mergedBooks));
      syncedBookCount = data.customBooks.length;
    }

    // 2. Sync custom laws
    if (Array.isArray(data.customLaws) && data.customLaws.length > 0) {
      const localLaws = readJson<LawSection[]>(CUSTOM_LAWS_KEY, []);
      const lawMap = new Map<string, LawSection>();
      localLaws.forEach(l => lawMap.set(l.id, l));
      data.customLaws.forEach((l: LawSection) => lawMap.set(l.id, l));
      const mergedLaws = Array.from(lawMap.values());
      localStorage.setItem(CUSTOM_LAWS_KEY, JSON.stringify(mergedLaws));
      syncedLawCount = data.customLaws.length;
    }

    // 3. Sync notes
    if (data.notes && typeof data.notes === 'object') {
      const localNotes = getNotes();
      const mergedNotes = { ...localNotes, ...data.notes };
      localStorage.setItem(NOTES_KEY, JSON.stringify(mergedNotes));
      syncedNoteCount = Object.keys(data.notes).length;
    }

    // 4. Sync settings
    if (data.settings && typeof data.settings === 'object') {
      const current = getSettings();
      const mergedSettings = { ...current, ...data.settings };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(mergedSettings));
    }

    const status: NeonStatus = {
      connected: true,
      stats: data.stats,
      message: 'เชื่อมต่อฐานข้อมูล Neon สำเร็จ',
      lastChecked: Date.now()
    };
    localStorage.setItem(NEON_STATUS_KEY, JSON.stringify(status));

    notifyListeners();

    return {
      success: true,
      message: `ซิงค์ข้อมูลจาก Neon สำเร็จ (พบกฎหมายเพิ่ม ${syncedBookCount} เล่ม, ${syncedLawCount} มาตรา, ${syncedNoteCount} บันทึก)`,
      counts: { books: syncedBookCount, laws: syncedLawCount, notes: syncedNoteCount },
      stats: data.stats
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการเชื่อมต่อกับ Neon'
    };
  }
};

// Initial background sync on app load (cross-device sync)
if (typeof window !== 'undefined') {
  setTimeout(async () => {
    try {
      await syncFromNeon();
    } catch (e) {
      console.log('Background Neon cross-device sync error:', e);
    }
  }, 1000);
}

