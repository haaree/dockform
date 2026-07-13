import { Router } from 'express';
import { getObjectBuffer } from '../lib/storage.js';

const router = Router();

// Keys are random UUIDs (unguessable) and this route is intentionally public
// so <img> tags and offline-downloaded reports can load photos without auth headers.
router.get('/:key', async (req, res) => {
  const obj = await getObjectBuffer(req.params.key);
  if (!obj) { res.status(404).end(); return; }
  res.setHeader('Content-Type', obj.contentType);
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.send(obj.buffer);
});

export default router;
