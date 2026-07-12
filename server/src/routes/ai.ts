import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';

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
  const parsed = photo ? parseDataUrl(photo) : null;
  if (!parsed) { res.status(400).json({ error: 'photo must be a base64 image data URL' }); return; }

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
  const beforeParsed = before ? parseDataUrl(before) : null;
  const afterParsed = after ? parseDataUrl(after) : null;
  if (!beforeParsed || !afterParsed) { res.status(400).json({ error: 'before and after must be base64 image data URLs' }); return; }

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
  const parsed = photo ? parseDataUrl(photo) : null;
  if (!parsed || !items || items.length === 0) { res.status(400).json({ error: 'photo (data URL) and items (non-empty array) are required' }); return; }

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

export default router;
