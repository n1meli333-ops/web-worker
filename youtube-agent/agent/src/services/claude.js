/**
 * Claude Web Browser Automation
 *
 * Controls Claude via browser (claude.ai) through AdsPower profile.
 * Used for: idea generation, story writing, video prompts, analysis
 */

const logger = require('../utils/logger');

class ClaudeService {
  constructor(adspower) {
    this.adspower = adspower;
    this.profileSerial = null;
    this.page = null;
  }

  /**
   * Initialize connection to Claude via browser profile
   */
  async init(profileSerial) {
    this.profileSerial = profileSerial;
    const connection = await this.adspower.connectToProfile(profileSerial);
    this.page = connection.page;
    logger.info('Claude service initialized');
  }

  /**
   * Navigate to Claude and ensure we're on a new chat
   */
  async openNewChat() {
    await this.page.goto('https://claude.ai/new', { waitUntil: 'networkidle', timeout: 60000 });
    await this.adspower.humanDelay(2000, 4000);

    // Wait for the chat input to be ready
    await this.page.waitForSelector('[contenteditable="true"], textarea[placeholder]', {
      timeout: 30000,
      state: 'visible',
    });

    logger.info('Claude new chat opened');
  }

  /**
   * Send a message to Claude and wait for the complete response
   */
  async sendMessage(message) {
    logger.info('Sending message to Claude', { length: message.length });

    // Find the input area
    const inputSelector = '[contenteditable="true"]';
    await this.page.waitForSelector(inputSelector, { state: 'visible', timeout: 15000 });

    // Click on input area
    await this.page.click(inputSelector);
    await this.adspower.humanDelay(300, 600);

    // For long messages, use clipboard to paste (much faster than typing)
    if (message.length > 200) {
      await this.page.evaluate((text) => {
        navigator.clipboard.writeText(text);
      }, message);
      await this.page.keyboard.press('Control+V');
    } else {
      await this.page.fill(inputSelector, message);
    }

    await this.adspower.humanDelay(500, 1000);

    // Click send button or press Enter
    const sendButton = this.page.locator('button[aria-label="Send Message"], button[data-testid="send-button"]');
    if (await sendButton.isVisible()) {
      await sendButton.click();
    } else {
      await this.page.keyboard.press('Enter');
    }

    // Wait for response to start
    await this.adspower.humanDelay(2000, 3000);

    // Wait for Claude to finish responding
    const response = await this._waitForResponse();
    logger.info('Claude response received', { length: response.length });

    return response;
  }

  /**
   * Wait for Claude's response to complete
   * Detects when the "stop" button disappears = response is done
   */
  async _waitForResponse() {
    const maxWait = 300000; // 5 minutes max for long stories
    const startTime = Date.now();

    // Wait for the stop/loading indicator to appear (response started)
    await this.adspower.humanDelay(3000, 5000);

    // Poll until the response is complete
    while (Date.now() - startTime < maxWait) {
      // Check if still generating (stop button visible)
      const isGenerating = await this.page.evaluate(() => {
        const stopBtn = document.querySelector('button[aria-label="Stop Response"]');
        const loadingIndicator = document.querySelector('[data-is-streaming="true"]');
        return !!(stopBtn || loadingIndicator);
      });

      if (!isGenerating) {
        // Double-check by waiting a bit and checking again
        await this.adspower.humanDelay(2000, 3000);
        const stillGenerating = await this.page.evaluate(() => {
          const stopBtn = document.querySelector('button[aria-label="Stop Response"]');
          return !!stopBtn;
        });

        if (!stillGenerating) break;
      }

      await this.adspower.humanDelay(2000, 4000);
    }

    // Extract the last response text
    const responseText = await this.page.evaluate(() => {
      // Get all assistant message blocks
      const messages = document.querySelectorAll('[data-is-streaming], .font-claude-message, [class*="assistant"], [class*="response"]');
      if (messages.length > 0) {
        return messages[messages.length - 1].innerText;
      }

      // Fallback: get the last large text block in the conversation
      const allBlocks = document.querySelectorAll('.prose, [class*="message-content"], [class*="markdown"]');
      if (allBlocks.length > 0) {
        return allBlocks[allBlocks.length - 1].innerText;
      }

      return '';
    });

    if (!responseText) {
      throw new Error('Failed to extract Claude response');
    }

    return responseText.trim();
  }

