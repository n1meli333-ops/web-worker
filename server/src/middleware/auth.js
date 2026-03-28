const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Необхідна авторизація' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) {
      return res.status(401).json({ error: 'Користувача не знайдено' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Невалідний токен' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Потрібні права адміністратора' });
  }
  next();
};

const requireTab = (tabName) => (req, res, next) => {
  if (req.user.role === 'ADMIN') return next();
  if (!req.user.tabs.includes(tabName)) {
    return res.status(403).json({ error: 'Немає доступу до цієї вкладки' });
  }
  next();
};

module.exports = { authenticate, requireAdmin, requireTab };
