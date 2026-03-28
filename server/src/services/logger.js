const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function logAction(userId, action, details = null) {
  await prisma.log.create({
    data: { userId, action, details }
  });
}

module.exports = { logAction };
