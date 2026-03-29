const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create niches
  const niches = await Promise.all([
    prisma.niche.upsert({ where: { name: 'Horror' }, update: {}, create: { name: 'Horror', description: 'Horror stories, creepypasta, true scary stories' } }),
    prisma.niche.upsert({ where: { name: 'True Crime' }, update: {}, create: { name: 'True Crime', description: 'True crime stories, investigations, mysteries' } }),
    prisma.niche.upsert({ where: { name: 'Mystery' }, update: {}, create: { name: 'Mystery', description: 'Unsolved mysteries, paranormal, conspiracies' } }),
    prisma.niche.upsert({ where: { name: 'Science' }, update: {}, create: { name: 'Science', description: 'Science facts, discoveries, space, technology' } }),
    prisma.niche.upsert({ where: { name: 'History' }, update: {}, create: { name: 'History', description: 'Historical events, wars, civilizations' } }),
  ]);

  // Create languages
  const languages = await Promise.all([
    prisma.language.upsert({ where: { code: 'uk' }, update: {}, create: { name: 'Ukrainian', code: 'uk' } }),
    prisma.language.upsert({ where: { code: 'en' }, update: {}, create: { name: 'English', code: 'en' } }),
    prisma.language.upsert({ where: { code: 'es' }, update: {}, create: { name: 'Spanish', code: 'es' } }),
    prisma.language.upsert({ where: { code: 'pt' }, update: {}, create: { name: 'Portuguese', code: 'pt' } }),
    prisma.language.upsert({ where: { code: 'hi' }, update: {}, create: { name: 'Hindi', code: 'hi' } }),
  ]);

  // Create default prompts
  await prisma.prompt.upsert({
    where: { id: 'default-story' },
    update: {},
    create: {
      id: 'default-story',
      name: 'Default Story Generation',
      type: 'story_generation',
      isDefault: true,
      description: 'Main prompt for generating stories. Variables: {{IDEA}}, {{NICHE}}, {{LANGUAGE}}, {{MIN_LENGTH}}, {{MAX_LENGTH}}',
      content: `You are a professional storyteller and screenwriter specializing in {{NICHE}} content for YouTube.

Write a compelling, engaging story based on this idea:
{{IDEA}}

Requirements:
- Language: {{LANGUAGE}}
- Target length when read aloud: {{MIN_LENGTH}}-{{MAX_LENGTH}} minutes
- Write in a narrative style perfect for voiceover
- Start with a strong hook in the first 2 sentences
- Build tension throughout the story
- Include vivid descriptions that translate well to visual scenes
- End with a satisfying conclusion or cliffhanger
- Use short paragraphs for better pacing
- Each paragraph should represent approximately one 8-second video scene

Write the full story now. Do not include any meta-commentary, just the story text.`,
    },
  });

  await prisma.prompt.upsert({
    where: { id: 'default-video-prompts' },
    update: {},
    create: {
      id: 'default-video-prompts',
      name: 'Default Video Prompts',
      type: 'video_prompts',
      isDefault: true,
      description: 'Generates Veo 3.1 video prompts matched to audio timestamps. Variables: {{STORY}}, {{TIMESTAMPS}}',
      content: `You are a video prompt engineer for Veo 3.1 AI video generation.

Given this story and its audio timestamps, create one video generation prompt for each timestamp segment.

Story:
{{STORY}}

Audio timestamps (each segment is ~8 seconds):
{{TIMESTAMPS}}

For each segment, write a detailed video prompt that:
1. Visually represents what's being narrated in that segment
2. Is optimized for Veo 3.1 (cinematic, high quality)
3. Maintains visual consistency across scenes (same characters, settings)
4. Includes camera movement, lighting, mood descriptions
5. Duration matches the segment duration

Respond in JSON format:
[
  {
    "index": 0,
    "prompt": "Cinematic shot of...",
    "duration": 8,
    "startTime": 0.0,
    "endTime": 8.0
  },
  ...
]

Generate prompts for ALL segments. Do not skip any.`,
    },
  });

  await prisma.prompt.upsert({
    where: { id: 'default-thumbnail' },
    update: {},
    create: {
      id: 'default-thumbnail',
      name: 'Default Thumbnail Prompt',
      type: 'thumbnail_prompt',
      isDefault: true,
      description: 'Generates thumbnail text and image prompt. Variables: {{TITLE}}, {{STORY}}, {{NICHE}}',
      content: `You are a YouTube thumbnail expert. Create a thumbnail concept for this video.

Title: {{TITLE}}
Niche: {{NICHE}}
Story preview: {{STORY}}

Generate:
1. A short, impactful text for the thumbnail (1-4 words, ALL CAPS style)
2. An image generation prompt for the thumbnail background

The thumbnail should:
- Be eye-catching and clickable
- Match the {{NICHE}} aesthetic
- Create curiosity/emotion
- Use contrasting colors for visibility

Respond in JSON:
{
  "text": "THUMBNAIL TEXT",
  "imagePrompt": "Detailed image prompt for AI generation...",
  "style": {
    "fontSize": 72,
    "fontColor": "#FFFFFF",
    "strokeColor": "#000000",
    "textPosition": "center",
    "overlay": "dark"
  }
}`,
    },
  });

  // Create default settings
  const defaultSettings = [
    { key: 'adspower_url', value: 'http://localhost:50325' },
    { key: 'scheduler_cron', value: '0 */2 * * *' },
    { key: 'output_dir', value: './output' },
  ];

  for (const setting of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }

  console.log('Seed completed!');
  console.log(`  Niches: ${niches.length}`);
  console.log(`  Languages: ${languages.length}`);
  console.log('  Prompts: 3 defaults');
  console.log('  Settings: 3 defaults');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
