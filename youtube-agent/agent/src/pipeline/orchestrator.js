/**
 * Pipeline Orchestrator
 *
 * The brain of the YouTube Agent.
 * Manages the complete video creation pipeline:
 *
 * 1. Analyze niche & competitors → pick idea
 * 2. Write story using Claude
 * 3. Generate voiceover via ElevenLabs
 * 4. Extract timestamps via AssemblyAI
 * 5. Generate video prompts (matched to timestamps)
 * 6. Generate videos in Flow
 * 7. Assemble final video with FFmpeg
 * 8. Generate thumbnail (image + text)
 * 9. Publish to YouTube (as draft)
 *
 * Each step updates the pipeline status in the database
 * and sends notifications via Telegram.
 */

const { PrismaClient } = require('@prisma/client');
const AdsPowerClient = require('../browser/adspower');
const ClaudeService = require('../services/claude');
const ElevenLabsService = require('../services/elevenlabs');
const AssemblyAIService = require('../services/assemblyai');
const FlowService = require('../services/flow');
const FFmpegService = require('../services/ffmpeg');
const ThumbnailService = require('../services/thumbnail');
const YouTubeService = require('../services/youtube');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

class PipelineOrchestrator {
  constructor(telegramBot) {
    this.adspower = new AdsPowerClient();
    this.ffmpeg = new FFmpegService();
    this.thumbnailService = new ThumbnailService();
    this.telegram = telegramBot;
    this.isRunning = false;
  }

