/**
 * Flow Video Generation Service (Browser Automation)
 *
 * Controls Flow (Veo 3.1 / Nano Banana Pro) through browser.
 * The user has a script/extension in Flow that accepts a pack of prompts
 * and generates videos automatically, saving them numbered.
 *
 * Workflow:
 * 1. Open Flow in AdsPower profile
 * 2. Navigate to the script/extension
 * 3. Paste the pack of video prompts
 * 4. Wait for all videos to generate
 * 5. Download numbered video files
 */

const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

class FlowService {
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
    logger.info('Flow service initialized');
  }

  /**
   * Navigate to the Flow script page
   * The URL should be configured per setup
   */
  async openFlowScript() {
    const flowUrl = process.env.FLOW_SCRIPT_URL;
    if (!flowUrl) {
      throw new Error('FLOW_SCRIPT_URL not configured');
    }

    await this.page.goto(flowUrl, { waitUntil: 'networkidle', timeout: 60000 });
    await this.adspower.humanDelay(2000, 4000);
    logger.info('Flow script page opened');
  }

  /**
   * Submit a pack of video prompts to the Flow script
   * The script expects prompts in a specific format (one per line or JSON)
   *
   * @param {Array} prompts - Array of {index, prompt, duration} objects
   * @param {string} pipelineId - For organizing output files
   * @returns {Array} paths to generated video files
   */
  async generateVideos(prompts, pipelineId) {
    logger.info(`Starting video generation: ${prompts.length} prompts`);

    await this.openFlowScript();

    // Create output directory
    const outputPath = path.join(this.outputDir, pipelineId, 'videos');
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
    }

    // Format prompts for the Flow script
    // This format may need adjustment based on the actual script
    const promptPack = this._formatPromptPack(prompts);

    // Find the input area for prompts
    const inputArea = this.page.locator('textarea, [contenteditable="true"], input[type="text"]').first();
    await inputArea.click();
    await this.page.keyboard.press('Control+A');
    await this.page.keyboard.press('Backspace');
    await this.adspower.humanDelay(300, 500);

    // Paste prompt pack via clipboard
    await this.page.evaluate((text) => {
      navigator.clipboard.writeText(text);
    }, promptPack);
    await this.page.keyboard.press('Control+V');
    await this.adspower.humanDelay(500, 1000);

    // Click start/generate button
    const startBtn = this.page.locator(
      'button:has-text("Start"), button:has-text("Generate"), button:has-text("Run"), button:has-text("Submit")'
    ).first();

    if (await startBtn.isVisible()) {
      await startBtn.click();
    }

    logger.info('Video generation started, waiting for completion...');

    // Wait for all videos to generate
    const videoFiles = await this._waitForVideos(prompts.length, outputPath);

    logger.info(`Video generation completed: ${videoFiles.length} files`);
    return videoFiles;
  }

  /**
   * Generate a single thumbnail image through Flow
   */
  async generateThumbnailImage(prompt, pipelineId) {
    logger.info('Generating thumbnail image via Flow');

    // Use a separate page/tab for thumbnail generation
    const thumbnailUrl = process.env.FLOW_IMAGE_URL || process.env.FLOW_SCRIPT_URL;
    await this.page.goto(thumbnailUrl, { waitUntil: 'networkidle', timeout: 60000 });
    await this.adspower.humanDelay(2000, 3000);

    // Input the thumbnail prompt
    const inputArea = this.page.locator('textarea, [contenteditable="true"]').first();
    await inputArea.click();
    await this.page.keyboard.press('Control+A');
    await this.page.keyboard.press('Backspace');

    await this.page.evaluate((text) => {
      navigator.clipboard.writeText(text);
    }, prompt);
    await this.page.keyboard.press('Control+V');
    await this.adspower.humanDelay(500, 1000);

    // Click generate
    const generateBtn = this.page.locator('button:has-text("Generate"), button:has-text("Run")').first();
    if (await generateBtn.isVisible()) {
      await generateBtn.click();
    }

    // Wait for image
    await this._waitForImage();

    // Download image
    const outputPath = path.join(this.outputDir, pipelineId, 'thumbnail_raw.png');
    await this._downloadImage(outputPath);

    return outputPath;
  }

  /**
   * Wait for video generation to complete
   * Monitors progress and downloads files as they become available
   */
  async _waitForVideos(expectedCount, outputPath) {
    const maxWait = 1800000; // 30 minutes for all videos
    const startTime = Date.now();
    const videoFiles = [];

    while (Date.now() - startTime < maxWait) {
      // Check for completion status on page
      const status = await this.page.evaluate(() => {
        // Look for progress indicators
        const progressEl = document.querySelector(
          '[class*="progress"], [class*="status"], [class*="count"]'
        );
        const completeEl = document.querySelector(
          '[class*="complete"], [class*="done"], [class*="finished"]'
        );

        return {
          progress: progressEl?.innerText || '',
          isComplete: !!completeEl,
        };
      });

      logger.debug(`Video generation status: ${status.progress}`);

      if (status.isComplete) break;

      // Check for downloadable videos
      const downloads = await this.page.evaluate(() => {
        const links = document.querySelectorAll('a[download], [class*="download"]');
        return links.length;
      });

      if (downloads >= expectedCount) break;

      await this.adspower.humanDelay(10000, 15000); // Check every 10-15 seconds
    }

    // Download all available videos
    const downloadLinks = await this.page.locator('a[download], [class*="download"] a, button[class*="download"]').all();

    for (let i = 0; i < downloadLinks.length; i++) {
      try {
        const downloadPromise = this.page.waitForEvent('download', { timeout: 60000 });
        await downloadLinks[i].click();
        const download = await downloadPromise;

        const filePath = path.join(outputPath, `video_${i.toString().padStart(3, '0')}.mp4`);
        await download.saveAs(filePath);
        videoFiles.push({ index: i, filePath, fileName: `video_${i.toString().padStart(3, '0')}.mp4` });

        await this.adspower.humanDelay(1000, 2000);
      } catch (error) {
        logger.error(`Failed to download video #${i}: ${error.message}`);
      }
    }

    // If downloads didn't work via events, check the output directory
    // (the Flow script might save files directly to a location)
    if (videoFiles.length === 0) {
      const flowOutputDir = process.env.FLOW_OUTPUT_DIR;
      if (flowOutputDir && fs.existsSync(flowOutputDir)) {
        const files = fs.readdirSync(flowOutputDir)
          .filter(f => f.endsWith('.mp4') || f.endsWith('.webm'))
          .sort();

        for (let i = 0; i < files.length; i++) {
          const srcPath = path.join(flowOutputDir, files[i]);
          const destPath = path.join(outputPath, `video_${i.toString().padStart(3, '0')}.mp4`);
          fs.copyFileSync(srcPath, destPath);
          videoFiles.push({ index: i, filePath: destPath, fileName: files[i] });
        }
      }
    }

    return videoFiles;
  }

  /**
   * Wait for image generation to complete
   */
  async _waitForImage() {
    const maxWait = 120000; // 2 minutes
    const startTime = Date.now();

    while (Date.now() - startTime < maxWait) {
      const hasImage = await this.page.evaluate(() => {
        const img = document.querySelector('[class*="result"] img, [class*="generated"] img, [class*="output"] img');
        return !!img;
      });

      if (hasImage) break;
      await this.adspower.humanDelay(3000, 5000);
    }
  }

  /**
   * Download generated image
   */
  async _downloadImage(savePath) {
    const dir = path.dirname(savePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Try download button first
    const downloadBtn = this.page.locator('button:has-text("Download"), a[download]').first();
    if (await downloadBtn.isVisible()) {
      const downloadPromise = this.page.waitForEvent('download', { timeout: 30000 });
      await downloadBtn.click();
      const download = await downloadPromise;
      await download.saveAs(savePath);
      return;
    }

    // Fallback: extract image URL and download
    const imageUrl = await this.page.evaluate(() => {
      const img = document.querySelector('[class*="result"] img, [class*="generated"] img, [class*="output"] img');
      return img?.src;
    });

    if (imageUrl) {
      const response = await this.page.request.get(imageUrl);
      const buffer = await response.body();
      fs.writeFileSync(savePath, buffer);
    }
  }

  /**
   * Format prompts for the Flow script
   * Override this method based on your script's expected format
   */
  _formatPromptPack(prompts) {
    // Default format: JSON array
    // Adjust based on how your Flow script expects input
    return JSON.stringify(
      prompts.map(p => ({
        index: p.index,
        prompt: p.prompt,
        duration: p.duration || 8,
      })),
      null,
      2
    );
  }

  async close() {
    if (this.profileSerial) {
      await this.adspower.stopProfile(this.profileSerial);
    }
  }
}

module.exports = FlowService;
