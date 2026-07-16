import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { getObjectAsDataUrl } from '../lib/storage.js';

const router = Router();
const MODEL = 'claude-haiku-4-5-20251001';

function getClient(): Anthropic | null {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  return new Anthropic({ apiKey: key });
}

function parseDataUrl(dataUrl: string): { mediaType: string; data: string } | null {
  const match = /^data:(image\/[a-zA-Z+]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  return { mediaType: match[1], data: match[2] };
}

// Photos may arrive as a raw base64 data URL (legacy / not-yet-uploaded) or as a
// same-origin file reference like "/api/files/<key>" (uploaded to object storage).
// Resolve either form down to a data URL before sending to the AI.
async function resolvePhoto(photo: string | undefined): Promise<string | null> {
  if (!photo) return null;
  if (photo.startsWith('data:')) return photo;
  const match = /^\/api\/files\/([^/?#]+)/.exec(photo);
  if (!match) return null;
  return getObjectAsDataUrl(match[1]);
}

function textOf(message: Anthropic.Message): string {
  return message.content.filter(b => b.type === 'text').map(b => (b as any).text).join(' ');
}

function logAiError(label: string, err: any) {
  console.error(`[${label}] failed:`, err?.status, err?.message, err?.error);
}

router.post('/analyze-photo', async (req, res) => {
  const client = getClient();
  if (!client) { res.status(503).json({ error: 'AI unavailable — ANTHROPIC_API_KEY not configured' }); return; }

  const { photo, context } = req.body as { photo?: string; context?: string };
  const resolved = await resolvePhoto(photo);
  const parsed = resolved ? parseDataUrl(resolved) : null;
  if (!parsed) { res.status(400).json({ error: 'photo must be a base64 image data URL or an uploaded file reference' }); return; }

  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: parsed.mediaType as any, data: parsed.data } },
          { type: 'text', text: `This is a "before" photo from a factory cleaning checklist${context ? ` (${context})` : ''}. In 2-3 sentences, describe the current cleanliness condition and note anything that needs attention. Be specific and concise.` },
        ],
      }],
    });
    res.json({ comment: textOf(message) });
  } catch (err: any) {
    logAiError('ai/analyze-photo', err);
    res.status(502).json({ error: 'AI request failed', detail: err?.message });
  }
});

router.post('/compare-photos', async (req, res) => {
  const client = getClient();
  if (!client) { res.status(503).json({ error: 'AI unavailable — ANTHROPIC_API_KEY not configured' }); return; }

  const { before, after, context } = req.body as { before?: string; after?: string; context?: string };
  const [beforeResolved, afterResolved] = await Promise.all([resolvePhoto(before), resolvePhoto(after)]);
  const beforeParsed = beforeResolved ? parseDataUrl(beforeResolved) : null;
  const afterParsed = afterResolved ? parseDataUrl(afterResolved) : null;
  if (!beforeParsed || !afterParsed) { res.status(400).json({ error: 'before and after must be base64 image data URLs or uploaded file references' }); return; }

  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: 'BEFORE photo:' },
          { type: 'image', source: { type: 'base64', media_type: beforeParsed.mediaType as any, data: beforeParsed.data } },
          { type: 'text', text: 'AFTER photo:' },
          { type: 'image', source: { type: 'base64', media_type: afterParsed.mediaType as any, data: afterParsed.data } },
          { type: 'text', text: `These are before/after photos from a factory cleaning checklist${context ? ` (${context})` : ''}. Compare them and state in 2-3 sentences whether the cleaning was done properly, what improved, and flag anything still needing attention.` },
        ],
      }],
    });
    res.json({ comment: textOf(message) });
  } catch (err: any) {
    logAiError('ai/compare-photos', err);
    res.status(502).json({ error: 'AI request failed', detail: err?.message });
  }
});

