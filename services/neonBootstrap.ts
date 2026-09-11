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

  const [booksResponse, lawsResponse, notesResponse] = await Promise.all([
    fetch('/api/books'),
    fetch('/api/laws?limit=50000'),
    fetch('/api/notes')
  ]);

  if (!booksResponse.ok || !lawsResponse.ok || !notesResponse.ok) {
    throw new Error(
      `Neon bootstrap failed: books=${booksResponse.status}, laws=${lawsResponse.status}, notes=${notesResponse.status}`
    );
  }

  const remoteBooks = await booksResponse.json() as LawBook[];
  const remoteLaws = await lawsResponse.json() as LawSection[];
  const remoteNotes = await notesResponse.json() as Record<string, UserNote>;

  const cloudBooks = remoteBooks.filter(book => book.isCustom);
  const cloudLaws = remoteLaws.filter(law => law.isCustom);
  const localBooks = readJson<LawBook[]>(CUSTOM_BOOKS_KEY, []);
  const localLaws = readJson<LawSection[]>(CUSTOM_LAWS_KEY, []);
  const localNotes = readJson<Record<string, UserNote>>(NOTES_KEY, {});

  // Merge local-only records into the cloud first so unsynced data is not lost.
  const cloudBookIds = new Set(cloudBooks.map(book => book.id));
  const localOnlyBooks = localBooks.filter(book => !cloudBookIds.has(book.id));
  if (localOnlyBooks.length) {
    await Promise.all(localOnlyBooks.map(book => postJson('/api/books', book)));
  }

  const cloudLawIds = new Set(cloudLaws.map(law => law.id));
  const localOnlyLaws = localLaws.filter(law => !cloudLawIds.has(law.id));
  if (localOnlyLaws.length) {
    await postJson('/api/laws', localOnlyLaws);
  }

  const mergedBooks = [...cloudBooks, ...localOnlyBooks];
  const mergedLaws = [...cloudLaws, ...localOnlyLaws];

  // Neon is the shared source of truth after a successful fetch/sync.
  writeJson(CUSTOM_BOOKS_KEY, mergedBooks);
  writeJson(CUSTOM_LAWS_KEY, mergedLaws);

  if (Object.keys(remoteNotes).length > 0) {
    writeJson(NOTES_KEY, remoteNotes);
  } else if (Object.keys(localNotes).length > 0) {
    await Promise.all(Object.values(localNotes).map(note => postJson('/api/notes', note)));
    writeJson(NOTES_KEY, localNotes);
  }
}
