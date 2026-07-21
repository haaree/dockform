import { Router } from 'express';
import { prisma } from '../index.js';

const router = Router();

router.get('/', async (req, res) => {
  if (!req.auth?.companyId) { res.json([]); return; }
  const trades = await prisma.trade.findMany({
    where: { companyId: req.auth.companyId },
    orderBy: { name: 'asc' },
  });
  res.json(trades.map((t: any) => ({ id: t.id, name: t.name, status: t.status })));
});

router.post('/', async (req, res) => {
  if (req.auth?.roleKey !== 'admin') { res.status(403).json({ error: 'Admin access required' }); return; }
  const { name } = req.body as { name?: string };
  if (!name || !name.trim()) { res.status(400).json({ error: 'Trade name is required' }); return; }
  try {
    const trade = await prisma.trade.create({ data: { name: name.trim(), companyId: req.auth!.companyId! } });
    res.status(201).json({ id: trade.id, name: trade.name, status: trade.status });
  } catch (err: any) {
    if (err?.code === 'P2002') { res.status(409).json({ error: 'A trade with this name already exists' }); return; }
    res.status(500).json({ error: 'Failed to create trade', detail: err?.message });
  }
});

router.patch('/:id', async (req, res) => {
  if (req.auth?.roleKey !== 'admin') { res.status(403).json({ error: 'Admin access required' }); return; }
  const existing = await prisma.trade.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.companyId !== req.auth?.companyId) { res.status(404).json({ error: 'Trade not found' }); return; }
  const { name, status } = req.body as { name?: string; status?: string };
  const data: Record<string, string> = {};
  if (name) data.name = name.trim();
  if (status) data.status = status;
  const trade = await prisma.trade.update({ where: { id: req.params.id }, data });
  res.json({ id: trade.id, name: trade.name, status: trade.status });
});

router.delete('/:id', async (req, res) => {
  if (req.auth?.roleKey !== 'admin') { res.status(403).json({ error: 'Admin access required' }); return; }
  const existing = await prisma.trade.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.companyId !== req.auth?.companyId) { res.status(404).json({ error: 'Trade not found' }); return; }
  await prisma.trade.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

// Replaces the full set of trades held by one user (simplest contract for a multi-select
// checkbox list in the Users screen -- client sends the complete desired set each time
// rather than diffing add/remove itself).
router.put('/user/:userId', async (req, res) => {
  if (req.auth?.roleKey !== 'admin') { res.status(403).json({ error: 'Admin access required' }); return; }
  const { tradeIds } = req.body as { tradeIds?: string[] };
  const user = await prisma.user.findUnique({ where: { id: req.params.userId } });
  if (!user || user.companyId !== req.auth?.companyId) { res.status(404).json({ error: 'User not found' }); return; }
  await prisma.userTrade.deleteMany({ where: { userId: req.params.userId } });
  if (Array.isArray(tradeIds) && tradeIds.length > 0) {
    await prisma.userTrade.createMany({
      data: tradeIds.map((tradeId) => ({ userId: req.params.userId, tradeId })),
      skipDuplicates: true,
    });
  }
  res.status(204).send();
});

router.get('/user/:userId', async (req, res) => {
  const rows = await prisma.userTrade.findMany({ where: { userId: req.params.userId }, include: { trade: true } });
  res.json(rows.map((r: any) => ({ id: r.trade.id, name: r.trade.name })));
});

export default router;
