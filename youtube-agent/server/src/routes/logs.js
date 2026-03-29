const express = require('express');
const { PrismaClient } = require('@prisma/client');
const router = express.Router();
const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  try {
    const { level, source, limit, pipelineId } = req.query;
    const where = {};
    if (level) where.level = level;
    if (source) where.source = source;
    if (pipelineId) where.pipelineId = pipelineId;

    const logs = await prisma.agentLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit) || 100,
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
