const express = require('express');
const { PrismaClient } = require('@prisma/client');
const router = express.Router();
const prisma = new PrismaClient();

// Get all channels
router.get('/', async (req, res) => {
  try {
    const channels = await prisma.channel.findMany({
      include: {
        niche: true,
        language: true,
        voice: true,
        profile: true,
        storyPrompt: true,
        videoPromptsPrompt: true,
        thumbnailPrompt: true,
        _count: { select: { videos: true, pipelines: true, competitors: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(channels);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single channel with details
router.get('/:id', async (req, res) => {
  try {
    const channel = await prisma.channel.findUnique({
      where: { id: req.params.id },
      include: {
        niche: true,
        language: true,
        voice: true,
        profile: true,
        storyPrompt: true,
        videoPromptsPrompt: true,
        thumbnailPrompt: true,
        competitors: true,
        videos: { orderBy: { createdAt: 'desc' }, take: 20 },
        pipelines: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
    if (!channel) return res.status(404).json({ error: 'Channel not found' });
    res.json(channel);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create channel
router.post('/', async (req, res) => {
  try {
    const channel = await prisma.channel.create({
      data: req.body,
      include: { niche: true, language: true },
    });
    res.status(201).json(channel);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update channel
router.put('/:id', async (req, res) => {
  try {
    const channel = await prisma.channel.update({
      where: { id: req.params.id },
      data: req.body,
      include: { niche: true, language: true, voice: true },
    });
    res.json(channel);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete channel
router.delete('/:id', async (req, res) => {
  try {
    await prisma.channel.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Add competitor to channel
router.post('/:id/competitors', async (req, res) => {
  try {
    const competitor = await prisma.competitor.create({
      data: {
        ...req.body,
        channelId: req.params.id,
      },
    });
    res.status(201).json(competitor);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete competitor
router.delete('/:id/competitors/:competitorId', async (req, res) => {
  try {
    await prisma.competitor.delete({ where: { id: req.params.competitorId } });
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
