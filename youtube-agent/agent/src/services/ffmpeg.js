/**
 * FFmpeg Assembly Service
 *
 * Stitches video clips + voiceover audio into final video.
 * Handles:
 * - Concatenating numbered video clips in order
 * - Syncing audio (voiceover) with video
 * - Adding transitions between clips
 * - Adjusting clip durations to match audio timestamps
 */

const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

class FFmpegService {
  constructor() {
    this.outputDir = process.env.OUTPUT_DIR || './output';
  }

  /**
   * Assemble final video from clips + audio
   *
   * @param {Array} videoFiles - [{index, filePath, startTime, endTime}]
   * @param {string} audioPath - Path to voiceover audio
   * @param {Array} timestamps - [{index, startTime, endTime}] for sync
   * @param {string} pipelineId
   */
  async assembleVideo(videoFiles, audioPath, timestamps, pipelineId) {
    logger.info(`Assembling video: ${videoFiles.length} clips + audio`);

    const outputPath = path.join(this.outputDir, pipelineId);
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
    }

    // Step 1: Trim/adjust each clip to match timestamp duration
    const trimmedClips = await this._trimClipsToTimestamps(videoFiles, timestamps, outputPath);

    // Step 2: Concatenate all clips into one video
    const concatVideoPath = path.join(outputPath, 'concat_video.mp4');
    await this._concatenateClips(trimmedClips, concatVideoPath);

    // Step 3: Merge concatenated video with audio
    const finalPath = path.join(outputPath, 'final_video.mp4');
    await this._mergeVideoAudio(concatVideoPath, audioPath, finalPath);

    // Clean up intermediate files
    this._cleanup(trimmedClips, concatVideoPath);

    logger.info(`Final video assembled: ${finalPath}`);
    return finalPath;
  }

  /**
   * Trim each video clip to match its corresponding timestamp duration
   */
  async _trimClipsToTimestamps(videoFiles, timestamps, outputDir) {
    const trimmedClips = [];

    for (let i = 0; i < videoFiles.length; i++) {
      const clip = videoFiles[i];
      const timestamp = timestamps[i];

      if (!timestamp) {
        logger.warn(`No timestamp for clip ${i}, using original duration`);
        trimmedClips.push(clip.filePath);
        continue;
      }

      const duration = timestamp.endTime - timestamp.startTime;
      const trimmedPath = path.join(outputDir, `trimmed_${i.toString().padStart(3, '0')}.mp4`);

      await new Promise((resolve, reject) => {
        ffmpeg(clip.filePath)
          .setStartTime(0)
          .setDuration(duration)
          .outputOptions([
            '-c:v libx264',
            '-preset fast',
            '-crf 23',
            '-an', // No audio from clips
            '-r 30', // Normalize frame rate
            '-vf scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2',
          ])
          .output(trimmedPath)
          .on('end', resolve)
          .on('error', reject)
          .run();
      });

      trimmedClips.push(trimmedPath);
    }

    return trimmedClips;
  }

  /**
   * Concatenate multiple video clips using FFmpeg concat demuxer
   */
  async _concatenateClips(clipPaths, outputPath) {
    logger.info(`Concatenating ${clipPaths.length} clips`);

    // Create concat file list
    const concatListPath = path.join(path.dirname(outputPath), 'concat_list.txt');
    const concatContent = clipPaths.map(p => `file '${p}'`).join('\n');
    fs.writeFileSync(concatListPath, concatContent);

    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(concatListPath)
        .inputOptions(['-f concat', '-safe 0'])
        .outputOptions([
          '-c:v libx264',
          '-preset fast',
          '-crf 23',
          '-r 30',
        ])
        .output(outputPath)
        .on('end', () => {
          fs.unlinkSync(concatListPath);
          resolve();
        })
        .on('error', reject)
        .run();
    });

    logger.info('Clips concatenated');
  }

  /**
   * Merge video with audio track
   */
  async _mergeVideoAudio(videoPath, audioPath, outputPath) {
    logger.info('Merging video with audio');

    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(videoPath)
        .input(audioPath)
        .outputOptions([
          '-c:v copy',
          '-c:a aac',
          '-b:a 192k',
          '-shortest', // End when shortest stream ends
          '-movflags +faststart', // Optimize for streaming
        ])
        .output(outputPath)
        .on('end', resolve)
        .on('error', reject)
        .run();
    });

    logger.info('Video and audio merged');
  }

  /**
   * Get duration of a media file in seconds
   */
  async getDuration(filePath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) return reject(err);
        resolve(metadata.format.duration);
      });
    });
  }

  /**
   * Clean up intermediate files
   */
  _cleanup(trimmedClips, concatVideo) {
    try {
      for (const clip of trimmedClips) {
        if (clip.includes('trimmed_') && fs.existsSync(clip)) {
          fs.unlinkSync(clip);
        }
      }
      if (fs.existsSync(concatVideo)) {
        fs.unlinkSync(concatVideo);
      }
    } catch (error) {
      logger.warn(`Cleanup error: ${error.message}`);
    }
  }
}

module.exports = FFmpegService;
