/**
 * ElevenLabs Browser Automation
 *
 * Generates voiceover through browser (third-party ElevenLabs site).
 * Opens the site in AdsPower profile, pastes text, generates, downloads audio.
 */

const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

class ElevenLabsService {
  constructor(adspower) {
    this.adspower = adspower;
    this.profileSerial = null;
    this.page = null;
    this.outputDir = process.env.OUTPUT_DIR || './output';
  }

  async init(profileSerial) {
    this.profileSerial = profileSerial;
    const connection = await this.adspower.connectToProfile(profileSerial);
    this.page = connection.page;
    logger.info('ElevenLabs service initialized');
  }

  /**
   * Navigate to ElevenLabs site
   * Note: this is the third-party site URL, not elevenlabs.io directly
   * The actual URL should be configured in environment variables
   */
  async openSite() {
    const siteUrl = process.env.ELEVENLABS_SITE_URL || 'https://elevenlabs.io/app/speech-synthesis';
    await this.page.goto(siteUrl, { waitUntil: 'networkidle', timeout: 60000 });
    await this.adspower.humanDelay(2000, 4000);
    logger.info('ElevenLabs site opened');
  }

  /**
   * Select a specific voice by name
   */
  async selectVoice(voiceName) {
    logger.info(`Selecting voice: ${voiceName}`);

    // Click on voice selector dropdown
    const voiceSelector = await this.page.locator('[data-testid="voice-selector"], .voice-selector, [class*="voice"]').first();
    if (await voiceSelector.isVisible()) {
      await voiceSelector.click();
      await this.adspower.humanDelay(500, 1000);

      // Search for voice
      const searchInput = await this.page.locator('input[placeholder*="Search"], input[type="search"]').first();
      if (await searchInput.isVisible()) {
        await searchInput.fill(voiceName);
        await this.adspower.humanDelay(1000, 2000);
      }

      // Click on matching voice
      const voiceOption = this.page.locator(`text=${voiceName}`).first();
      if (await voiceOption.isVisible()) {
        await voiceOption.click();
        await this.adspower.humanDelay(500, 1000);
      }
    }

    logger.info(`Voice selected: ${voiceName}`);
  }

  /**
   * Generate voiceover from text
   * Splits long text into chunks if needed
   */
  async generateVoiceover(text, voiceName, pipelineId) {
    await this.openSite();

    if (voiceName) {
      await this.selectVoice(voiceName);
    }

    // Create output directory for this pipeline
    const outputPath = path.join(this.outputDir, pipelineId, 'audio');
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
    }

    // Split text into chunks if too long (ElevenLabs has character limits)
    const maxChunkSize = 5000;
    const chunks = this._splitText(text, maxChunkSize);
    const audioFiles = [];

    for (let i = 0; i < chunks.length; i++) {
      logger.info(`Generating voiceover chunk ${i + 1}/${chunks.length}`);

      // Find text input area and paste chunk
      const textArea = this.page.locator('textarea, [contenteditable="true"]').first();
      await textArea.click();
      await this.page.keyboard.press('Control+A');
      await this.page.keyboard.press('Backspace');
      await this.adspower.humanDelay(300, 500);

      // Paste text via clipboard for speed
      await this.page.evaluate((txt) => {
        navigator.clipboard.writeText(txt);
      }, chunks[i]);
      await this.page.keyboard.press('Control+V');
      await this.adspower.humanDelay(500, 1000);

      // Click generate button
      const generateBtn = this.page.locator('button:has-text("Generate"), button[data-testid="generate"]').first();
      await generateBtn.click();

      // Wait for generation to complete
      await this._waitForGeneration();

      // Download the audio file
      const filePath = path.join(outputPath, `chunk_${i}.mp3`);
      await this._downloadAudio(filePath);
      audioFiles.push(filePath);

      await this.adspower.humanDelay(1000, 2000);
    }

    // If multiple chunks, merge them
    if (audioFiles.length === 1) {
      const finalPath = path.join(outputPath, 'voiceover.mp3');
      fs.renameSync(audioFiles[0], finalPath);
      return finalPath;
    }

    return audioFiles;
  }

  /**
   * Wait for ElevenLabs to finish generating audio
   */
  async _waitForGeneration() {
    const maxWait = 120000; // 2 minutes
    const startTime = Date.now();

    while (Date.now() - startTime < maxWait) {
      // Check for loading/progress indicators
      const isGenerating = await this.page.evaluate(() => {
        const loading = document.querySelector('[class*="loading"], [class*="progress"], [class*="generating"]');
        const spinner = document.querySelector('[class*="spinner"], [role="progressbar"]');
        return !!(loading || spinner);
      });

      if (!isGenerating) {
        // Check if download/play button appeared
        const hasResult = await this.page.evaluate(() => {
          const downloadBtn = document.querySelector('button:has-text("Download"), [class*="download"], a[download]');
          const playBtn = document.querySelector('button[aria-label*="Play"], [class*="play-button"]');
          return !!(downloadBtn || playBtn);
        });

        if (hasResult) break;
      }

      await this.adspower.humanDelay(2000, 3000);
    }

    logger.info('Voiceover generation completed');
  }

  /**
   * Download the generated audio file
   */
  async _downloadAudio(savePath) {
    // Setup download listener
    const downloadPromise = this.page.waitForEvent('download', { timeout: 30000 });

    // Click download button
    const downloadBtn = this.page.locator('button:has-text("Download"), [class*="download"], a[download]').first();
    await downloadBtn.click();

    try {
      const download = await downloadPromise;
      await download.saveAs(savePath);
      logger.info(`Audio saved to: ${savePath}`);
    } catch {
      // Fallback: try to get audio from page
      logger.warn('Download event not caught, trying alternative download method');
      const audioUrl = await this.page.evaluate(() => {
        const audio = document.querySelector('audio source, audio[src]');
        return audio?.src || audio?.getAttribute('src');
      });

      if (audioUrl) {
        const response = await this.page.request.get(audioUrl);
        const buffer = await response.body();
        fs.writeFileSync(savePath, buffer);
        logger.info(`Audio saved via URL: ${savePath}`);
      }
    }
  }

  /**
   * Split text into chunks at sentence boundaries
   */
  _splitText(text, maxSize) {
    if (text.length <= maxSize) return [text];

    const chunks = [];
    const sentences = text.split(/(?<=[.!?])\s+/);
    let currentChunk = '';

    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > maxSize) {
        if (currentChunk) chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += ' ' + sentence;
      }
    }

    if (currentChunk.trim()) chunks.push(currentChunk.trim());
    return chunks;
  }

  async close() {
    if (this.profileSerial) {
      await this.adspower.stopProfile(this.profileSerial);
    }
  }
}

module.exports = ElevenLabsService;
