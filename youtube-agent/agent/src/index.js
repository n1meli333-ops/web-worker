/**
 * YouTube Agent - Main Entry Point
 *
 * Starts:
 * 1. Telegram Bot (notifications & control)
 * 2. Pipeline Scheduler (automated video creation)
 *
 * Everything runs as a single process.
 * The scheduler checks channels on a cron and queues pipelines.
 * The telegram bot provides control interface.
 */

const YouTubeAgentBot = require('../../bot/src/index');
const PipelineScheduler = require('./pipeline/scheduler');
const logger = require('./utils/logger');

async function main() {
  logger.info('==============================');
  logger.info('YouTube Agent starting...');
  logger.info('==============================');

  // 1. Start Telegram Bot
  const bot = new YouTubeAgentBot();
  bot.start();

  // 2. Start Pipeline Scheduler
  const scheduler = new PipelineScheduler(bot);
  bot.setScheduler(scheduler);
  scheduler.start();

  logger.info('YouTube Agent is running');

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down...');
    scheduler.stop();
    bot.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Keep process alive
  process.on('uncaughtException', (error) => {
    logger.error(`Uncaught exception: ${error.message}`, { stack: error.stack });
  });

  process.on('unhandledRejection', (reason) => {
    logger.error(`Unhandled rejection: ${reason}`);
  });
}

main().catch((error) => {
  logger.error(`Fatal error: ${error.message}`);
  process.exit(1);
});