  /**
   * Execute the full pipeline for a channel
   */
  async runPipeline(channelId) {
    // Load channel with all related data
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      include: {
        niche: true,
        language: true,
        voice: true,
        profile: true,
        storyPrompt: true,
        videoPromptsPrompt: true,
        thumbnailPrompt: true,
        competitors: true,
      },
    });

    if (!channel) {
      throw new Error(`Channel not found: ${channelId}`);
    }

    // Create pipeline record
    const pipeline = await prisma.pipeline.create({
      data: {
        channelId: channel.id,
        status: 'PENDING',
      },
    });

    logger.info(`Pipeline started: ${pipeline.id} for channel "${channel.name}"`);
    await this._notify(`🎬 Pipeline started for channel "${channel.name}"`);

    try {
      // Load browser profiles for different services
      const profiles = await this._loadProfiles();

      // ==================== STEP 1: IDEA GENERATION ====================
      await this._updateStatus(pipeline.id, 'GENERATING_IDEA');
      await this._notify(`💡 Generating idea for "${channel.name}"...`);

      const claude = new ClaudeService(this.adspower);
      await claude.init(profiles.CLAUDE);

      // Analyze competitors first
      let competitorData = {};
      if (channel.competitors.length > 0) {
        const youtube = new YouTubeService(this.adspower);
        await youtube.init(profiles.YOUTUBE);

        for (const competitor of channel.competitors.slice(0, 3)) {
          try {
            const data = await youtube.analyzeChannel(competitor.url);
            competitorData[competitor.name] = data;
          } catch (error) {
            logger.warn(`Failed to analyze competitor ${competitor.name}: ${error.message}`);
          }
        }
      }

      const idea = await claude.generateIdea(
        channel.niche.name,
        `Channel: ${channel.name}, Language: ${channel.language.name}, ` +
        `Video length: ${channel.videoMinLength}-${channel.videoMaxLength} minutes`,
        competitorData
      );

      await prisma.pipeline.update({
        where: { id: pipeline.id },
        data: {
          idea: JSON.stringify(idea),
          storyTitle: idea.title,
        },
      });

      await this._notify(`💡 Idea: "${idea.title}"`);

      // ==================== STEP 2: WRITE STORY ====================
      await this._updateStatus(pipeline.id, 'WRITING_STORY');
      await this._notify(`✍️ Writing story...`);

      const storyPromptTemplate = channel.storyPrompt?.content || await this._getDefaultPrompt('story_generation');

      const story = await claude.writeStory(
        idea,
        storyPromptTemplate,
        channel.niche.name,
        channel.language.name
      );

      await prisma.pipeline.update({
        where: { id: pipeline.id },
        data: { story },
      });

      await this._notify(`✍️ Story written (${story.length} chars)`);

      // ==================== STEP 3: GENERATE VOICEOVER ====================
      await this._updateStatus(pipeline.id, 'GENERATING_VOICE');
      await this._notify(`🎙️ Generating voiceover...`);

      const elevenlabs = new ElevenLabsService(this.adspower);
      await elevenlabs.init(profiles.ELEVENLABS);

      const voiceoverPath = await elevenlabs.generateVoiceover(
        story,
        channel.voice?.name,
        pipeline.id
      );

      // Get audio duration
      const audioDuration = await this.ffmpeg.getDuration(
        Array.isArray(voiceoverPath) ? voiceoverPath[0] : voiceoverPath
      );

      await prisma.pipeline.update({
        where: { id: pipeline.id },
        data: {
          voiceoverUrl: Array.isArray(voiceoverPath) ? voiceoverPath.join(',') : voiceoverPath,
          voiceoverDuration: audioDuration,
        },
      });

      await this._notify(`🎙️ Voiceover generated (${Math.round(audioDuration / 60)} min)`);

      // ==================== STEP 4: EXTRACT TIMESTAMPS ====================
      await this._updateStatus(pipeline.id, 'EXTRACTING_TIMESTAMPS');
      await this._notify(`⏱️ Extracting timestamps...`);

      const assemblyai = new AssemblyAIService({
        apiKey: process.env.ASSEMBLYAI_API_KEY,
        adspower: this.adspower,
        profileSerial: profiles.ASSEMBLYAI,
      });

      const audioFile = Array.isArray(voiceoverPath) ? voiceoverPath[0] : voiceoverPath;
      const timestamps = await assemblyai.extractTimestamps(audioFile);

      await prisma.pipeline.update({
        where: { id: pipeline.id },
        data: { timestamps },
      });

      await this._notify(`⏱️ ${timestamps.length} segments extracted`);

      // ==================== STEP 5: GENERATE VIDEO PROMPTS ====================
      await this._updateStatus(pipeline.id, 'GENERATING_VIDEO_PROMPTS');
      await this._notify(`🎥 Generating video prompts...`);

      const videoPromptTemplate = channel.videoPromptsPrompt?.content || await this._getDefaultPrompt('video_prompts');

      const videoPrompts = await claude.generateVideoPrompts(story, timestamps, videoPromptTemplate);

      await prisma.pipeline.update({
        where: { id: pipeline.id },
        data: { videoPrompts },
      });

      await claude.close();
      await this._notify(`🎥 ${videoPrompts.length || 'N/A'} video prompts generated`);

      // ==================== STEP 6: GENERATE VIDEOS ====================
      await this._updateStatus(pipeline.id, 'GENERATING_VIDEOS');
      await this._notify(`🎬 Generating videos in Flow (this may take a while)...`);

      const flow = new FlowService(this.adspower);
      await flow.init(profiles.FLOW);

      const prompts = Array.isArray(videoPrompts)
        ? videoPrompts
        : videoPrompts.prompts || Object.values(videoPrompts);

      const videoFiles = await flow.generateVideos(prompts, pipeline.id);

      await prisma.pipeline.update({
        where: { id: pipeline.id },
        data: { videoFiles },
      });

      await this._notify(`🎬 ${videoFiles.length} videos generated`);

      // ==================== STEP 7: ASSEMBLE VIDEO ====================
      await this._updateStatus(pipeline.id, 'ASSEMBLING_VIDEO');
      await this._notify(`🔧 Assembling final video...`);

      const finalVideoPath = await this.ffmpeg.assembleVideo(
        videoFiles,
        audioFile,
        timestamps,
        pipeline.id
      );

      await prisma.pipeline.update({
        where: { id: pipeline.id },
        data: { assembledVideoPath: finalVideoPath },
      });

      await this._notify(`🔧 Video assembled`);

      // ==================== STEP 8: GENERATE THUMBNAIL ====================
      await this._updateStatus(pipeline.id, 'GENERATING_THUMBNAIL');
      await this._notify(`🖼️ Generating thumbnail...`);

      // Use Claude to generate thumbnail text and image prompt
      const claudeForThumb = new ClaudeService(this.adspower);
      await claudeForThumb.init(profiles.CLAUDE);

      const thumbnailPromptTemplate = channel.thumbnailPrompt?.content || await this._getDefaultPrompt('thumbnail_prompt');

      const thumbnailData = await claudeForThumb.generateThumbnail(
        idea.title,
        story,
        channel.niche.name,
        thumbnailPromptTemplate
      );

      await claudeForThumb.close();

      // Generate thumbnail image in Flow
      const rawThumbnailPath = await flow.generateThumbnailImage(
        thumbnailData.imagePrompt || thumbnailData.prompt,
        pipeline.id
      );

      await flow.close();

      // Add text overlay
      const finalThumbnailPath = await this.thumbnailService.createThumbnail(
        rawThumbnailPath,
        thumbnailData.text || thumbnailData.thumbnailText || idea.title.substring(0, 30),
        thumbnailData.style || {},
        pipeline.id
      );

      await prisma.pipeline.update({
        where: { id: pipeline.id },
        data: {
          thumbnailText: thumbnailData.text,
          thumbnailPrompt: thumbnailData.imagePrompt,
          thumbnailPath: finalThumbnailPath,
        },
      });

      await this._notify(`🖼️ Thumbnail created`);

      // ==================== STEP 9: GENERATE METADATA ====================
      const claudeForMeta = new ClaudeService(this.adspower);
      await claudeForMeta.init(profiles.CLAUDE);

      const metadata = await claudeForMeta.generateMetadata(
        idea.title,
        story,
        channel.niche.name,
        channel.language.name
      );

      await claudeForMeta.close();

      await prisma.pipeline.update({
        where: { id: pipeline.id },
        data: {
          videoTitle: metadata.title,
          videoDescription: metadata.description,
          videoTags: metadata.tags,
        },
      });

      // ==================== STEP 10: PUBLISH TO YOUTUBE ====================
      await this._updateStatus(pipeline.id, 'PUBLISHING');
      await this._notify(`📤 Publishing to YouTube as draft...`);

      const youtube = new YouTubeService(this.adspower);
      await youtube.init(profiles.YOUTUBE);

      const publishResult = await youtube.uploadVideo({
        videoPath: finalVideoPath,
        title: metadata.title,
        description: metadata.description,
        tags: metadata.tags,
        thumbnailPath: finalThumbnailPath,
        channelUrl: channel.url,
      });

      await youtube.close();

      // ==================== COMPLETE ====================
      const video = await prisma.video.create({
        data: {
          channelId: channel.id,
          title: metadata.title,
          description: metadata.description,
          tags: metadata.tags,
          videoPath: finalVideoPath,
          thumbnailPath: finalThumbnailPath,
          youtubeUrl: publishResult.videoUrl,
          status: 'DRAFT',
        },
      });

      await prisma.pipeline.update({
        where: { id: pipeline.id },
        data: {
          status: 'COMPLETED',
          videoId: video.id,
          completedAt: new Date(),
        },
      });

      await this._notify(
        `✅ Pipeline completed for "${channel.name}"!\n` +
        `📹 Title: "${metadata.title}"\n` +
        `🔗 ${publishResult.videoUrl || 'Check YouTube Studio'}\n` +
        `⏱️ Video is saved as DRAFT - go set preview & publish!`
      );

      logger.info(`Pipeline ${pipeline.id} completed successfully`);
      return { success: true, pipelineId: pipeline.id, videoId: video.id };

    } catch (error) {
      logger.error(`Pipeline ${pipeline.id} failed: ${error.message}`, { stack: error.stack });

      await prisma.pipeline.update({
        where: { id: pipeline.id },
        data: {
          status: 'FAILED',
          error: error.message,
        },
      });

      await this._notify(
        `❌ Pipeline FAILED for "${channel.name}"\n` +
        `Error: ${error.message}\n` +
        `Pipeline ID: ${pipeline.id}`
      );

      // Clean up browser profiles
      await this.adspower.closeAll();

      throw error;
    }
  }

  /**
   * Load browser profiles from database
   * Returns map: ProfileType -> serialNumber
   */
  async _loadProfiles() {
    const profiles = await prisma.browserProfile.findMany({
      where: { isActive: true },
    });

    const profileMap = {};
    for (const profile of profiles) {
      profileMap[profile.type] = profile.adspowerSerial;
    }

    // Validate required profiles
    const required = ['CLAUDE', 'FLOW', 'YOUTUBE', 'ELEVENLABS'];
    for (const type of required) {
      if (!profileMap[type]) {
        throw new Error(`Missing browser profile for: ${type}. Add it in the dashboard.`);
      }
    }

    return profileMap;
  }

  /**
   * Get default prompt template
   */
  async _getDefaultPrompt(type) {
    const prompt = await prisma.prompt.findFirst({
      where: { type, isDefault: true },
    });
    return prompt?.content || `Default prompt for ${type}. Configure in dashboard.`;
  }

  /**
   * Update pipeline status in database
   */
  async _updateStatus(pipelineId, status) {
    await prisma.pipeline.update({
      where: { id: pipelineId },
      data: {
        status,
        currentStep: status,
        startedAt: status === 'GENERATING_IDEA' ? new Date() : undefined,
      },
    });
  }

  /**
   * Send notification via Telegram
   */
  async _notify(message) {
    if (this.telegram) {
      try {
        await this.telegram.sendNotification(message);
      } catch (error) {
        logger.warn(`Telegram notification failed: ${error.message}`);
      }
    }
  }
}

module.exports = PipelineOrchestrator;
