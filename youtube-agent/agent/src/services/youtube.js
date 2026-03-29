/**
 * YouTube Upload Service (Browser Automation)
 *
 * Uploads videos to YouTube via YouTube Studio in AdsPower browser.
 * Fills in title, description, tags, thumbnail, and saves as draft.
 */

const path = require('path');
const logger = require('../utils/logger');

class YouTubeService {
  constructor(adspower) {
    this.adspower = adspower;
    this.profileSerial = null;
    this.page = null;
  }

  async init(profileSerial) {
    this.profileSerial = profileSerial;
    const connection = await this.adspower.connectToProfile(profileSerial);
    this.page = connection.page;
    logger.info('YouTube service initialized');
  }

  /**
   * Upload a video to YouTube Studio as draft
   */
  async uploadVideo({ videoPath, title, description, tags, thumbnailPath, channelUrl }) {
    logger.info(`Uploading video to YouTube: "${title}"`);

    // Navigate to YouTube Studio upload page
    await this.page.goto('https://studio.youtube.com', { waitUntil: 'networkidle', timeout: 60000 });
    await this.adspower.humanDelay(3000, 5000);

    // Click "CREATE" / upload button
    const createBtn = this.page.locator('#create-icon, [id="upload-icon"], button:has-text("Create")').first();
    await createBtn.click();
    await this.adspower.humanDelay(1000, 2000);

    // Click "Upload videos"
    const uploadOption = this.page.locator('tp-yt-paper-item:has-text("Upload video"), [id="text-item-0"]').first();
    await uploadOption.click();
    await this.adspower.humanDelay(2000, 3000);

    // Upload the video file
    const fileInput = this.page.locator('input[type="file"]');
    await fileInput.setInputFiles(videoPath);

    logger.info('Video file selected, waiting for upload dialog...');
    await this.adspower.humanDelay(3000, 5000);

    // Wait for the upload dialog to appear with title field
    await this.page.waitForSelector('#textbox[aria-label*="title"], #title-textarea', {
      timeout: 30000,
      state: 'visible',
    });

    // Fill in title
    await this._fillTitle(title);
    await this.adspower.humanDelay(500, 1000);

    // Fill in description
    await this._fillDescription(description);
    await this.adspower.humanDelay(500, 1000);

    // Upload thumbnail if provided
    if (thumbnailPath) {
      await this._uploadThumbnail(thumbnailPath);
      await this.adspower.humanDelay(1000, 2000);
    }

    // Set as "Not made for kids"
    await this._setNotForKids();
    await this.adspower.humanDelay(500, 1000);

    // Click "Show more" to access tags
    const showMoreBtn = this.page.locator('button:has-text("Show more"), #toggle-button').first();
    if (await showMoreBtn.isVisible()) {
      await showMoreBtn.click();
      await this.adspower.humanDelay(500, 1000);
    }

    // Fill in tags
    if (tags && tags.length > 0) {
      await this._fillTags(tags);
      await this.adspower.humanDelay(500, 1000);
    }

    // Navigate through the upload wizard steps
    // Step 1: Details (already done) → Next
    await this._clickNext();
    await this.adspower.humanDelay(1000, 2000);

    // Step 2: Video elements → Next
    await this._clickNext();
    await this.adspower.humanDelay(1000, 2000);

    // Step 3: Checks → Next
    await this._clickNext();
    await this.adspower.humanDelay(1000, 2000);

    // Step 4: Visibility → Set as Draft (Private) and Save
    await this._setVisibilityDraft();
    await this.adspower.humanDelay(1000, 2000);

    // Wait for upload to complete
    await this._waitForUploadComplete();

    // Click Save
    const saveBtn = this.page.locator('#done-button, button:has-text("Save")').first();
    await saveBtn.click();
    await this.adspower.humanDelay(3000, 5000);

    // Try to get the video URL
    const videoUrl = await this._extractVideoUrl();

    logger.info(`Video uploaded successfully: ${videoUrl || 'URL not captured'}`);
    return { success: true, videoUrl };
  }

  /**
   * Fill in the video title
   */
  async _fillTitle(title) {
    const titleBox = this.page.locator('#textbox[aria-label*="title"], #title-textarea [contenteditable], #title-textarea textbox').first();
    await titleBox.click();
    await this.page.keyboard.press('Control+A');
    await this.page.keyboard.press('Backspace');
    await this.adspower.humanDelay(200, 400);

    // Use clipboard for reliability
    await this.page.evaluate((text) => {
      navigator.clipboard.writeText(text);
    }, title);
    await this.page.keyboard.press('Control+V');

    logger.info(`Title set: "${title}"`);
  }

