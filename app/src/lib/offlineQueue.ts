// Persists a form response locally when it can't reach the server (no connectivity, or a
// transient network failure), and replays the queue once a connection is confirmed. Backed
// by IndexedDB rather than the Zustand store because the store gets wiped on logout/401
// (see api.ts's setUnauthorizedHandler) -- a token expiring mid-sync must never take queued
// field data down with it.
const DB_NAME = 'dockform-offline';
const DB_VERSION = 2;
const STORE_NAME = 'queued_responses';
const DRAFT_STORE_NAME = 'local_drafts';

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
