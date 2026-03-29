/**
 * AdsPower Local API Client
 *
 * Manages browser profile lifecycle:
 * - Start/stop browser profiles
 * - Connect Playwright to running profiles
 * - Handle multiple concurrent profiles
 *
 * AdsPower must be running (on Windows VPS or local machine)
 * and accessible via its Local API (default: http://local.adspower.net:50325)
 */

const { chromium } = require('playwright');
const axios = require('axios');
const logger = require('../utils/logger');

class AdsPowerClient {
  constructor(config = {}) {
    this.baseUrl = config.adspowerUrl || process.env.ADSPOWER_URL || 'http://local.adspower.net:50325';
    this.activeBrowsers = new Map(); // serial -> { browser, context, page }
    this.maxRetries = 3;
    this.retryDelay = 2000;
  }

  /**
   * Start a browser profile by its serial number
   * Returns the WebSocket debugging URL for Playwright connection
   */
  async startProfile(serialNumber) {
    logger.info(`Starting AdsPower profile #${serialNumber}`);

    try {
      const response = await axios.get(`${this.baseUrl}/api/v1/browser/start`, {
        params: {
          serial_number: serialNumber,
          open_tabs: 1,
          ip_tab: 0,
        },
        timeout: 30000,
      });

      if (response.data.code !== 0) {
        throw new Error(`AdsPower error: ${response.data.msg}`);
      }

      const wsEndpoint = response.data.data.ws.puppeteer;
      logger.info(`Profile #${serialNumber} started, ws: ${wsEndpoint}`);

      return wsEndpoint;
    } catch (error) {
      logger.error(`Failed to start profile #${serialNumber}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Stop a browser profile
   */
  async stopProfile(serialNumber) {
    logger.info(`Stopping AdsPower profile #${serialNumber}`);

    try {
      const response = await axios.get(`${this.baseUrl}/api/v1/browser/stop`, {
        params: { serial_number: serialNumber },
        timeout: 15000,
      });

      // Clean up from active browsers
      if (this.activeBrowsers.has(serialNumber)) {
        this.activeBrowsers.delete(serialNumber);
      }

      return response.data.code === 0;
    } catch (error) {
      logger.error(`Failed to stop profile #${serialNumber}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if a profile is already running
   */
  async isProfileActive(serialNumber) {
    try {
      const response = await axios.get(`${this.baseUrl}/api/v1/browser/active`, {
        params: { serial_number: serialNumber },
        timeout: 10000,
      });
      return response.data.data?.status === 'Active';
    } catch {
      return false;
    }
  }

  /**
   * Connect Playwright to a running AdsPower profile
   * This is the main method for getting a controllable browser page
   */
  async connectToProfile(serialNumber) {
    // Check if already connected
    if (this.activeBrowsers.has(serialNumber)) {
      const existing = this.activeBrowsers.get(serialNumber);
      try {
        // Verify connection is still alive
        await existing.page.title();
        return existing;
      } catch {
        // Connection dead, reconnect
        this.activeBrowsers.delete(serialNumber);
      }
    }

    // Start profile if not active
    const isActive = await this.isProfileActive(serialNumber);
    let wsEndpoint;

    if (!isActive) {
      wsEndpoint = await this.startProfile(serialNumber);
    } else {
      // Get ws endpoint for already running profile
      const response = await axios.get(`${this.baseUrl}/api/v1/browser/start`, {
        params: { serial_number: serialNumber, open_tabs: 0 },
        timeout: 30000,
      });
      wsEndpoint = response.data.data.ws.puppeteer;
    }

    // Connect Playwright via CDP
    const browser = await chromium.connectOverCDP(wsEndpoint, {
      timeout: 30000,
    });

    const context = browser.contexts()[0];
    const pages = context.pages();
    const page = pages.length > 0 ? pages[0] : await context.newPage();

    const connection = { browser, context, page, serialNumber };
    this.activeBrowsers.set(serialNumber, connection);

    logger.info(`Playwright connected to profile #${serialNumber}`);
    return connection;
  }

  /**
   * Open a new tab in an already-connected profile
   */
  async newPage(serialNumber) {
    const connection = this.activeBrowsers.get(serialNumber);
    if (!connection) {
      throw new Error(`Profile #${serialNumber} is not connected`);
    }
    return await connection.context.newPage();
  }

  /**
   * Close all active browser connections
   */
  async closeAll() {
    for (const [serial, connection] of this.activeBrowsers) {
      try {
        await connection.browser.close();
        await this.stopProfile(serial);
      } catch (error) {
        logger.error(`Error closing profile #${serial}: ${error.message}`);
      }
    }
    this.activeBrowsers.clear();
  }

  /**
   * Wait for a specific element with retries
   * Utility for all browser automation services
   */
  async waitForElement(page, selector, options = {}) {
    const timeout = options.timeout || 30000;
    try {
      await page.waitForSelector(selector, { timeout, state: 'visible' });
      return page.locator(selector);
    } catch {
      throw new Error(`Element not found: ${selector} (timeout: ${timeout}ms)`);
    }
  }

  /**
   * Human-like typing with random delays
   */
  async humanType(page, selector, text, options = {}) {
    const element = await this.waitForElement(page, selector);
    await element.click();

    // Clear existing text
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');

    // Type with human-like delays
    for (const char of text) {
      await page.keyboard.type(char, {
        delay: 30 + Math.random() * 80,
      });
    }
  }

  /**
   * Random delay to simulate human behavior
   */
  async humanDelay(min = 500, max = 2000) {
    const delay = min + Math.random() * (max - min);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}

module.exports = AdsPowerClient;
