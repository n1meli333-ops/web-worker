const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await prisma.user.findUnique({ where: { username } });

    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ error: 'Невірний логін або пароль' });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        role: user.role,
        tabs: user.tabs
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

router.get('/me', authenticate, async (req, res) => {
  res.json({
    id: req.user.id,
    username: req.user.username,
    nickname: req.user.nickname,
    role: req.user.role,
    tabs: req.user.tabs
  });
});

module.exports = router;
