const CUSTOM_BOOKS_KEY = 'thai_law_mate_custom_books';
const CUSTOM_LAWS_KEY = 'thai_law_mate_custom_laws';
const NOTES_KEY = 'thai_law_mate_notes';
const BOOK_COLORS_OVERRIDE_KEY = 'thai_law_mate_book_colors_override';
const MIGRATION_KEY = 'thai_law_mate_id_migration_v1';

const safeRead = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const hashId = (value: string): string => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
};

const makeSafeBookId = (oldId: string) => `legacy-book-${hashId(oldId)}`;
const makeSafeLawId = (oldId: string) => `legacy-law-${hashId(oldId)}`;

/**
 * Repairs legacy custom IDs that were generated from the full Thai law name.
 * Older versions could create book IDs longer than Neon VARCHAR(64).
 * The migration changes only localStorage identifiers and keeps all content.
 */
export const migrateLegacyCustomIds = (): void => {
  if (typeof window === 'undefined') return;
  if (localStorage.getItem(MIGRATION_KEY) === 'done') return;

  const books = safeRead<Array<Record<string, any>>>(CUSTOM_BOOKS_KEY, []);
  const laws = safeRead<Array<Record<string, any>>>(CUSTOM_LAWS_KEY, []);
  const notes = safeRead<Record<string, any>>(NOTES_KEY, {});
  const colorOverrides = safeRead<Record<string, string>>(BOOK_COLORS_OVERRIDE_KEY, {});

  const bookIdMap = new Map<string, string>();
  const lawIdMap = new Map<string, string>();

  books.forEach(book => {
    if (typeof book.id === 'string' && book.id.length > 64) {
      let nextId = makeSafeBookId(book.id);
      let counter = 1;
      while (books.some(b => b !== book && b.id === nextId)) {
        nextId = `${makeSafeBookId(book.id)}-${counter}`;
        counter += 1;
      }
      bookIdMap.set(book.id, nextId);
      book.id = nextId;
    }
  });

  laws.forEach(law => {
    const oldBookId = typeof law.bookId === 'string' ? law.bookId : '';
    if (bookIdMap.has(oldBookId)) law.bookId = bookIdMap.get(oldBookId);

    if (typeof law.id === 'string' && law.id.length > 128) {
      let nextId = makeSafeLawId(law.id);
      let counter = 1;
      while (laws.some(l => l !== law && l.id === nextId)) {
        nextId = `${makeSafeLawId(law.id)}-${counter}`;
        counter += 1;
      }
      lawIdMap.set(law.id, nextId);
      law.id = nextId;
    }
  });

  const migratedNotes: Record<string, any> = {};
  Object.entries(notes).forEach(([sectionId, note]) => {
    const nextSectionId = lawIdMap.get(sectionId) || sectionId;
    migratedNotes[nextSectionId] = { ...note, sectionId: nextSectionId };
  });

  const migratedColors: Record<string, string> = {};
  Object.entries(colorOverrides).forEach(([bookId, color]) => {
    migratedColors[bookIdMap.get(bookId) || bookId] = color;
  });

  if (bookIdMap.size > 0) {
    localStorage.setItem(CUSTOM_BOOKS_KEY, JSON.stringify(books));
    localStorage.setItem(CUSTOM_LAWS_KEY, JSON.stringify(laws));
    localStorage.setItem(NOTES_KEY, JSON.stringify(migratedNotes));
    localStorage.setItem(BOOK_COLORS_OVERRIDE_KEY, JSON.stringify(migratedColors));
    console.info(`[ID migration] repaired ${bookIdMap.size} legacy book ID(s)`);
  } else if (lawIdMap.size > 0) {
    localStorage.setItem(CUSTOM_LAWS_KEY, JSON.stringify(laws));
    localStorage.setItem(NOTES_KEY, JSON.stringify(migratedNotes));
  }

  localStorage.setItem(MIGRATION_KEY, 'done');
};
