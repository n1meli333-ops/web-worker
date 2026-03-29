/**
 * Telegram Bot for YouTube Agent
 *
 * Features:
 * - Receive notifications about pipeline status
 * - View channel status and statistics
 * - Manually trigger video creation
 * - Pause/resume channels
 * - Ask the agent questions (proxied to Claude)
 * - Approve/reject agent decisions
 */

const TelegramBot = require('node-telegram-bot-api');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class YouTubeAgentBot {
  constructor() {
    this.token = process.env.TELEGRAM_BOT_TOKEN;
    this.chatId = process.env.TELEGRAM_CHAT_ID; // Your personal chat ID
    this.bot = null;
    this.scheduler = null; // Set externally after initialization
  }

  /**
   * Initialize and start the bot
   */
  start() {
    if (!this.token) {
      console.warn('TELEGRAM_BOT_TOKEN not set, bot disabled');
      return;
    }

    this.bot = new TelegramBot(this.token, { polling: true });
    this._registerCommands();
    console.log('Telegram bot started');
  }

  /**
   * Set the scheduler reference for triggering pipelines
   */
  setScheduler(scheduler) {
    this.scheduler = scheduler;
  }

  /**
   * Send a notification to the owner
   */
  async sendNotification(message) {
    if (!this.bot || !this.chatId) return;

    try {
      await this.bot.sendMessage(this.chatId, message, { parse_mode: 'HTML' });
    } catch (error) {
      console.error(`Failed to send Telegram message: ${error.message}`);
    }
  }

  /**
   * Ask the owner a question and wait for response
   */
  async askQuestion(question, options = {}) {
    if (!this.bot || !this.chatId) return null;

    const timeout = options.timeout || 300000; // 5 minutes default

    await this.bot.sendMessage(this.chatId, `❓ ${question}`, { parse_mode: 'HTML' });

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        resolve(null); // Timeout - no answer
      }, timeout);

      const listener = (msg) => {
        if (msg.chat.id.toString() === this.chatId.toString()) {
          clearTimeout(timer);
          this.bot.removeListener('message', listener);
          resolve(msg.text);
        }
      };

      this.bot.on('message', listener);
    });
  }

  /**
   * Register bot commands
   */
  _registerCommands() {
    // /start - Welcome message
    this.bot.onText(/\/start/, (msg) => {
      if (!this._isAuthorized(msg)) return;

      this.bot.sendMessage(msg.chat.id,
        `🤖 <b>YouTube Agent Bot</b>\n\n` +
        `Commands:\n` +
        `/status - View all channels status\n` +
        `/channels - List channels\n` +
        `/create [channel] - Create video for channel\n` +
        `/pause [channel] - Pause channel\n` +
        `/resume [channel] - Resume channel\n` +
        `/pipeline [id] - View pipeline details\n` +
        `/queue - View pipeline queue\n` +
        `/logs - Recent agent logs\n` +
        `/stats - Statistics overview\n\n` +
        `Your Chat ID: <code>${msg.chat.id}</code>`,
        { parse_mode: 'HTML' }
      );
    });

    // /status - Overview of all channels
    this.bot.onText(/\/status/, async (msg) => {
      if (!this._isAuthorized(msg)) return;

      const channels = await prisma.channel.findMany({
        include: {
          niche: true,
          _count: { select: { videos: true, pipelines: true } },
          pipelines: {
            where: { status: { notIn: ['COMPLETED', 'FAILED'] } },
            take: 1,
          },
        },
      });

      let text = '📊 <b>Channel Status</b>\n\n';
      for (const ch of channels) {
        const statusIcon = ch.isActive ? '🟢' : '🔴';
        const running = ch.pipelines.length > 0 ? `⚙️ ${ch.pipelines[0].status}` : '💤 Idle';
        text += `${statusIcon} <b>${ch.name}</b> (${ch.niche.name})\n`;
        text += `   Videos: ${ch._count.videos} | ${running}\n\n`;
      }

      this.bot.sendMessage(msg.chat.id, text || 'No channels configured.', { parse_mode: 'HTML' });
    });

    // /channels - List all channels
    this.bot.onText(/\/channels/, async (msg) => {
      if (!this._isAuthorized(msg)) return;

      const channels = await prisma.channel.findMany({
        include: { niche: true, language: true, voice: true },
      });

      let text = '📺 <b>Channels</b>\n\n';
      for (const ch of channels) {
        text += `<b>${ch.name}</b>\n`;
        text += `  Niche: ${ch.niche.name}\n`;
        text += `  Language: ${ch.language.name}\n`;
        text += `  Voice: ${ch.voice?.name || 'Not set'}\n`;
        text += `  Upload freq: ${ch.uploadFrequency}/day\n`;
        text += `  Active: ${ch.isActive ? 'Yes' : 'No'}\n\n`;
      }

      this.bot.sendMessage(msg.chat.id, text || 'No channels.', { parse_mode: 'HTML' });
    });

    // /create [channel name] - Trigger pipeline
    this.bot.onText(/\/create (.+)/, async (msg, match) => {
      if (!this._isAuthorized(msg)) return;

      const channelName = match[1].trim();
      const channel = await prisma.channel.findFirst({
        where: { name: { contains: channelName, mode: 'insensitive' } },
      });

      if (!channel) {
        this.bot.sendMessage(msg.chat.id, `❌ Channel not found: "${channelName}"`);
        return;
      }

      if (!this.scheduler) {
        this.bot.sendMessage(msg.chat.id, '❌ Scheduler not initialized');
        return;
      }

      this.bot.sendMessage(msg.chat.id, `🚀 Starting pipeline for "${channel.name}"...`);

      try {
        await this.scheduler.triggerPipeline(channel.id);
      } catch (error) {
        this.bot.sendMessage(msg.chat.id, `❌ Failed: ${error.message}`);
      }
    });

    // /pause [channel name]
    this.bot.onText(/\/pause (.+)/, async (msg, match) => {
      if (!this._isAuthorized(msg)) return;

      const channelName = match[1].trim();
      const channel = await prisma.channel.findFirst({
        where: { name: { contains: channelName, mode: 'insensitive' } },
      });

      if (!channel) {
        this.bot.sendMessage(msg.chat.id, `❌ Channel not found: "${channelName}"`);
        return;
      }

      await prisma.channel.update({
        where: { id: channel.id },
        data: { isActive: false },
      });

      this.bot.sendMessage(msg.chat.id, `⏸️ Channel "${channel.name}" paused`);
    });

    // /resume [channel name]
    this.bot.onText(/\/resume (.+)/, async (msg, match) => {
      if (!this._isAuthorized(msg)) return;

      const channelName = match[1].trim();
      const channel = await prisma.channel.findFirst({
        where: { name: { contains: channelName, mode: 'insensitive' } },
      });

      if (!channel) {
        this.bot.sendMessage(msg.chat.id, `❌ Channel not found: "${channelName}"`);
        return;
      }

      await prisma.channel.update({
        where: { id: channel.id },
        data: { isActive: true },
      });

      this.bot.sendMessage(msg.chat.id, `▶️ Channel "${channel.name}" resumed`);
    });

    // /pipeline [id] - View pipeline details
    this.bot.onText(/\/pipeline (.+)/, async (msg, match) => {
      if (!this._isAuthorized(msg)) return;

      const pipelineId = match[1].trim();
      const pipeline = await prisma.pipeline.findUnique({
        where: { id: pipelineId },
        include: { channel: true },
      });

      if (!pipeline) {
        this.bot.sendMessage(msg.chat.id, `❌ Pipeline not found: ${pipelineId}`);
        return;
      }

      let text = `📋 <b>Pipeline ${pipelineId.substring(0, 8)}...</b>\n\n`;
      text += `Channel: ${pipeline.channel.name}\n`;
      text += `Status: ${pipeline.status}\n`;
      text += `Title: ${pipeline.storyTitle || 'N/A'}\n`;
      text += `Started: ${pipeline.startedAt?.toLocaleString() || 'N/A'}\n`;
      text += `Completed: ${pipeline.completedAt?.toLocaleString() || 'N/A'}\n`;
      if (pipeline.error) text += `\n❌ Error: ${pipeline.error}`;

      this.bot.sendMessage(msg.chat.id, text, { parse_mode: 'HTML' });
    });

    // /queue - View queue status
    this.bot.onText(/\/queue/, (msg) => {
      if (!this._isAuthorized(msg)) return;

      if (!this.scheduler) {
        this.bot.sendMessage(msg.chat.id, '❌ Scheduler not initialized');
        return;
      }

      const status = this.scheduler.getStatus();
      this.bot.sendMessage(msg.chat.id,
        `📋 <b>Queue Status</b>\n\n` +
        `In queue: ${status.queueSize}\n` +
        `Running: ${status.pending}\n` +
        `Scheduler active: ${status.isRunning ? 'Yes' : 'No'}`,
        { parse_mode: 'HTML' }
      );
    });

    // /logs - Recent logs
    this.bot.onText(/\/logs/, async (msg) => {
      if (!this._isAuthorized(msg)) return;

      const logs = await prisma.agentLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      let text = '📝 <b>Recent Logs</b>\n\n';
      for (const log of logs) {
        const icon = log.level === 'error' ? '❌' : log.level === 'warn' ? '⚠️' : 'ℹ️';
        text += `${icon} [${log.source}] ${log.message}\n`;
        text += `   <i>${log.createdAt.toLocaleString()}</i>\n\n`;
      }

      this.bot.sendMessage(msg.chat.id, text || 'No logs.', { parse_mode: 'HTML' });
    });

    // /stats - Statistics
    this.bot.onText(/\/stats/, async (msg) => {
      if (!this._isAuthorized(msg)) return;

      const totalVideos = await prisma.video.count();
      const todayVideos = await prisma.video.count({
        where: {
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      });
      const activePipelines = await prisma.pipeline.count({
        where: { status: { notIn: ['COMPLETED', 'FAILED'] } },
      });
      const failedPipelines = await prisma.pipeline.count({
        where: { status: 'FAILED', createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      });

      this.bot.sendMessage(msg.chat.id,
        `📊 <b>Statistics</b>\n\n` +
        `Total videos: ${totalVideos}\n` +
        `Today: ${todayVideos}\n` +
        `Active pipelines: ${activePipelines}\n` +
        `Failed (24h): ${failedPipelines}`,
        { parse_mode: 'HTML' }
      );
    });
  }

  /**
   * Check if the message is from the authorized user
   */
  _isAuthorized(msg) {
    if (!this.chatId) return true; // No restriction if not configured
    return msg.chat.id.toString() === this.chatId.toString();
  }

  /**
   * Stop the bot
   */
  stop() {
    if (this.bot) {
      this.bot.stopPolling();
    }
  }
}

module.exports = YouTubeAgentBot;
