import { LawBook, LawSection, UserNote } from '../types';

const CUSTOM_LAWS_KEY = 'thai_law_mate_custom_laws';
const CUSTOM_BOOKS_KEY = 'thai_law_mate_custom_books';
const NOTES_KEY = 'thai_law_mate_notes';

const readJson = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = <T,>(key: string, value: T) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const postJson = async (url: string, body: unknown) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `${url}: HTTP ${response.status}`);
  }
  return response.json().catch(() => ({}));
};

export async function bootstrapNeonData(): Promise<void> {
  if (typeof window === 'undefined') return;

  const [booksResponse, tombstoneResponse, lawsResponse, notesResponse] = await Promise.all([
    fetch('/api/books'),
    fetch('/api/books?includeDeleted=true'),
    fetch('/api/laws?limit=50000'),
    fetch('/api/notes')
  ]);

  if (!booksResponse.ok || !tombstoneResponse.ok || !lawsResponse.ok || !notesResponse.ok) {
    throw new Error(
      `Neon bootstrap failed: books=${booksResponse.status}, tombstones=${tombstoneResponse.status}, laws=${lawsResponse.status}, notes=${notesResponse.status}`
    );
  }

  const remoteBooks = await booksResponse.json() as LawBook[];
  const allKnownBooks = await tombstoneResponse.json() as { id: string; isDeleted: boolean }[];
  const remoteLaws = await lawsResponse.json() as LawSection[];
  const remoteNotes = await notesResponse.json() as Record<string, UserNote>;

  const cloudBooks = remoteBooks.filter(book => book.isCustom);
  const cloudLaws = remoteLaws.filter(law => law.isCustom);
  const localBooks = readJson<LawBook[]>(CUSTOM_BOOKS_KEY, []);
  const localLaws = readJson<LawSection[]>(CUSTOM_LAWS_KEY, []);
  const localNotes = readJson<Record<string, UserNote>>(NOTES_KEY, {});

  const knownBookIds = new Set(allKnownBooks.map(b => b.id));
  const deletedBookIds = new Set(allKnownBooks.filter(b => b.isDeleted).map(b => b.id));

  // Push up only books the server has NEVER seen before — never resurrect a tombstoned one.
  const cloudBookIds = new Set(cloudBooks.map(book => book.id));
  const localOnlyBooks = localBooks.filter(book => !knownBookIds.has(book.id));
  if (localOnlyBooks.length) {
    await Promise.all(localOnlyBooks.map(book => postJson('/api/books', book)));
  }

  const cloudLawIds = new Set(cloudLaws.map(law => law.id));
  const localOnlyLaws = localLaws.filter(law => !cloudLawIds.has(law.id));
  if (localOnlyLaws.length) {
    await postJson('/api/laws', localOnlyLaws);
  }

  // Purge any book/section belonging to a book that's been tombstoned elsewhere.
  const mergedBooks = [...cloudBooks, ...localOnlyBooks].filter(b => !deletedBookIds.has(b.id));
  const mergedLaws = [...cloudLaws, ...localOnlyLaws].filter(l => !deletedBookIds.has(l.bookId));

  writeJson(CUSTOM_BOOKS_KEY, mergedBooks);
  writeJson(CUSTOM_LAWS_KEY, mergedLaws);

  if (Object.keys(remoteNotes).length > 0) {
    writeJson(NOTES_KEY, remoteNotes);
  } else if (Object.keys(localNotes).length > 0) {
    await Promise.all(Object.values(localNotes).map(note => postJson('/api/notes', note)));
    writeJson(NOTES_KEY, localNotes);
  }
}
