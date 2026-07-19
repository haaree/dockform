import { api } from './api';
import { listQueuedResponses, removeQueuedResponse, updateQueuedResponse, isReallyOnline, type QueuedResponse } from './offlineQueue';
import { reuploadOfflineMedia } from './reuploadOfflineMedia';

// Drains the local offline queue against the server once connectivity is confirmed. Each
// entry is synced independently (one failure doesn't block the rest), and each carries
// offlineSync:true so the server's daily-form date gate checks against the date it was
// actually captured, not the date it happens to sync (see isWithinDailyWindowForSync).
let syncing = false;
const listeners = new Set<(pending: number) => void>();

export function onQueueChange(fn: (pending: number) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

async function notifyListeners() {
  const entries = await listQueuedResponses();
  const pending = entries.filter(e => !e.failedPermanently).length;
  listeners.forEach(fn => fn(pending));
}

export async function syncQueue(): Promise<{ synced: number; failed: number }> {
  if (syncing) return { synced: 0, failed: 0 };
  syncing = true;
  let synced = 0;
  let failed = 0;
  try {
    if (!(await isReallyOnline())) return { synced: 0, failed: 0 };
    const entries = (await listQueuedResponses()).filter(e => !e.failedPermanently);
    for (const entry of entries) {
      try {
        await syncOne(entry);
        await removeQueuedResponse(entry.id);
        synced++;
      } catch (err: any) {
        failed++;
        // A TypeError means the request never reached the server (still offline, or the
        // connection dropped mid-sync) -- worth retrying. Anything else is a real server
        // verdict (e.g. the daily-form date window rejecting a sync that's lagged capture
        // by more than the accepted window, or a 403/404) that will never succeed on
        // retry -- mirrors the same discriminator submitResponse uses for the initial queue
        // decision. Marked permanent rather than deleted so it stays inspectable.
        const isPermanent = !(err instanceof TypeError);
        await updateQueuedResponse({ ...entry, attempts: entry.attempts + 1, lastError: err?.message || 'Sync failed', failedPermanently: isPermanent || undefined });
      }
    }
  } finally {
    syncing = false;
    await notifyListeners();
  }
  return { synced, failed };
}

async function syncOne(entry: QueuedResponse): Promise<void> {
  const values = await reuploadOfflineMedia(entry.values);
  const payload = {
    formId: entry.formId, values, status: entry.status,
    assignedToId: entry.assignedToId, clientLocalDate: entry.clientLocalDate,
    offlineSync: true,
  };
  if (entry.kind === 'update' && entry.responseId) {
    await api.updateResponse(entry.responseId, payload);
  } else {
    await api.createResponse(payload);
  }
}

let started = false;
export function startAutoSync() {
  if (started) return;
  started = true;
  window.addEventListener('online', () => { syncQueue(); });
  // navigator.onLine firing 'online' isn't fully reliable (some browsers/networks don't
  // fire it consistently on reconnect), so also poll at a low frequency as a backstop.
  setInterval(() => { syncQueue(); }, 30000);
  notifyListeners();
}