  /**
   * Generate a story idea based on niche analysis
   */
  async generateIdea(niche, channelContext, competitorData) {
    await this.openNewChat();

    const prompt = `You are a YouTube content strategist specializing in "${niche}" content.

Context about the channel:
${channelContext}

Competitor analysis data:
${JSON.stringify(competitorData, null, 2)}

Based on this analysis, generate ONE unique video idea that:
1. Has high viral potential in this niche
2. Is different from what competitors recently published
3. Will engage viewers for 20-40 minutes
4. Has a compelling hook

Respond in this exact JSON format:
{
  "title": "Video title",
  "hook": "First 30 seconds hook",
  "synopsis": "Brief 2-3 sentence summary",
  "targetEmotion": "primary emotion to evoke",
  "estimatedLength": 25
}`;

    const response = await this.sendMessage(prompt);
    return this._parseJSON(response);
  }

  /**
   * Write a full story based on the idea
   */
  async writeStory(idea, storyPromptTemplate, niche, language) {
    await this.openNewChat();

    // Replace template variables
    const prompt = storyPromptTemplate
      .replace('{{IDEA}}', JSON.stringify(idea))
      .replace('{{NICHE}}', niche)
      .replace('{{LANGUAGE}}', language)
      .replace('{{MIN_LENGTH}}', '20')
      .replace('{{MAX_LENGTH}}', '40');

    const story = await this.sendMessage(prompt);
    return story;
  }

  /**
   * Generate video prompts based on story and timestamps
   */
  async generateVideoPrompts(story, timestamps, videoPromptTemplate) {
    await this.openNewChat();

    const prompt = videoPromptTemplate
      .replace('{{STORY}}', story)
      .replace('{{TIMESTAMPS}}', JSON.stringify(timestamps));

    const response = await this.sendMessage(prompt);
    return this._parseJSON(response);
  }

  /**
   * Generate thumbnail text and image prompt
   */
  async generateThumbnail(title, story, niche, thumbnailPromptTemplate) {
    await this.openNewChat();

    const prompt = thumbnailPromptTemplate
      .replace('{{TITLE}}', title)
      .replace('{{STORY}}', story.substring(0, 500))
      .replace('{{NICHE}}', niche);

    const response = await this.sendMessage(prompt);
    return this._parseJSON(response);
  }

  /**
   * Analyze competitors in a niche
   */
  async analyzeCompetitors(competitorUrls, niche) {
    await this.openNewChat();

    const prompt = `Analyze these YouTube channels in the "${niche}" niche and provide insights:

Channels: ${competitorUrls.join(', ')}

For each channel, analyze:
1. Most popular video topics/themes
2. Thumbnail style (colors, text placement, imagery)
3. Title patterns (emotional triggers, keywords)
4. Average video length
5. Upload frequency
6. What makes their most viral videos successful

Respond in JSON format:
{
  "insights": [...],
  "recommendedTopics": [...],
  "thumbnailStyle": "description",
  "titlePatterns": [...]
}`;

    const response = await this.sendMessage(prompt);
    return this._parseJSON(response);
  }

  /**
   * Generate video title, description, and tags
   */
  async generateMetadata(title, story, niche, language) {
    await this.openNewChat();

    const prompt = `Create YouTube video metadata for a ${niche} video.

Original title idea: "${title}"
Story summary: ${story.substring(0, 300)}
Language: ${language}

Generate:
1. An optimized, clickbait-style title (max 100 chars)
2. A compelling description (with keywords, timestamps placeholder)
3. 15-20 relevant tags

Respond in JSON:
{
  "title": "...",
  "description": "...",
  "tags": ["tag1", "tag2", ...]
}`;

    const response = await this.sendMessage(prompt);
    return this._parseJSON(response);
  }

  /**
   * Parse JSON from Claude's response (handles markdown code blocks)
   */
  _parseJSON(text) {
    try {
      // Try direct parse
      return JSON.parse(text);
    } catch {
      // Extract JSON from markdown code blocks
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1].trim());
      }

      // Try finding JSON object in text
      const objectMatch = text.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        return JSON.parse(objectMatch[0]);
      }

      throw new Error('Failed to parse JSON from Claude response');
    }
  }

  /**
   * Close the browser profile
   */
  async close() {
    if (this.profileSerial) {
      await this.adspower.stopProfile(this.profileSerial);
    }
  }
}

module.exports = ClaudeService;
