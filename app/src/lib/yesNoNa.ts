// Detects radio/dropdown fields whose full option set is exactly Yes/No or Yes/No/NA,
// so they can be rendered as colored pills (green/red/gray) instead of plain radio
// buttons or select text — both in the Filler and in read-only surfaces (reviewer view,
// FormResponses, exports) so the color carries through to reports.
const YES_NO_SETS = [
  ['Yes', 'No'],
  ['Yes', 'No', 'NA'],
  ['Yes', 'No', 'Not Applicable'],
];

export function isYesNoOptions(options: string[]): boolean {
  return YES_NO_SETS.some(set => set.length === options.length && set.every((v, i) => v === options[i]));
}

export function yesNoColor(value: string): { bg: string; fg: string } | null {
  if (value === 'Yes') return { bg: '#DCFCE7', fg: '#15803D' };
  if (value === 'No') return { bg: '#FEE2E2', fg: '#DC2626' };
  if (value === 'NA' || value === 'Not Applicable') return { bg: '#F3F4F6', fg: '#6B7280' };
  return null;
}
