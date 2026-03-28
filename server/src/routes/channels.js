const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.get('/', authenticate, async (req, res) => {
  try {
    const channels = await prisma.channel.findMany({ orderBy: { name: 'asc' } });
    res.json(channels);
  } catch (err) {
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const channel = await prisma.channel.create({
      data: { name: req.body.name, nicheId: req.body.nicheId, url: req.body.url }
    });
    res.json(channel);
  } catch (err) {
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await prisma.channel.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Канал видалено' });
  } catch (err) {
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

module.exports = router;
