const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireTab } = require('../middleware/auth');
const { logAction } = require('../services/logger');

const router = express.Router();
const prisma = new PrismaClient();

// Get tasks for current user / type
router.get('/', authenticate, async (req, res) => {
  try {
    const { type, status } = req.query;
    const where = {};

    if (type) where.type = type;
    if (status) where.status = status;

    // Workers see only their assigned or unassigned tasks of their type
    if (req.user.role !== 'ADMIN') {
      where.OR = [
        { assignedToId: req.user.id },
        { assignedToId: null }
      ];
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        story: { include: { niche: true, language: true } },
        niche: true,
        assignedTo: { select: { nickname: true } },
        createdBy: { select: { nickname: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

// Get single task
router.get('/:id', authenticate, async (req, res) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        story: { include: { niche: true, language: true } },
        niche: true,
        assignedTo: { select: { nickname: true } },
        createdBy: { select: { nickname: true } }
      }
    });
    if (!task) return res.status(404).json({ error: 'Завдання не знайдено' });
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

// Claim a task (worker takes it)
router.post('/:id/claim', authenticate, async (req, res) => {
  try {
    const task = await prisma.task.update({
      where: { id: parseInt(req.params.id) },
      data: { assignedToId: req.user.id, status: 'IN_PROGRESS' }
    });
    await logAction(req.user.id, 'CLAIM_TASK', `Claimed task #${task.id}`);
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

// Complete preview task (Worker 2)
router.put('/:id/complete-preview', authenticate, requireTab('preview'), async (req, res) => {
  try {
    const { thumbnailUrl, videoTitle } = req.body;

    const task = await prisma.task.update({
      where: { id: parseInt(req.params.id) },
      data: {
        thumbnailUrl,
        videoTitle,
        status: 'COMPLETED',
        completedAt: new Date(),
        assignedToId: req.user.id
      },
      include: { story: true, niche: true }
    });

    // Auto-create publisher task
    await prisma.task.create({
      data: {
        type: 'PUBLISHER',
        storyId: task.storyId,
        nicheId: task.nicheId,
        thumbnailUrl: task.thumbnailUrl,
        videoTitle: task.videoTitle,
        videoDescription: task.videoDescription,
        thumbnailText: task.thumbnailText,
        videoPrompts: task.story?.videoPrompts,
        tags: task.story?.content?.substring(0, 100),
        createdById: req.user.id
      }
    });

    await logAction(req.user.id, 'COMPLETE_PREVIEW', `Completed preview task #${task.id}`);
    res.json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

// Complete publisher task (Worker 3)
router.put('/:id/complete-publish', authenticate, requireTab('publisher'), async (req, res) => {
  try {
    const { publishedUrl, channelName } = req.body;

    const task = await prisma.task.update({
      where: { id: parseInt(req.params.id) },
      data: {
        publishedUrl,
        channelName,
        status: 'COMPLETED',
        completedAt: new Date(),
        assignedToId: req.user.id
      }
    });

    await logAction(req.user.id, 'COMPLETE_PUBLISH', `Published task #${task.id} to ${channelName}`);
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

// Update task
router.put('/:id', authenticate, async (req, res) => {
  try {
    const task = await prisma.task.update({
      where: { id: parseInt(req.params.id) },
      data: req.body
    });
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

module.exports = router;
