import { MemorizationDeck, MemorizationItem, MemorizationStats } from '../types';
import { calculateNextSRS, ReviewRating } from './srsEngine';

const MEMO_DECKS_KEY = 'thai_law_mate_memo_decks';
const MEMO_ITEMS_KEY = 'thai_law_mate_memo_items';
const MEMO_STATS_KEY = 'thai_law_mate_memo_stats';

const readJson = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = <T,>(key: string, data: T) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn('Storage write warning:', e);
  }
};

type MemoListener = () => void;
const listeners: Set<MemoListener> = new Set();
export const onMemorizeDataChanged = (fn: MemoListener) => {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
};
const notify = () => listeners.forEach(fn => fn());

/**
 * Fetch all decks (reads from local cache first, then refreshes from Neon)
 */
export async function fetchDecks(): Promise<MemorizationDeck[]> {
  const local = readJson<MemorizationDeck[]>(MEMO_DECKS_KEY, []);
  
  try {
    const res = await fetch('/api/memorize?view=decks');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.decks)) {
        writeJson(MEMO_DECKS_KEY, data.decks);
        notify();
        return data.decks;
      }
    }
  } catch (e) {
    console.warn('Fetch decks from Neon offline fallback:', e);
  }

  return local;
}

export function getLocalDecks(): MemorizationDeck[] {
  return readJson<MemorizationDeck[]>(MEMO_DECKS_KEY, []);
}

/**
 * Fetch items for a specific deck or all items
 */
export async function fetchItems(deckId?: string): Promise<MemorizationItem[]> {
  const local = readJson<MemorizationItem[]>(MEMO_ITEMS_KEY, []);
  
  try {
    const url = deckId ? `/api/memorize?deckId=${encodeURIComponent(deckId)}` : '/api/memorize';
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.items)) {
        // Merge with local items
        const itemMap = new Map<string, MemorizationItem>();
        local.forEach(i => itemMap.set(i.id, i));
        data.items.forEach((i: MemorizationItem) => itemMap.set(i.id, i));
        const merged = Array.from(itemMap.values());
        writeJson(MEMO_ITEMS_KEY, merged);
        if (data.decks) writeJson(MEMO_DECKS_KEY, data.decks);
        if (data.stats) writeJson(MEMO_STATS_KEY, data.stats);
        notify();
        return deckId ? merged.filter(i => i.deckId === deckId) : merged;
      }
    }
  } catch (e) {
    console.warn('Fetch items from Neon offline fallback:', e);
  }

  return deckId ? local.filter(i => i.deckId === deckId) : local;
}

export function getLocalItems(deckId?: string): MemorizationItem[] {
  const all = readJson<MemorizationItem[]>(MEMO_ITEMS_KEY, []);
  return deckId ? all.filter(i => i.deckId === deckId) : all;
}

/**
 * Fetch items that are due for review today
 */
export async function fetchDueItems(): Promise<MemorizationItem[]> {
  const all = await fetchItems();
  const now = Date.now();
  return all.filter(i => !i.nextReviewAt || new Date(i.nextReviewAt).getTime() <= now);
}

export function getLocalDueItems(): MemorizationItem[] {
  const all = getLocalItems();
  const now = Date.now();
  return all.filter(i => !i.nextReviewAt || new Date(i.nextReviewAt).getTime() <= now);
}

export function getMemorizeStats(): MemorizationStats {
  return readJson<MemorizationStats>(MEMO_STATS_KEY, { total: 0, dueToday: 0, mastered: 0, learning: 0 });
}

/**
 * Record a review attempt and compute SM-2 Spaced Repetition update
 */
export async function recordReview(
  itemId: string,
  quality: ReviewRating,
  mode = 'recall',
  timeSpentMs = 0
): Promise<MemorizationItem | undefined> {
  const localItems = readJson<MemorizationItem[]>(MEMO_ITEMS_KEY, []);
  const itemIndex = localItems.findIndex(i => i.id === itemId);
  if (itemIndex < 0) return undefined;

  const current = localItems[itemIndex];
  const srs = calculateNextSRS(current, quality);

  const updated: MemorizationItem = {
    ...current,
    repetitions: srs.repetitions,
    intervalDays: srs.intervalDays,
    easeFactor: srs.easeFactor,
    streak: srs.streak,
    lastQuality: quality,
    lastReviewedAt: new Date().toISOString(),
    nextReviewAt: srs.nextReviewAt,
    status: srs.status
  };

  localItems[itemIndex] = updated;
  writeJson(MEMO_ITEMS_KEY, localItems);
  notify();

  // Async send to Neon
  fetch('/api/memorize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'review',
      payload: { itemId, quality, mode, timeSpentMs }
    })
  }).catch(e => console.warn('Sync review to Neon warning:', e));

  return updated;
}

/**
 * Add a section to a deck
 */
export async function addSectionToDeck(deckId: string, sectionId: string, title?: string): Promise<boolean> {
  try {
    const res = await fetch('/api/memorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'add_item',
        payload: { deckId, sectionId, title }
      })
    });
    if (res.ok) {
      await fetchItems(deckId);
      return true;
    }
  } catch (e) {
    console.warn('Add section to deck error:', e);
  }
  return false;
}

/**
 * Save or create a custom deck
 */
export async function saveDeck(deck: Partial<MemorizationDeck> & { name: string }): Promise<string | undefined> {
  try {
    const res = await fetch('/api/memorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'save_deck',
        payload: deck
      })
    });
    if (res.ok) {
      const data = await res.json();
      await fetchDecks();
      return data.deckId;
    }
  } catch (e) {
    console.warn('Save deck error:', e);
  }
  return undefined;
}

/**
 * Delete a deck
 */
export async function deleteDeck(deckId: string): Promise<boolean> {
  try {
    const res = await fetch('/api/memorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'delete_deck',
        payload: { deckId }
      })
    });
    if (res.ok) {
      const localDecks = getLocalDecks().filter(d => d.id !== deckId);
      writeJson(MEMO_DECKS_KEY, localDecks);
      const localItems = getLocalItems().filter(i => i.deckId !== deckId);
      writeJson(MEMO_ITEMS_KEY, localItems);
      notify();
      return true;
    }
  } catch (e) {
    console.warn('Delete deck error:', e);
  }
  return false;
}

/**
 * Background initial loader
 */
if (typeof window !== 'undefined') {
  setTimeout(() => {
    fetchDecks().catch(() => {});
    fetchItems().catch(() => {});
  }, 2000);
}
