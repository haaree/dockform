import { Router } from 'express';
import { uploadDataUrl, storageConfigured } from '../lib/storage.js';

const router = Router();

router.post('/', async (req, res) => {
  if (!storageConfigured) { res.status(503).json({ error: 'Object storage is not configured' }); return; }
  const { dataUrl } = req.body as { dataUrl?: string };
  if (!dataUrl) { res.status(400).json({ error: 'dataUrl is required' }); return; }
  try {
    const key = await uploadDataUrl(dataUrl);
    res.status(201).json({ key, url: `/api/files/${key}` });
  } catch (err: any) {
    console.error('[POST /uploads] failed:', err?.message);
    res.status(500).json({ error: 'Upload failed', detail: err?.message });
  }
});

export default router;
