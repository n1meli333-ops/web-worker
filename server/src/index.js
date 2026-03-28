require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const nicheRoutes = require('./routes/niches');
const languageRoutes = require('./routes/languages');
const storyRoutes = require('./routes/stories');
const taskRoutes = require('./routes/tasks');
const promptRoutes = require('./routes/prompts');
const statsRoutes = require('./routes/stats');
const logRoutes = require('./routes/logs');
const channelRoutes = require('./routes/channels');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/niches', nicheRoutes);
app.use('/api/languages', languageRoutes);
app.use('/api/stories', storyRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/prompts', promptRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/channels', channelRoutes);

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../client/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
