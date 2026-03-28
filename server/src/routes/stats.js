const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

function getDateRange(period) {
  const now = new Date();
  switch (period) {
    case 'day':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case 'week':
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);
      return weekStart;
    case 'month':
      return new Date(now.getFullYear(), now.getMonth(), 1);
    default:
      return new Date(0);
  }
}

// Get personal stats for worker
router.get('/my', authenticate, async (req, res) => {
  try {
    const periods = ['day', 'week', 'month', 'all'];
    const stats = {};

    for (const period of periods) {
      const since = getDateRange(period);
      const completed = await prisma.task.count({
        where: {
          assignedToId: req.user.id,
          status: 'COMPLETED',
          completedAt: { gte: since }
        }
      });
      const pending = await prisma.task.count({
        where: {
          assignedToId: req.user.id,
          status: { in: ['PENDING', 'IN_PROGRESS'] }
        }
      });
      stats[period] = { completed, pending };
    }

    // Get today's tasks
    const todayTasks = await prisma.task.findMany({
      where: {
        OR: [
          { assignedToId: req.user.id },
          { assignedToId: null }
        ],
        createdAt: { gte: getDateRange('day') }
      },
      include: { niche: true, story: { select: { title: true } } },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ stats, todayTasks });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

// Get ranking
router.get('/ranking', authenticate, async (req, res) => {
  try {
    const period = req.query.period || 'all';
    const since = getDateRange(period);

    const workers = await prisma.user.findMany({
      where: { role: 'WORKER' },
      select: {
        id: true,
        nickname: true,
        assignedTasks: {
          where: {
            status: 'COMPLETED',
            completedAt: { gte: since }
          }
        }
      }
    });

    const ranking = workers
      .map(w => ({
        id: w.id,
        nickname: w.nickname,
        completed: w.assignedTasks.length
      }))
      .sort((a, b) => b.completed - a.completed)
      .map((w, i) => ({ ...w, rank: i + 1 }));

    const totalWorkers = ranking.length;

    // For non-admin, hide other workers' nicknames
    if (req.user.role !== 'ADMIN') {
      const myRank = ranking.find(r => r.id === req.user.id);
      res.json({
        myRank: myRank ? myRank.rank : totalWorkers,
        totalWorkers,
        myCompleted: myRank ? myRank.completed : 0
      });
    } else {
      res.json({ ranking, totalWorkers });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

// Admin: get all workers stats
router.get('/workers', authenticate, async (req, res) => {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Тільки для адміна' });

  try {
    const periods = ['day', 'week', 'month', 'all'];
    const workers = await prisma.user.findMany({
      where: { role: 'WORKER' },
      select: { id: true, nickname: true }
    });

    const result = [];
    for (const worker of workers) {
      const workerStats = {};
      for (const period of periods) {
        const since = getDateRange(period);
        workerStats[period] = await prisma.task.count({
          where: {
            assignedToId: worker.id,
            status: 'COMPLETED',
            completedAt: { gte: since }
          }
        });
      }
      result.push({ ...worker, stats: workerStats });
    }

    result.sort((a, b) => b.stats.all - a.stats.all);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

module.exports = router;
