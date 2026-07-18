// Every field can carry an optional note and a photo the filler attaches while answering
// (separate from the approval workflow's per-field manager comments). Stored as sidecar
// keys in the same flat values map (or a SectionInstance's values map for repeatable
// sections) rather than folded into the field's own value, so every existing field type's
// value-parsing logic is untouched. Centralized here so every reader/writer agrees on the
// exact key format.
export function noteKey(fieldId: string): string {
  return `${fieldId}__note`;
}

export function mediaKey(fieldId: string): string {
  return `${fieldId}__media`;
}
