const PENDING_KEY = 'thai_law_mate_pending_sync';
const MAX_ATTEMPTS_PER_FLUSH = 3;
const RETRY_INTERVAL_MS = 30000;

export interface PendingOperation {
  id: string;
  url: string;
  method: 'POST' | 'DELETE';
  body?: unknown;
  label: string;
  attempts: number;
}

export interface SyncState {
  pending: number;
  syncing: boolean;
  lastError: string | null;
  lastSyncedAt: number | null;
}

type SyncListener = (state: SyncState) => void;

const listeners = new Set<SyncListener>();
let syncing = false;
let lastError: string | null = null;
let lastSyncedAt: number | null = null;
let retryTimer: ReturnType<typeof setInterval> | null = null;

const readQueue = (): PendingOperation[] => {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    return raw ? JSON.parse(raw) as PendingOperation[] : [];
  } catch {
    return [];
  }
};

const writeQueue = (queue: PendingOperation[]) => {
  localStorage.setItem(PENDING_KEY, JSON.stringify(queue));
};

export const getSyncState = (): SyncState => ({
  pending: readQueue().length,
  syncing,
  lastError,
  lastSyncedAt
});

const notify = () => {
  const state = getSyncState();
  listeners.forEach(listener => listener(state));
};

export const onSyncStateChange = (listener: SyncListener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

export class SyncRequestError extends Error {}

/**
 * Performs an API call and fails loudly when the response is not usable JSON.
 * A Vite dev server without the API middleware answers `/api/*` with index.html,
 * which would otherwise look like a successful sync.
 */
export const syncFetch = async (url: string, init?: RequestInit): Promise<unknown> => {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch {
    throw new SyncRequestError('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ (ออฟไลน์หรือ API ไม่ทำงาน)');
  }

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? await response.json().catch(() => null) as { error?: string } | null : null;

  if (!response.ok) {
    if (response.status === 503) {
      throw new SyncRequestError('เซิร์ฟเวอร์ยังไม่ได้ตั้งค่า DATABASE_URL ของ Neon');
    }
    throw new SyncRequestError(payload?.error || `${url} ตอบกลับ HTTP ${response.status}`);
  }

  if (!isJson) {
    throw new SyncRequestError(
      `${url} ไม่ได้ตอบกลับเป็น JSON — ยังไม่มี API ทำงานอยู่ (รัน npm run dev หรือ deploy บน Vercel)`
    );
  }

  return payload;
};

const runOperation = async (op: PendingOperation) => {
  await syncFetch(op.url, {
    method: op.method,
    headers: op.body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: op.body === undefined ? undefined : JSON.stringify(op.body)
  });
};

export const flushPendingSync = async (): Promise<SyncState> => {
  if (syncing) return getSyncState();
  if (readQueue().length === 0) return getSyncState();

  syncing = true;
  notify();

  try {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS_PER_FLUSH; attempt++) {
      const queue = readQueue();
      if (queue.length === 0) break;

      const remaining: PendingOperation[] = [];
      let error: string | null = null;

      for (const op of queue) {
        try {
          await runOperation(op);
          lastSyncedAt = Date.now();
        } catch (e) {
          error = e instanceof Error ? e.message : 'ซิงค์ไม่สำเร็จ';
          remaining.push({ ...op, attempts: op.attempts + 1 });
        }
      }

      writeQueue(remaining);
      lastError = remaining.length ? error : null;
      notify();

      if (remaining.length === 0) break;
      if (attempt < MAX_ATTEMPTS_PER_FLUSH) await delay(attempt * 1000);
    }
  } finally {
    syncing = false;
    notify();
  }

  return getSyncState();
};

export const queueSync = (op: Omit<PendingOperation, 'id' | 'attempts'>) => {
  const queue = readQueue().filter(existing => !(existing.url === op.url && existing.method === op.method && sameTarget(existing, op)));
  queue.push({ ...op, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, attempts: 0 });
  writeQueue(queue);
  notify();
  void flushPendingSync();
};

const sameTarget = (a: PendingOperation, b: Omit<PendingOperation, 'id' | 'attempts'>): boolean => {
  const idOf = (body: unknown) => (body && typeof body === 'object' && 'id' in body ? (body as { id?: string }).id : undefined);
  const aId = idOf(a.body);
  const bId = idOf(b.body);
  return Boolean(aId && bId && aId === bId);
};

export const clearPendingSync = () => {
  writeQueue([]);
  lastError = null;
  notify();
};

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { void flushPendingSync(); });
  retryTimer = setInterval(() => {
    if (readQueue().length > 0) void flushPendingSync();
  }, RETRY_INTERVAL_MS);
  window.addEventListener('beforeunload', () => { if (retryTimer) clearInterval(retryTimer); });
}
