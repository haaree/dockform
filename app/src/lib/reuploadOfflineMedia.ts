import { api } from './api';

// Offline, uploadOrFallback (FormFiller.tsx) can't reach object storage, so it falls back to
// embedding the raw base64 data URL directly as the field's value. That's fine for local
// capture, but syncing those data URLs to the server as-is would permanently bloat every
// affected ResponseValue row with a multi-MB inline image forever (object storage exists
// specifically to avoid that). Before syncing a queued response, walk every value -- including
// data URLs nested inside JSON blobs (beforeafter's {before,after}, photochecklist's
// attempts[].photo, and repeatable-section instances' own values maps) -- upload each one, and
// replace it with the returned /api/files/ ref, so a synced response ends up identical in shape
// to one that uploaded successfully online at capture time.
const DATA_URL_RE = /^data:[^;]+;base64,/;

async function uploadIfDataUrl(value: string): Promise<string> {
  if (typeof value !== 'string' || !DATA_URL_RE.test(value)) return value;
  try {
    const { url } = await api.uploadPhoto(value);
    return url;
  } catch {
    return value; // still offline or upload failed -- leave embedded, sync will retry later
  }
}

async function walkJsonValue(raw: string): Promise<string> {
  let parsed: any;
  try { parsed = JSON.parse(raw); } catch { return uploadIfDataUrl(raw); }

  if (Array.isArray(parsed)) {
    // Repeatable-section instances: [{ id, values: { fieldId: value, ... }, label? }, ...]
    for (const inst of parsed) {
      if (inst && typeof inst === 'object' && inst.values && typeof inst.values === 'object') {
        for (const key of Object.keys(inst.values)) {
          inst.values[key] = await uploadIfDataUrl(inst.values[key]);
        }
      }
    }
    return JSON.stringify(parsed);
  }

  if (parsed && typeof parsed === 'object') {
    // beforeafter: { before, after, ... }
    if ('before' in parsed || 'after' in parsed) {
      if (parsed.before) parsed.before = await uploadIfDataUrl(parsed.before);
      if (parsed.after) parsed.after = await uploadIfDataUrl(parsed.after);
      return JSON.stringify(parsed);
    }
    // photochecklist: { items, attempts: [{ photo, ... }] }
    if (Array.isArray(parsed.attempts)) {
      for (const attempt of parsed.attempts) {
        if (attempt?.photo) attempt.photo = await uploadIfDataUrl(attempt.photo);
      }
      return JSON.stringify(parsed);
    }
  }
  return raw;
}

export async function reuploadOfflineMedia(values: Record<string, string>): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(values)) {
    if (typeof value !== 'string') { result[key] = value; continue; }
    result[key] = DATA_URL_RE.test(value) ? await uploadIfDataUrl(value) : await walkJsonValue(value);
  }
  return result;
}
