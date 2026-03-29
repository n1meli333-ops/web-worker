/**
 * AssemblyAI Service
 *
 * Extracts timestamps from voiceover audio.
 * Uses AssemblyAI API (free $50 credit) for speech-to-text with word-level timestamps.
 * Can also work through browser if needed.
 */

const axios = require('axios');
const fs = require('fs');
const logger = require('../utils/logger');

class AssemblyAIService {
  constructor(config = {}) {
    this.apiKey = config.apiKey || process.env.ASSEMBLYAI_API_KEY;
    this.baseUrl = 'https://api.assemblyai.com/v2';
    this.adspower = config.adspower || null;
    this.profileSerial = config.profileSerial || null;
    this.useBrowser = !this.apiKey; // Use browser if no API key
  }

  /**
   * Extract timestamps from audio file
   * Returns array of segments: [{start, end, text}]
   */
  async extractTimestamps(audioPath) {
    if (this.useBrowser) {
      return this._extractViaBrowser(audioPath);
    }
    return this._extractViaAPI(audioPath);
  }

  /**
   * Extract timestamps using AssemblyAI REST API
   */
  async _extractViaAPI(audioPath) {
    logger.info('Extracting timestamps via AssemblyAI API');

    // Step 1: Upload audio file
    const audioData = fs.readFileSync(audioPath);
    const uploadResponse = await axios.post(`${this.baseUrl}/upload`, audioData, {
      headers: {
        authorization: this.apiKey,
        'content-type': 'application/octet-stream',
        'transfer-encoding': 'chunked',
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    const audioUrl = uploadResponse.data.upload_url;
    logger.info('Audio uploaded to AssemblyAI');

    // Step 2: Create transcription with word timestamps
    const transcriptResponse = await axios.post(
      `${this.baseUrl}/transcript`,
      {
        audio_url: audioUrl,
        word_boost: [],
        language_detection: true,
      },
      {
        headers: { authorization: this.apiKey },
      }
    );

    const transcriptId = transcriptResponse.data.id;
    logger.info(`Transcription started: ${transcriptId}`);

    // Step 3: Poll for completion
    let transcript;
    while (true) {
      const pollResponse = await axios.get(`${this.baseUrl}/transcript/${transcriptId}`, {
        headers: { authorization: this.apiKey },
      });

      transcript = pollResponse.data;

      if (transcript.status === 'completed') break;
      if (transcript.status === 'error') {
        throw new Error(`Transcription failed: ${transcript.error}`);
      }

      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    logger.info('Transcription completed');

    // Step 4: Process into segments
    return this._processTranscript(transcript);
  }

  /**
   * Extract timestamps using browser automation
   */
  async _extractViaBrowser(audioPath) {
    logger.info('Extracting timestamps via AssemblyAI browser');

    if (!this.adspower || !this.profileSerial) {
      throw new Error('Browser mode requires AdsPower client and profile serial');
    }

    const connection = await this.adspower.connectToProfile(this.profileSerial);
    const page = connection.page;

    // Navigate to AssemblyAI playground
    await page.goto('https://www.assemblyai.com/playground', {
      waitUntil: 'networkidle',
      timeout: 60000,
    });
    await this.adspower.humanDelay(2000, 4000);

    // Upload audio file
    const fileInput = await page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(audioPath);
    await this.adspower.humanDelay(2000, 3000);

    // Click transcribe button
    const transcribeBtn = page.locator('button:has-text("Transcribe"), button:has-text("Submit")').first();
    await transcribeBtn.click();

    // Wait for transcription
    await this._waitForBrowserTranscription(page);

    // Extract results
    const result = await page.evaluate(() => {
      // Try to find JSON output or download link
      const jsonOutput = document.querySelector('pre, code, [class*="json"]');
      if (jsonOutput) return jsonOutput.innerText;
      return null;
    });

    if (result) {
      return JSON.parse(result);
    }

    throw new Error('Failed to extract transcription results from browser');
  }

  async _waitForBrowserTranscription(page) {
    const maxWait = 180000; // 3 minutes
    const startTime = Date.now();

    while (Date.now() - startTime < maxWait) {
      const isDone = await page.evaluate(() => {
        const result = document.querySelector('[class*="result"], [class*="transcript"], [class*="output"]');
        const loading = document.querySelector('[class*="loading"], [class*="progress"]');
        return result && !loading;
      });

      if (isDone) break;
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  /**
   * Process raw transcript into timed segments for video prompt alignment
   * Groups words into ~8-second segments (matching typical video clip length)
   */
  _processTranscript(transcript) {
    const words = transcript.words || [];
    if (words.length === 0) {
      throw new Error('No words found in transcript');
    }

    const segmentDuration = 8000; // 8 seconds in ms
    const segments = [];
    let currentSegment = {
      start: words[0].start,
      end: words[0].end,
      text: '',
      words: [],
    };

    for (const word of words) {
      const segmentLength = word.end - currentSegment.start;

      if (segmentLength > segmentDuration && currentSegment.words.length > 0) {
        // Finalize current segment
        currentSegment.text = currentSegment.words.map(w => w.text).join(' ');
        segments.push({
          start: currentSegment.start / 1000, // Convert to seconds
          end: currentSegment.end / 1000,
          text: currentSegment.text,
          index: segments.length,
        });

        // Start new segment
        currentSegment = {
          start: word.start,
          end: word.end,
          text: '',
          words: [],
        };
      }

      currentSegment.end = word.end;
      currentSegment.words.push(word);
    }

    // Add last segment
    if (currentSegment.words.length > 0) {
      currentSegment.text = currentSegment.words.map(w => w.text).join(' ');
      segments.push({
        start: currentSegment.start / 1000,
        end: currentSegment.end / 1000,
        text: currentSegment.text,
        index: segments.length,
      });
    }

    logger.info(`Processed ${segments.length} segments from transcript`);
    return segments;
  }

  /**
   * Get full transcript with word-level timing as JSON
   * This is used for precise video-audio sync
   */
  getTimestampsJSON(segments) {
    return segments.map(seg => ({
      index: seg.index,
      startTime: seg.start,
      endTime: seg.end,
      duration: seg.end - seg.start,
      text: seg.text,
    }));
  }
}

module.exports = AssemblyAIService;
