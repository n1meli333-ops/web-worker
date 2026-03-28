const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // Create admin
  const adminPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: adminPassword,
      nickname: 'Admin',
      role: 'ADMIN',
      tabs: ['stories', 'preview', 'publisher', 'admin']
    }
  });

  // Create sample workers
  const workerPassword = await bcrypt.hash('worker123', 10);

  await prisma.user.upsert({
    where: { username: 'worker1' },
    update: {},
    create: {
      username: 'worker1',
      password: workerPassword,
      nickname: 'VideoMaker',
      role: 'WORKER',
      tabs: ['stories']
    }
  });

  await prisma.user.upsert({
    where: { username: 'worker2' },
    update: {},
    create: {
      username: 'worker2',
      password: workerPassword,
      nickname: 'PreviewMaker',
      role: 'WORKER',
      tabs: ['preview']
    }
  });

  await prisma.user.upsert({
    where: { username: 'worker3' },
    update: {},
    create: {
      username: 'worker3',
      password: workerPassword,
      nickname: 'Publisher',
      role: 'WORKER',
      tabs: ['publisher']
    }
  });

  // Create sample niches
  const niches = ['Horror', 'True Crime', 'Mystery', 'Science', 'History'];
  for (const name of niches) {
    await prisma.niche.upsert({
      where: { name },
      update: {},
      create: { name }
    });
  }

  // Create sample languages
  const languages = [
    { name: 'English', code: 'en' },
    { name: 'Українська', code: 'uk' },
    { name: 'Spanish', code: 'es' },
    { name: 'Portuguese', code: 'pt' },
    { name: 'Hindi', code: 'hi' }
  ];
  for (const lang of languages) {
    await prisma.language.upsert({
      where: { code: lang.code },
      update: {},
      create: lang
    });
  }

  // Create sample prompts
  await prisma.prompt.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'Story Generation',
      type: 'story_generation',
      content: 'Generate a compelling YouTube story script for the {niche} niche in {language}. The story should be engaging, dramatic, and suitable for a YouTube video format.',
      description: 'Main prompt for AI story generation'
    }
  });

  await prisma.prompt.upsert({
    where: { id: 2 },
    update: {},
    create: {
      name: 'Video Prompts',
      type: 'video_prompts',
      content: 'Based on the following story, generate {count} detailed 8-second video scene prompts for Veo 3.1 AI video generation. Each prompt should describe the visual scene in detail.',
      description: 'Prompt for generating Veo 3.1 video prompts'
    }
  });

  await prisma.prompt.upsert({
    where: { id: 3 },
    update: {},
    create: {
      name: 'Thumbnail Prompt',
      type: 'thumbnail_prompt',
      content: 'Generate a thumbnail image prompt for a YouTube video about: {title}. The image should be attention-grabbing and suitable for YouTube.',
      description: 'Prompt for thumbnail generation'
    }
  });

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
