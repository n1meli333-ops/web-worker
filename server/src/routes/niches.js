const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.get('/', authenticate, async (req, res) => {
  try {
    const niches = await prisma.niche.findMany({ orderBy: { name: 'asc' } });
    res.json(niches);
  } catch (err) {
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const niche = await prisma.niche.create({ data: { name: req.body.name } });
    res.json(niche);
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'Така ніша вже існує' });
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await prisma.niche.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Нішу видалено' });
  } catch (err) {
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

module.exports = router;
