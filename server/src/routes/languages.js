const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.get('/', authenticate, async (req, res) => {
  try {
    const languages = await prisma.language.findMany({ orderBy: { name: 'asc' } });
    res.json(languages);
  } catch (err) {
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const lang = await prisma.language.create({ data: { name: req.body.name, code: req.body.code } });
    res.json(lang);
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'Така мова вже існує' });
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await prisma.language.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Мову видалено' });
  } catch (err) {
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

module.exports = router;
