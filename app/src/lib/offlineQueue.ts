// Persists a form response locally when it can't reach the server (no connectivity, or a
// transient network failure), and replays the queue once a connection is confirmed. Backed
// by IndexedDB rather than the Zustand store because the store gets wiped on logout/401
// (see api.ts's setUnauthorizedHandler) -- a token expiring mid-sync must never take queued
// field data down with it.
const DB_NAME = 'dockform-offline';
const DB_VERSION = 3;
const STORE_NAME = 'queued_responses';
const DRAFT_STORE_NAME = 'local_drafts';
const FORM_CACHE_STORE = 'form_cache';
const RESPONSE_CACHE_STORE = 'response_cache';
const LISTS_STORE = 'lists_cache';

export interface QueuedResponse {
  id: string; // client-generated, stable across retries -- lets a partial sync resume without duplicating
  kind: 'create' | 'update';
  responseId?: string; // only for kind 'update'
  formId: string;
  values: Record<string, string>;
  status: string;
  assignedToId?: string;
  clientLocalDate: string;
  queuedAt: string;
  attempts: number;
  lastError?: string;
  // Set once the server has rejected the sync with a real verdict (not a network failure) --
  // e.g. a 400 from the daily-form date window, or a 403/404. Retrying that forever would
  // never succeed and would show "waiting to sync" indefinitely for a response that's
  // actually stuck; kept in the store (not deleted) so it's inspectable rather than silently
  // lost, but excluded from the retry loop and the pending-count badge.
  failedPermanently?: boolean;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(DRAFT_STORE_NAME)) {
        db.createObjectStore(DRAFT_STORE_NAME, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(FORM_CACHE_STORE)) {
        db.createObjectStore(FORM_CACHE_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(RESPONSE_CACHE_STORE)) {
        db.createObjectStore(RESPONSE_CACHE_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(LISTS_STORE)) {
        db.createObjectStore(LISTS_STORE, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore<T>(name: string, mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(name, mode);
    const store = tx.objectStore(name);
    const req = fn(store);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function enqueueResponse(entry: Omit<QueuedResponse, 'id' | 'queuedAt' | 'attempts'>): Promise<QueuedResponse> {
  const full: QueuedResponse = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    queuedAt: new Date().toISOString(),
    attempts: 0,
  };
  await withStore(STORE_NAME, 'readwrite', (store) => store.add(full));
  return full;
}

export async function listQueuedResponses(): Promise<QueuedResponse[]> {
  return withStore(STORE_NAME, 'readonly', (store) => store.getAll());
}

export async function removeQueuedResponse(id: string): Promise<void> {
  await withStore(STORE_NAME, 'readwrite', (store) => store.delete(id));
}

export async function updateQueuedResponse(entry: QueuedResponse): Promise<void> {
  await withStore(STORE_NAME, 'readwrite', (store) => store.put(entry));
}

export async function queuedCount(): Promise<number> {
  return (await listQueuedResponses()).filter(e => !e.failedPermanently).length;
}

// A lightweight local-only snapshot of in-progress answers, separate from the queued-response
// store above. Auto-save writes here (overwrite-in-place via `put` on a fixed key -- never
// `add` -- so repeated saves every 2s can't accumulate entries) purely so a closed tab/crash
// while offline doesn't lose an unsubmitted fill; it is NOT synced to the server on its own
// and never becomes a queued create/update. It's read back once, on reopening the same form,
// then cleared once the user's answers are loaded from it or the response is actually
// submitted/saved online.
export interface LocalDraft {
  key: string; // `${formId}:${responseId || 'new'}`
  formId: string;
  responseId: string | null;
  values: Record<string, string>;
  savedAt: string;
}

export function localDraftKey(formId: string, responseId: string | null): string {
  return `${formId}:${responseId || 'new'}`;
}

export async function saveLocalDraft(formId: string, responseId: string | null, values: Record<string, string>): Promise<void> {
  const draft: LocalDraft = { key: localDraftKey(formId, responseId), formId, responseId, values, savedAt: new Date().toISOString() };
  await withStore(DRAFT_STORE_NAME, 'readwrite', (store) => store.put(draft));
}

export async function getLocalDraft(formId: string, responseId: string | null): Promise<LocalDraft | undefined> {
  return withStore(DRAFT_STORE_NAME, 'readonly', (store) => store.get(localDraftKey(formId, responseId)));
}

export async function clearLocalDraft(formId: string, responseId: string | null): Promise<void> {
  await withStore(DRAFT_STORE_NAME, 'readwrite', (store) => store.delete(localDraftKey(formId, responseId)));
}

// Durable, deliberate cache of a form's own definition and a resumable draft's saved values --
// distinct from relying on the service worker's opportunistic HTTP cache, which only holds
// whatever GET requests happened to fire while online and offers no guarantee that a specific
// form/response was ever actually fetched (or wasn't evicted). Written every time these are
// successfully loaded online, so a form opened online at least once is deterministically
// available offline afterwards, not "maybe, if the browser felt like caching it."
export interface CachedForm {
  id: string;
  fieldDefs: unknown[];
  savedAt: string;
}

export async function cacheForm(id: string, fieldDefs: unknown[]): Promise<void> {
  await withStore(FORM_CACHE_STORE, 'readwrite', (store) => store.put({ id, fieldDefs, savedAt: new Date().toISOString() } satisfies CachedForm));
}

export async function getCachedForm(id: string): Promise<CachedForm | undefined> {
  return withStore(FORM_CACHE_STORE, 'readonly', (store) => store.get(id));
}

export interface CachedResponse {
  id: string;
  values: Record<string, string>;
  status: string;
  savedAt: string;
}

export async function cacheResponse(id: string, values: Record<string, string>, status: string): Promise<void> {
  await withStore(RESPONSE_CACHE_STORE, 'readwrite', (store) => store.put({ id, values, status, savedAt: new Date().toISOString() } satisfies CachedResponse));
}

export async function getCachedResponse(id: string): Promise<CachedResponse | undefined> {
  return withStore(RESPONSE_CACHE_STORE, 'readonly', (store) => store.get(id));
}

// The forms list and the responses list are what make the app navigable at all on a cold
// boot with no connection -- without them there's nothing to tap into. Same write-through
// durable-cache treatment as an individual form/response: written on every successful online
// fetch, read back only when that fetch fails with a network error.
export async function cacheList(key: 'forms' | 'responses', items: unknown[]): Promise<void> {
  await withStore(LISTS_STORE, 'readwrite', (store) => store.put({ key, items, savedAt: new Date().toISOString() }));
}

export async function getCachedList<T = unknown>(key: 'forms' | 'responses'): Promise<T[] | undefined> {
  const row = await withStore<{ key: string; items: T[] } | undefined>(LISTS_STORE, 'readonly', (store) => store.get(key));
  return row?.items;
}

// navigator.onLine only reflects whether the device has *a* network interface up -- it can
// read true on a WiFi connection with no internet (captive portal, no ISP link), so a real
// sync attempt is gated on this actually reaching the server, not just the flag.
export async function isReallyOnline(): Promise<boolean> {
  if (!navigator.onLine) return false;
  try {
    const res = await fetch('/api/health', { method: 'GET', cache: 'no-store' });
    return res.ok;
  } catch {
    return false;
  }
}
