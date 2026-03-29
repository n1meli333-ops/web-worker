/**
 * Pipeline Scheduler
 *
 * Runs on a cron schedule, checks which channels need new videos,
 * and triggers pipelines accordingly.
 *
 * Logic:
 * - Check each active channel
 * - If upload frequency requires a new video → start pipeline
 * - Respect concurrent pipeline limits (browser profiles are limited)
 * - Handle retries for failed pipelines
 */

const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const PQueue = require('p-queue').default;
const PipelineOrchestrator = require('./orchestrator');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

class PipelineScheduler {
  constructor(telegramBot) {
    this.orchestrator = new PipelineOrchestrator(telegramBot);
    this.telegram = telegramBot;
    // Process one pipeline at a time (browser profiles can't be shared)
    this.queue = new PQueue({ concurrency: 1 });
    this.cronJob = null;
    this.isRunning = false;
  }

  /**
   * Start the scheduler
   */
  start() {
    // Run every hour to check for channels needing videos
    const schedule = process.env.SCHEDULER_CRON || '0 */1 * * *';

    this.cronJob = cron.schedule(schedule, async () => {
      if (this.isRunning) {
        logger.info('Scheduler: previous run still in progress, skipping');
        return;
      }

      try {
        this.isRunning = true;
        await this.checkAndSchedule();
      } catch (error) {
        logger.error(`Scheduler error: ${error.message}`);
      } finally {
        this.isRunning = false;
      }
    });

    logger.info(`Scheduler started with cron: ${schedule}`);

    // Also run immediately on start
    this.checkAndSchedule().catch(err => {
      logger.error(`Initial schedule check failed: ${err.message}`);
    });
  }

  /**
   * Check all channels and schedule pipelines as needed
   */
  async checkAndSchedule() {
    logger.info('Checking channels for scheduled video creation...');

    const channels = await prisma.channel.findMany({
      where: { isActive: true },
      include: {
        pipelines: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    for (const channel of channels) {
      try {
        const shouldCreate = await this._shouldCreateVideo(channel);

        if (shouldCreate) {
          logger.info(`Scheduling pipeline for channel: ${channel.name}`);
          this.queue.add(async () => {
            try {
              await this.orchestrator.runPipeline(channel.id);
            } catch (error) {
              logger.error(`Pipeline failed for ${channel.name}: ${error.message}`);
            }
          });
        }
      } catch (error) {
        logger.error(`Error checking channel ${channel.name}: ${error.message}`);
      }
    }

    const queueSize = this.queue.size + this.queue.pending;
    if (queueSize > 0) {
      logger.info(`${queueSize} pipelines queued`);
      await this.telegram?.sendNotification(`📋 ${queueSize} video(s) queued for creation`);
    }
  }

  /**
   * Determine if a channel needs a new video
   */
  async _shouldCreateVideo(channel) {
    const { pipelines, uploadFrequency } = channel;

    // Check if there's already a running pipeline
    const runningPipeline = pipelines.find(p =>
      !['COMPLETED', 'FAILED'].includes(p.status)
    );

    if (runningPipeline) {
      logger.debug(`Channel ${channel.name} has running pipeline, skipping`);
      return false;
    }

    // Check how many videos were created today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayCount = await prisma.pipeline.count({
      where: {
        channelId: channel.id,
        status: 'COMPLETED',
        completedAt: { gte: today },
      },
    });

    if (todayCount >= uploadFrequency) {
      logger.debug(`Channel ${channel.name}: already made ${todayCount}/${uploadFrequency} videos today`);
      return false;
    }

    return true;
  }

  /**
   * Manually trigger a pipeline for a specific channel
   */
  async triggerPipeline(channelId) {
    logger.info(`Manually triggering pipeline for channel: ${channelId}`);
    return this.queue.add(() => this.orchestrator.runPipeline(channelId));
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      logger.info('Scheduler stopped');
    }
  }

  /**
   * Get queue status
   */
  getStatus() {
    return {
      queueSize: this.queue.size,
      pending: this.queue.pending,
      isRunning: this.isRunning,
    };
  }
}

module.exports = PipelineScheduler;
