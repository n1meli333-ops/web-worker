const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireTab } = require('../middleware/auth');
const { logAction } = require('../services/logger');

const router = express.Router();
const prisma = new PrismaClient();

// Mock AI story generation
function generateMockStory(niche, language) {
  const stories = {
    default: `This is a generated story for the "${niche}" niche in ${language}. The story follows a compelling narrative arc that captures viewer attention from the first second. It includes dramatic tension, emotional moments, and a satisfying conclusion that keeps viewers engaged throughout the entire video.`
  };
  return stories.default;
}

function generateMockVideoPrompts(story, count = 50) {
  const prompts = [];
  for (let i = 1; i <= count; i++) {
    prompts.push(`[Scene ${i}] Cinematic 8-second clip: ${story.substring(0, 50)}... - Visual style: dramatic lighting, 4K quality, smooth camera movement. Duration: 8s.`);
  }
  return prompts.join('\n\n');
}

function generateMockStockKeywords(story) {
  return 'dramatic landscape, emotional person, city timelapse, nature closeup, technology abstract, cinematic clouds, ocean waves, mountain peak, sunset golden hour, urban nightlife';
}

// Generate story
router.post('/generate', authenticate, requireTab('stories'), async (req, res) => {
  try {
    const { nicheId, languageId } = req.body;

    const niche = await prisma.niche.findUnique({ where: { id: nicheId } });
    const language = await prisma.language.findUnique({ where: { id: languageId } });

    if (!niche || !language) {
      return res.status(400).json({ error: 'Невірна ніша або мова' });
    }

    // Get system prompt if exists
    const systemPrompt = await prisma.prompt.findFirst({ where: { type: 'story_generation' } });

    const content = generateMockStory(niche.name, language.name);

    const story = await prisma.story.create({
      data: {
        content,
        title: `${niche.name} - ${language.name} Story`,
        nicheId,
        languageId,
        createdById: req.user.id
      },
      include: { niche: true, language: true }
    });

    await logAction(req.user.id, 'GENERATE_STORY', `Generated story #${story.id} for ${niche.name}`);

    res.json(story);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка генерації історії' });
  }
});

// Generate video prompts for a story
router.post('/:id/video-prompts', authenticate, requireTab('stories'), async (req, res) => {
  try {
    const story = await prisma.story.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!story) return res.status(404).json({ error: 'Історію не знайдено' });

    const promptCount = req.body.count || 50;
    const videoPrompts = generateMockVideoPrompts(story.content, promptCount);

    await prisma.story.update({
      where: { id: story.id },
      data: { videoPrompts }
    });

    await logAction(req.user.id, 'GENERATE_PROMPTS', `Generated ${promptCount} video prompts for story #${story.id}`);

    res.json({ videoPrompts });
  } catch (err) {
    res.status(500).json({ error: 'Помилка генерації промптів' });
  }
});

// Generate stock keywords
router.post('/:id/stock-keywords', authenticate, requireTab('stories'), async (req, res) => {
  try {
    const story = await prisma.story.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!story) return res.status(404).json({ error: 'Історію не знайдено' });

    const stockKeywords = generateMockStockKeywords(story.content);

    await prisma.story.update({
      where: { id: story.id },
      data: { stockKeywords }
    });

    await logAction(req.user.id, 'GENERATE_STOCKS', `Generated stock keywords for story #${story.id}`);

    res.json({ stockKeywords });
  } catch (err) {
    res.status(500).json({ error: 'Помилка генерації ключових слів' });
  }
});

// Send to preview worker
router.post('/:id/send-to-preview', authenticate, requireTab('stories'), async (req, res) => {
  try {
    const story = await prisma.story.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { niche: true }
    });
    if (!story) return res.status(404).json({ error: 'Історію не знайдено' });

    const task = await prisma.task.create({
      data: {
        type: 'PREVIEW_MAKER',
        storyId: story.id,
        nicheId: story.nicheId,
        thumbnailText: req.body.thumbnailText || story.title,
        videoDescription: req.body.videoDescription || story.content.substring(0, 200),
        thumbnailPrompt: req.body.thumbnailPrompt || `Create a eye-catching thumbnail for: ${story.title}`,
        createdById: req.user.id
      }
    });

    // Also create completed task for video maker
    await prisma.task.create({
      data: {
        type: 'VIDEO_MAKER',
        status: 'COMPLETED',
        storyId: story.id,
        nicheId: story.nicheId,
        videoPrompts: story.videoPrompts,
        stockKeywords: story.stockKeywords,
        createdById: req.user.id,
        assignedToId: req.user.id,
        completedAt: new Date()
      }
    });

    await logAction(req.user.id, 'SEND_TO_PREVIEW', `Sent story #${story.id} to preview worker`);

    res.json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка відправки завдання' });
  }
});

// Get all stories
router.get('/', authenticate, async (req, res) => {
  try {
    const stories = await prisma.story.findMany({
      include: { niche: true, language: true, createdBy: { select: { nickname: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(stories);
  } catch (err) {
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

module.exports = router;
