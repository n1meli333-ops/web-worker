const express = require('express');
const { PrismaClient } = require('@prisma/client');
const router = express.Router();
const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalVideos,
      todayVideos,
      weekVideos,
      totalChannels,
      activeChannels,
      activePipelines,
      failedToday,
      completedToday,
    ] = await Promise.all([
      prisma.video.count(),
      prisma.video.count({ where: { createdAt: { gte: today } } }),
      prisma.video.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.channel.count(),
      prisma.channel.count({ where: { isActive: true } }),
      prisma.pipeline.count({ where: { status: { notIn: ['COMPLETED', 'FAILED'] } } }),
      prisma.pipeline.count({ where: { status: 'FAILED', createdAt: { gte: today } } }),
      prisma.pipeline.count({ where: { status: 'COMPLETED', createdAt: { gte: today } } }),
    ]);

    // Per-channel stats
    const channelStats = await prisma.channel.findMany({
      select: {
        id: true,
        name: true,
        isActive: true,
        _count: { select: { videos: true, pipelines: true } },
        pipelines: {
          where: { status: 'COMPLETED' },
          orderBy: { completedAt: 'desc' },
          take: 1,
          select: { completedAt: true },
        },
      },
    });

    res.json({
      overview: {
        totalVideos,
        todayVideos,
        weekVideos,
        totalChannels,
        activeChannels,
        activePipelines,
        failedToday,
        completedToday,
      },
      channels: channelStats.map(ch => ({
        id: ch.id,
        name: ch.name,
        isActive: ch.isActive,
        totalVideos: ch._count.videos,
        totalPipelines: ch._count.pipelines,
        lastVideoAt: ch.pipelines[0]?.completedAt || null,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
