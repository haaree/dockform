import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';

const router = Router();

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

router.post('/analyze-photo', async (req, res) => {
  const client = getClient();
  if (!client) { res.status(503).json({ error: 'AI unavailable — ANTHROPIC_API_KEY not configured' }); return; }

  const { photo, context } = req.body as { photo?: string; context?: string };
  const parsed = photo ? parseDataUrl(photo) : null;
  if (!parsed) { res.status(400).json({ error: 'photo must be a base64 image data URL' }); return; }

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: parsed.mediaType as any, data: parsed.data } },
          { type: 'text', text: `This is a "before" photo from a factory cleaning checklist${context ? ` (${context})` : ''}. In 2-3 sentences, describe the current cleanliness condition and note anything that needs attention. Be specific and concise.` },
        ],
      }],
    });
    const text = message.content.filter(b => b.type === 'text').map(b => (b as any).text).join(' ');
    res.json({ comment: text });
  } catch (err: any) {
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
      model: 'claude-haiku-4-5-20251001',
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
    const text = message.content.filter(b => b.type === 'text').map(b => (b as any).text).join(' ');
    res.json({ comment: text });
  } catch (err: any) {
    res.status(502).json({ error: 'AI request failed', detail: err?.message });
  }
});

export default router;
