/**
 * Thumbnail Service
 *
 * Creates YouTube thumbnails:
 * 1. Generates background image via Flow
 * 2. Adds text overlay using Sharp
 * 3. Outputs final thumbnail ready for upload
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

class ThumbnailService {
  constructor() {
    this.outputDir = process.env.OUTPUT_DIR || './output';
    this.thumbnailWidth = 1280;
    this.thumbnailHeight = 720;
  }

  /**
   * Create a thumbnail with text overlay on a generated image
   *
   * @param {string} backgroundImagePath - Path to the AI-generated image
   * @param {string} text - Text to overlay (1-5 words, big & bold)
   * @param {object} style - Style configuration
   * @param {string} pipelineId - For output path
   */
  async createThumbnail(backgroundImagePath, text, style = {}, pipelineId) {
    logger.info(`Creating thumbnail with text: "${text}"`);

    const outputPath = path.join(this.outputDir, pipelineId, 'thumbnail.png');
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Default style configuration
    const config = {
      fontSize: style.fontSize || 72,
      fontColor: style.fontColor || '#FFFFFF',
      strokeColor: style.strokeColor || '#000000',
      strokeWidth: style.strokeWidth || 4,
      fontWeight: style.fontWeight || 'bold',
      textPosition: style.textPosition || 'center', // top, center, bottom
      textAlign: style.textAlign || 'center',
      overlay: style.overlay || 'dark', // dark, light, none
      ...style,
    };

    // Resize background image to thumbnail dimensions
    let image = sharp(backgroundImagePath).resize(this.thumbnailWidth, this.thumbnailHeight, {
      fit: 'cover',
      position: 'center',
    });

    // Add semi-transparent overlay for text readability
    if (config.overlay !== 'none') {
      const overlayColor = config.overlay === 'dark'
        ? { r: 0, g: 0, b: 0, alpha: 0.3 }
        : { r: 255, g: 255, b: 255, alpha: 0.3 };

      const overlayBuffer = await sharp({
        create: {
          width: this.thumbnailWidth,
          height: this.thumbnailHeight,
          channels: 4,
          background: overlayColor,
        },
      }).png().toBuffer();

      image = image.composite([{ input: overlayBuffer, blend: 'over' }]);
    }

    // Create text SVG overlay
    const textSvg = this._createTextSVG(text, config);

    // Composite text onto image
    await image
      .composite([{
        input: Buffer.from(textSvg),
        gravity: this._getGravity(config.textPosition),
      }])
      .png()
      .toFile(outputPath);

    logger.info(`Thumbnail created: ${outputPath}`);
    return outputPath;
  }

  /**
   * Create SVG text overlay with stroke effect
   */
  _createTextSVG(text, config) {
    const { fontSize, fontColor, strokeColor, strokeWidth, fontWeight } = config;

    // Split text into lines if too long
    const maxCharsPerLine = 20;
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    for (const word of words) {
      if ((currentLine + ' ' + word).trim().length > maxCharsPerLine) {
        if (currentLine) lines.push(currentLine.trim());
        currentLine = word;
      } else {
        currentLine += ' ' + word;
      }
    }
    if (currentLine.trim()) lines.push(currentLine.trim());

    const lineHeight = fontSize * 1.3;
    const totalHeight = lines.length * lineHeight;
    const yStart = (this.thumbnailHeight - totalHeight) / 2 + fontSize;

    const textElements = lines.map((line, i) => {
      const y = yStart + i * lineHeight;
      return `
        <text x="50%" y="${y}" text-anchor="middle"
              font-family="Impact, Arial Black, sans-serif"
              font-size="${fontSize}" font-weight="${fontWeight}"
              stroke="${strokeColor}" stroke-width="${strokeWidth}"
              fill="${fontColor}"
              paint-order="stroke"
              letter-spacing="2">
          ${this._escapeXml(line.toUpperCase())}
        </text>`;
    }).join('');

    return `<svg width="${this.thumbnailWidth}" height="${this.thumbnailHeight}" xmlns="http://www.w3.org/2000/svg">
      ${textElements}
    </svg>`;
  }

  /**
   * Get Sharp gravity from text position
   */
  _getGravity(position) {
    switch (position) {
      case 'top': return 'north';
      case 'bottom': return 'south';
      default: return 'center';
    }
  }

  /**
   * Escape XML special characters
   */
  _escapeXml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

module.exports = ThumbnailService;
