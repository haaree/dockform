export function legibleAccent(hex: string, dark: boolean): string {
  if (!hex || hex[0] !== '#' || hex.length < 7) return hex;
  const r = parseInt(hex.substr(1, 2), 16);
  const g = parseInt(hex.substr(3, 2), 16);
  const b = parseInt(hex.substr(5, 2), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const mix = (c: number, target: number, amt: number) => Math.round(c + (target - c) * amt);
  if (dark && lum < 0.4) {
    const amt = 0.6;
    return '#' + [mix(r, 255, amt), mix(g, 255, amt), mix(b, 255, amt)].map(v => v.toString(16).padStart(2, '0')).join('');
  }
  if (!dark && lum > 0.82) {
    const amt = 0.55;
    return '#' + [mix(r, 0, amt), mix(g, 0, amt), mix(b, 0, amt)].map(v => v.toString(16).padStart(2, '0')).join('');
  }
  return hex;
}

export function getThemeVars(accent: string, dark: boolean) {
  return {
    '--accent': accent,
    '--bg': dark ? '#111113' : '#FAFAF8',
    '--surface': dark ? '#1C1C1E' : '#FFFFFF',
    '--surface2': dark ? '#242426' : '#F4F4F5',
    '--border': dark ? '#303036' : '#E4E4E7',
    '--text': dark ? '#F9FAFB' : '#09090B',
    '--muted': '#71717A',
    '--muted2': dark ? '#52525B' : '#A1A1AA',
  } as Record<string, string>;
}

export const ACCENT_PRESETS = [
  { name: 'Royal Blue', color: '#2563EB' },
  { name: 'Emerald', color: '#059669' },
  { name: 'Deep Purple', color: '#7C3AED' },
  { name: 'Teal', color: '#0D9488' },
  { name: 'Navy', color: '#1E3A5F' },
  { name: 'Slate', color: '#64748B' },
  { name: 'Silver', color: '#94A3B8' },
  { name: 'Charcoal', color: '#1C1C1E' },
] as const;
