const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const prompts = await prisma.prompt.findMany({ orderBy: { updatedAt: 'desc' } });
    res.json(prompts);
  } catch (err) {
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, type, content, description } = req.body;
    const prompt = await prisma.prompt.create({ data: { name, type, content, description } });
    res.json(prompt);
  } catch (err) {
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, type, content, description } = req.body;
    const prompt = await prisma.prompt.update({
      where: { id: parseInt(req.params.id) },
      data: { name, type, content, description }
    });
    res.json(prompt);
  } catch (err) {
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await prisma.prompt.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Промпт видалено' });
  } catch (err) {
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

module.exports = router;
