const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const channelsRouter = require('./routes/channels');
const promptsRouter = require('./routes/prompts');
const profilesRouter = require('./routes/profiles');
const pipelinesRouter = require('./routes/pipelines');
const nichesRouter = require('./routes/niches');
const languagesRouter = require('./routes/languages');
const voicesRouter = require('./routes/voices');
const settingsRouter = require('./routes/settings');
const logsRouter = require('./routes/logs');
const statsRouter = require('./routes/stats');

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/channels', channelsRouter);
app.use('/api/prompts', promptsRouter);
app.use('/api/profiles', profilesRouter);
app.use('/api/pipelines', pipelinesRouter);
app.use('/api/niches', nichesRouter);
app.use('/api/languages', languagesRouter);
app.use('/api/voices', voicesRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/logs', logsRouter);
app.use('/api/stats', statsRouter);

app.listen(PORT, () => {
  console.log(`YouTube Agent API running on port ${PORT}`);
});