router.post('/score-checklist-photo', async (req, res) => {
  const client = getClient();
  if (!client) { res.status(503).json({ error: 'AI unavailable — ANTHROPIC_API_KEY not configured' }); return; }

  const { photo, items, context } = req.body as { photo?: string; items?: { id: string; text: string; direction: 'present' | 'absent' }[]; context?: string };
  const resolved = await resolvePhoto(photo);
  const parsed = resolved ? parseDataUrl(resolved) : null;
  if (!parsed || !items || items.length === 0) { res.status(400).json({ error: 'photo (data URL or file reference) and items (non-empty array) are required' }); return; }

  try {
    const itemLines = items.map((it, i) =>
      `${i + 1}. [id: ${it.id}] "${it.text}" — this item MUST BE ${it.direction === 'absent' ? 'ABSENT (found = true only if the object/issue is NOT visible in the photo)' : 'PRESENT (found = true only if the object/condition IS clearly visible in the photo)'}`
    ).join('\n');

    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 800,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: parsed.mediaType as any, data: parsed.data } },
          {
            type: 'text',
            text: `This photo is from an area inspection${context ? ` (${context})` : ''}. Be strict and skeptical — only mark "found": true if the photo gives CLEAR, DIRECT visual evidence matching what's required for that item's direction (see below). If the relevant part of the image is unclear, not visible, ambiguous, or only partially addressed, mark "found": false. Do not assume something is done just because nothing looks obviously wrong — absence of evidence is not evidence of completion.\n\nEach item has a required direction — read it carefully, some items are satisfied by an object's ABSENCE, not its presence:\n${itemLines}\n\nRespond with ONLY a JSON array (no markdown, no other text), one object per item, each shaped exactly like: {"itemId": string, "found": boolean, "note": string}. "found" reflects the raw visual observation matching the stated direction (true = direction condition met). The "note" must state the specific visual evidence (or lack of it) you based the decision on, in under 15 words.`,
          },
        ],
      }],
    });
    const raw = textOf(message).trim();
    const jsonText = raw.startsWith('[') ? raw : raw.slice(raw.indexOf('['), raw.lastIndexOf(']') + 1);
    const results = JSON.parse(jsonText);
    res.json({ results });
  } catch (err: any) {
    logAiError('ai/score-checklist-photo', err);
    res.status(502).json({ error: 'AI request failed', detail: err?.message });
  }
});

const VALID_FIELD_TYPES = [
  'textbox', 'textarea', 'richtext', 'email', 'number', 'currency', 'percent', 'rating',
  'date', 'time', 'datetime', 'dropdown', 'multiselect', 'checkbox', 'radio', 'toggle',
  'lookup', 'formula', 'image', 'camera', 'beforeafter', 'photochecklist', 'video', 'audio',
  'upload', 'signature', 'gps', 'qr', 'barcode', 'phone', 'url', 'color', 'hidden', 'system',
  'ai', 'section',
];
const CHOICE_TYPES = new Set(['dropdown', 'multiselect', 'checkbox', 'radio']);

interface GeneratedField {
  type: string;
  label: string;
  helpText?: string;
  required?: boolean;
  options?: string[];
  repeatable?: boolean;
}

// Coerces whatever the model returned into a field shape the client's FormField/store
// can safely accept -- the model output is untrusted input even though it's JSON, since
// it becomes live builder/form state. Unknown types fall back to 'textbox' rather than
// being dropped, so a generation never silently loses a row the user would expect to see.
function sanitizeField(raw: any): FormFieldOut | null {
  if (!raw || typeof raw.label !== 'string' || !raw.label.trim()) return null;
  const type = VALID_FIELD_TYPES.includes(raw.type) ? raw.type : 'textbox';
  const rawOptions = CHOICE_TYPES.has(type) && Array.isArray(raw.options)
    ? raw.options.filter((o: unknown) => typeof o === 'string' && o.trim()).slice(0, 20)
    : [];
  // Every choice type needs at least one selectable option -- a required dropdown/
  // checkbox/radio/multiselect with an empty options array can never be satisfied, which
  // silently makes the whole generated form unsubmittable (same failure class as a
  // required field with no valid input).
  const options = CHOICE_TYPES.has(type) ? (rawOptions.length > 0 ? rawOptions : ['Option 1', 'Option 2']) : [];
  const field: FormFieldOut = {
    type, label: String(raw.label).slice(0, 200),
    placeholder: '', helpText: typeof raw.helpText === 'string' ? raw.helpText.slice(0, 300) : '',
    defaultValue: '', required: type !== 'section' && !!raw.required, readOnly: false, hidden: false,
    searchable: false, indexed: false,
    options,
    validation: { min: '', max: '', pattern: '', message: '' }, logic: [],
  };
  if (type === 'section' && raw.repeatable) field.repeatable = true;
  return field;
}