  /**
   * Fill in the video description
   */
  async _fillDescription(description) {
    const descBox = this.page.locator('#textbox[aria-label*="description"], #description-textarea [contenteditable]').first();
    await descBox.click();
    await this.page.keyboard.press('Control+A');
    await this.page.keyboard.press('Backspace');
    await this.adspower.humanDelay(200, 400);

    await this.page.evaluate((text) => {
      navigator.clipboard.writeText(text);
    }, description);
    await this.page.keyboard.press('Control+V');

    logger.info('Description set');
  }

  /**
   * Upload custom thumbnail
   */
  async _uploadThumbnail(thumbnailPath) {
    try {
      const thumbnailInput = this.page.locator('#file-loader input[type="file"], input[accept*="image"]').first();
      await thumbnailInput.setInputFiles(thumbnailPath);
      logger.info('Thumbnail uploaded');
    } catch (error) {
      logger.warn(`Failed to upload thumbnail: ${error.message}`);
    }
  }

  /**
   * Set "Not made for kids"
   */
  async _setNotForKids() {
    const notForKids = this.page.locator('#radioLabel:has-text("No, it\'s not"), [name="NOT_MADE_FOR_KIDS"]').first();
    if (await notForKids.isVisible()) {
      await notForKids.click();
    }
  }

  /**
   * Fill in tags
   */
  async _fillTags(tags) {
    const tagsInput = this.page.locator('[aria-label*="Tags"], #tags-container input, #chip-bar input').first();
    if (await tagsInput.isVisible()) {
      await tagsInput.click();
      const tagsText = tags.join(', ');
      await this.page.evaluate((text) => {
        navigator.clipboard.writeText(text);
      }, tagsText);
      await this.page.keyboard.press('Control+V');
      await this.page.keyboard.press('Enter');
      logger.info(`Tags set: ${tags.length} tags`);
    }
  }

  /**
   * Click Next button in upload wizard
   */
  async _clickNext() {
    const nextBtn = this.page.locator('#next-button, button:has-text("Next")').first();
    if (await nextBtn.isVisible()) {
      await nextBtn.click();
    }
  }

  /**
   * Set visibility to Private (Draft)
   */
  async _setVisibilityDraft() {
    const privateRadio = this.page.locator('#radioLabel:has-text("Private"), [name="PRIVATE"]').first();
    if (await privateRadio.isVisible()) {
      await privateRadio.click();
    }
  }

  /**
   * Wait for the video upload to complete
   */
  async _waitForUploadComplete() {
    const maxWait = 600000; // 10 minutes
    const startTime = Date.now();

    while (Date.now() - startTime < maxWait) {
      // Check upload progress
      const progress = await this.page.evaluate(() => {
        const progressEl = document.querySelector('.progress-label, [class*="upload-progress"]');
        const text = progressEl?.innerText || '';

        // Check for "Upload complete" or "Processing"
        if (text.includes('100%') || text.toLowerCase().includes('complete') || text.toLowerCase().includes('processing')) {
          return { done: true, text };
        }

        return { done: false, text };
      });

      if (progress.done) {
        logger.info(`Upload status: ${progress.text}`);
        break;
      }

      logger.debug(`Upload progress: ${progress.text}`);
      await this.adspower.humanDelay(5000, 8000);
    }
  }

  /**
   * Try to extract the YouTube video URL after upload
   */
  async _extractVideoUrl() {
    try {
      const url = await this.page.evaluate(() => {
        // Look for video link in the upload dialog
        const link = document.querySelector('a[href*="youtu.be"], a[href*="youtube.com/watch"], .video-url-fadeable a');
        return link?.href || null;
      });
      return url;
    } catch {
      return null;
    }
  }

  /**
   * Analyze a competitor's channel
   * Opens their YouTube channel and scrapes data
   */
  async analyzeChannel(channelUrl) {
    logger.info(`Analyzing channel: ${channelUrl}`);

    await this.page.goto(`${channelUrl}/videos`, { waitUntil: 'networkidle', timeout: 60000 });
    await this.adspower.humanDelay(3000, 5000);

    // Scroll to load more videos
    for (let i = 0; i < 3; i++) {
      await this.page.evaluate(() => window.scrollBy(0, 2000));
      await this.adspower.humanDelay(1500, 2500);
    }

    // Extract video data
    const videos = await this.page.evaluate(() => {
      const items = document.querySelectorAll('ytd-rich-grid-media, ytd-grid-video-renderer');
      return Array.from(items).slice(0, 20).map(item => {
        const titleEl = item.querySelector('#video-title');
        const viewsEl = item.querySelector('#metadata-line span');
        const thumbnailEl = item.querySelector('img');

        return {
          title: titleEl?.innerText || '',
          views: viewsEl?.innerText || '',
          thumbnailUrl: thumbnailEl?.src || '',
          url: titleEl?.closest('a')?.href || '',
        };
      });
    });

    logger.info(`Found ${videos.length} videos from channel`);
    return videos;
  }

  async close() {
    if (this.profileSerial) {
      await this.adspower.stopProfile(this.profileSerial);
    }
  }
}

module.exports = YouTubeService;
