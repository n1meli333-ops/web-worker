const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { limit = 100, userId } = req.query;
    const where = {};
    if (userId) where.userId = parseInt(userId);

    const logs = await prisma.log.findMany({
      where,
      include: { user: { select: { nickname: true } } },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit)
    });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

module.exports = router;
