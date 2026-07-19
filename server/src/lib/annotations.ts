// Mirrors the client's lib/fieldAnnotations.ts key convention: a top-level field's own
// note/photo is sent by the client as sidecar keys inside the flat `values` map
// (`${fieldId}__note`, `${fieldId}__media`) rather than as a real ResponseValue row --
// ResponseValue.fieldId is a UUID FK to FormField and those sidecar keys aren't valid
// field ids. Split them out before writing ResponseValue rows, and re-inject them on read
// so every client reader keeps working against the same flat-map shape it always has.
const NOTE_SUFFIX = '__note';
const MEDIA_SUFFIX = '__media';

export interface SplitValues {
  fieldValues: Record<string, string>;
  annotations: { fieldId: string; kind: 'note' | 'media'; value: string }[];
}

export function splitAnnotations(values: Record<string, string>): SplitValues {
  const fieldValues: Record<string, string> = {};
  const annotations: { fieldId: string; kind: 'note' | 'media'; value: string }[] = [];
  for (const [key, value] of Object.entries(values)) {
    if (key.endsWith(NOTE_SUFFIX)) {
      annotations.push({ fieldId: key.slice(0, -NOTE_SUFFIX.length), kind: 'note', value });
    } else if (key.endsWith(MEDIA_SUFFIX)) {
      annotations.push({ fieldId: key.slice(0, -MEDIA_SUFFIX.length), kind: 'media', value });
    } else {
      fieldValues[key] = value;
    }
  }
  return { fieldValues, annotations };
}

export function mergeAnnotations(values: Record<string, string>, annotations: { fieldId: string; kind: string; value: string }[]): Record<string, string> {
  const merged = { ...values };
  for (const a of annotations) {
    const suffix = a.kind === 'note' ? NOTE_SUFFIX : MEDIA_SUFFIX;
    merged[`${a.fieldId}${suffix}`] = a.value;
  }
  return merged;
}