interface FormFieldOut {
  type: string; label: string; placeholder: string; helpText: string; defaultValue: string;
  required: boolean; readOnly: boolean; hidden: boolean; searchable: boolean; indexed: boolean;
  options: string[]; validation: { min: string; max: string; pattern: string; message: string };
  logic: unknown[]; repeatable?: boolean;
}

router.post('/generate-form', async (req, res) => {
  const client = getClient();
  if (!client) { res.status(503).json({ error: 'AI unavailable — ANTHROPIC_API_KEY not configured' }); return; }

  const { prompt, context } = req.body as { prompt?: string; context?: string };
  if (!prompt || !prompt.trim()) { res.status(400).json({ error: 'prompt is required' }); return; }
  // context is plain text already extracted client-side from an attached .xlsx/.csv/.txt
  // file (e.g. an existing checklist or item list) -- cap defensively even though the
  // client already truncates, since this is still untrusted user input reaching the model.
  const trimmedContext = context && context.trim() ? context.trim().slice(0, 12000) : '';

  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 8000,
      messages: [{
        role: 'user',
        content: [{
          type: 'text',
          text: `You are designing a form/checklist for an industrial or institutional compliance app. Based on this request, produce a complete, sensible list of form fields:

"${prompt.trim()}"
${trimmedContext ? `\nThe user also attached this reference content (an existing checklist, item list, or spreadsheet export) — use it to ground the specific items, areas, or questions in the generated form wherever relevant, rather than inventing generic ones:\n"""\n${trimmedContext}\n"""\n` : ''}

Rules:
- Respond with ONLY a JSON array (no markdown, no other text). Each element: {"type": string, "label": string, "helpText"?: string, "required"?: boolean, "options"?: string[], "repeatable"?: boolean}.
- Valid "type" values: ${VALID_FIELD_TYPES.join(', ')}.
- Use "section" fields (no options) as group headers to organize related fields (e.g. "Entry Checks", "Area Inspection"). Set "repeatable": true on a section only when the user's request implies a variable number of repeated items (e.g. one entry per area/room/vendor/person) — most sections should NOT be repeatable.
- Use "dropdown", "radio", "checkbox", or "multiselect" with an "options" array for closed-ended questions.
- Use "toggle" for simple yes/no checks.
- Use "image" or "camera" for a required photo. Use "beforeafter" specifically when the request implies a before/after comparison (e.g. cleaning, repair). Use "photochecklist" when a single photo should be checked against a list of visual criteria.
- Use "signature" for sign-off fields, "gps" for location capture, "date"/"datetime" for timestamps.
- Always include a "system" field first for a reference/ID number, and end with a "signature" field for sign-off, unless the request clearly doesn't need either.
- Produce a thorough, well-organized field list a compliance officer would consider complete — typically 15-40 fields including section headers, depending on the request's scope.`,
        }],
      }],
    });
    const raw = textOf(message).trim();
    if (message.stop_reason === 'max_tokens') {
      res.status(502).json({ error: 'AI response was too long and got cut off — try a narrower or more specific request.' });
      return;
    }
    const jsonText = raw.startsWith('[') ? raw : raw.slice(raw.indexOf('['), raw.lastIndexOf(']') + 1);
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      res.status(502).json({ error: 'AI returned an incomplete response — try again, or narrow the request.' });
      return;
    }
    if (!Array.isArray(parsed)) throw new Error('Model did not return an array');
    const fields = parsed.map(sanitizeField).filter((f): f is FormFieldOut => f !== null);
    if (fields.length === 0) { res.status(502).json({ error: 'AI did not return any usable fields' }); return; }
    res.json({ fields });
  } catch (err: any) {
    logAiError('ai/generate-form', err);
    res.status(502).json({ error: 'AI request failed', detail: err?.message });
  }
});

export default router;
