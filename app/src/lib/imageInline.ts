// Downloaded HTML reports are opened offline with no auth session, so any
// "/api/files/:key" reference must be inlined as a base64 data URL at
// generation time — an <img src="/api/files/...">  would 404 once the file
// is no longer opened from within the running app.
export async function toInlineDataUrl(src: string | undefined): Promise<string> {
  if (!src) return '';
  if (src.startsWith('data:')) return src;
  if (!src.startsWith('/api/files/')) return src;
  try {
    const res = await fetch(src);
    if (!res.ok) return '';
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return '';
  }
}

// Finds every "/api/files/:key" reference inside a value and resolves them all,
// returning a lookup map from reference -> inline data URL.
export async function buildInlineImageMap(values: (string | undefined)[]): Promise<Map<string, string>> {
  const refs = new Set<string>();
  const pattern = /\/api\/files\/[A-Za-z0-9-]+\.[A-Za-z0-9]+/g;
  for (const v of values) {
    if (!v) continue;
    const matches = v.match(pattern);
    if (matches) matches.forEach(m => refs.add(m));
  }
  const map = new Map<string, string>();
  await Promise.all([...refs].map(async (ref) => {
    map.set(ref, await toInlineDataUrl(ref));
  }));
  return map;
}

export function applyInlineImageMap(text: string, map: Map<string, string>): string {
  let result = text;
  for (const [ref, dataUrl] of map) {
    if (dataUrl) result = result.split(ref).join(dataUrl);
  }
  return result;
}
