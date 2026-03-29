const express = require('express');
const { PrismaClient } = require('@prisma/client');
const router = express.Router();
const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  try {
    const { type } = req.query;
    const where = type ? { type } : {};
    const prompts = await prisma.prompt.findMany({ where, orderBy: { createdAt: 'desc' } });
    res.json(prompts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const prompt = await prisma.prompt.findUnique({ where: { id: req.params.id } });
    if (!prompt) return res.status(404).json({ error: 'Not found' });
    res.json(prompt);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const prompt = await prisma.prompt.create({ data: req.body });
    res.status(201).json(prompt);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const prompt = await prisma.prompt.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(prompt);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.prompt.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
