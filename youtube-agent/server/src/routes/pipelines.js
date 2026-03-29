const express = require('express');
const { PrismaClient } = require('@prisma/client');
const router = express.Router();
const prisma = new PrismaClient();

// Get all pipelines
router.get('/', async (req, res) => {
  try {
    const { status, channelId, limit } = req.query;
    const where = {};
    if (status) where.status = status;
    if (channelId) where.channelId = channelId;

    const pipelines = await prisma.pipeline.findMany({
      where,
      include: {
        channel: { select: { id: true, name: true } },
        video: { select: { id: true, title: true, youtubeUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit) || 50,
    });
    res.json(pipelines);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single pipeline with full details
router.get('/:id', async (req, res) => {
  try {
    const pipeline = await prisma.pipeline.findUnique({
      where: { id: req.params.id },
      include: { channel: true, video: true },
    });
    if (!pipeline) return res.status(404).json({ error: 'Not found' });
    res.json(pipeline);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Trigger new pipeline for a channel
router.post('/trigger', async (req, res) => {
  try {
    const { channelId } = req.body;
    const channel = await prisma.channel.findUnique({ where: { id: channelId } });
    if (!channel) return res.status(404).json({ error: 'Channel not found' });

    // Create pipeline in PENDING status
    // The agent process will pick it up
    const pipeline = await prisma.pipeline.create({
      data: {
        channelId,
        status: 'PENDING',
      },
      include: { channel: true },
    });

    res.status(201).json(pipeline);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Retry a failed pipeline
router.post('/:id/retry', async (req, res) => {
  try {
    const pipeline = await prisma.pipeline.update({
      where: { id: req.params.id },
      data: {
        status: 'PENDING',
        error: null,
        retryCount: { increment: 1 },
      },
    });
    res.json(pipeline);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Cancel a pipeline
router.post('/:id/cancel', async (req, res) => {
  try {
    const pipeline = await prisma.pipeline.update({
      where: { id: req.params.id },
      data: { status: 'FAILED', error: 'Cancelled by user' },
    });
    res.json(pipeline);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
