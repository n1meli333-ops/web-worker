const express = require('express');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { logAction } = require('../services/logger');

const router = express.Router();
const prisma = new PrismaClient();

// Get all workers (admin only)
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        nickname: true,
        role: true,
        tabs: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

// Create worker (admin only)
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { username, password, nickname, role, tabs } = req.body;
    const hashed = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { username, password: hashed, nickname, role: role || 'WORKER', tabs: tabs || [] }
    });

    await logAction(req.user.id, 'CREATE_USER', `Created user: ${nickname}`);

    res.json({
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      role: user.role,
      tabs: user.tabs
    });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(400).json({ error: 'Такий логін вже існує' });
    }
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

// Update worker (admin only)
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { nickname, tabs, role, password } = req.body;
    const data = {};
    if (nickname !== undefined) data.nickname = nickname;
    if (tabs !== undefined) data.tabs = tabs;
    if (role !== undefined) data.role = role;
    if (password) data.password = await bcrypt.hash(password, 10);

    const user = await prisma.user.update({
      where: { id: parseInt(req.params.id) },
      data
    });

    await logAction(req.user.id, 'UPDATE_USER', `Updated user: ${user.nickname}`);

    res.json({
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      role: user.role,
      tabs: user.tabs
    });
  } catch (err) {
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

// Delete worker (admin only)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const user = await prisma.user.delete({ where: { id: parseInt(req.params.id) } });
    await logAction(req.user.id, 'DELETE_USER', `Deleted user: ${user.nickname}`);
    res.json({ message: 'Користувача видалено' });
  } catch (err) {
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

module.exports = router;
