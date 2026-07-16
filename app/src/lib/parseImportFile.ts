// Reads a user-attached .xlsx/.csv/.txt file into a plain-text summary that gets folded
// into the AI generate-form prompt as grounding context (e.g. an existing checklist
// exported from Excel, or a plain list of items). Never sent as a file/binary to the
// server — converted to text client-side so the API surface stays a single string field.

const MAX_CHARS = 12000; // keeps the prompt (and Claude's context) bounded regardless of file size

function truncate(text: string): string {
  return text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) + '\n…(truncated)' : text;
}

async function parseSpreadsheet(file: File): Promise<string> {
  const XLSX = await import('xlsx');
  const buf = await file.arrayBuffer();
  const workbook = XLSX.read(buf, { type: 'array' });
  const parts: string[] = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    if (csv.trim()) parts.push(`Sheet "${sheetName}":\n${csv.trim()}`);
  }
  return parts.join('\n\n');
}

function parseText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

export async function parseImportFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  const text = name.endsWith('.xlsx') || name.endsWith('.xls')
    ? await parseSpreadsheet(file)
    : await parseText(file);
  return truncate(text.trim());
}

export const IMPORT_ACCEPT = '.xlsx,.xls,.csv,.txt';
