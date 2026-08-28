const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('../config/env');
const logger = require('../utils/logger');

// Maps our internal language codes to Sarvam API target language codes
const SARVAM_LANG_MAP = {
  'hi': 'hi-IN',
  'en': 'en-IN',
  'ta': 'ta-IN',
  'te': 'te-IN'
};

// Ensure cache directory exists
const CACHE_DIR = path.join(__dirname, '../../.cache/audio');
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

/**
 * Generates an audio buffer from text using Sarvam AI TTS (with disk caching)
 * @param {string} text The text to convert to speech
 * @param {string} langCode Internal language code (hi, en, ta, te)
 * @returns {Promise<Buffer|null>} Buffer of the audio file, or null if failed
 */
async function generateAudio(text, langCode = 'hi') {
  if (!config.sarvamApiKey) {
    logger.warn('Sarvam API key is missing. Skipping TTS generation.');
    return null;
  }

  // Sarvam's bulbul:v3 has a 2500 char limit. Safe truncate just in case.
  const safeText = text.length > 2400 ? text.substring(0, 2400) + '...' : text;
  const targetLang = SARVAM_LANG_MAP[langCode] || 'hi-IN';

  // Check disk cache first to save API limits
  const hash = crypto.createHash('md5').update(safeText + targetLang).digest('hex');
  const cachePath = path.join(CACHE_DIR, `${hash}.mp3`);
  
  if (fs.existsSync(cachePath)) {
    logger.info(`TTS Cache hit for language: ${targetLang}`);
    return fs.readFileSync(cachePath);
  }

  try {
    const response = await axios.post(
      'https://api.sarvam.ai/text-to-speech',
      {
        text: safeText,
        language_code: targetLang,
        speaker: 'ritu', // 'ritu', 'aditya', 'shubh' etc.
        pace: 1.0,
        speech_sample_rate: 24000,
        output_audio_codec: 'mp3',
        model: 'bulbul:v3'
      },
      {
        headers: {
          'api-subscription-key': config.sarvamApiKey,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data && response.data.audios && response.data.audios.length > 0) {
      const base64Audio = response.data.audios[0];
      // Convert base64 string to Buffer
      const audioBuffer = Buffer.from(base64Audio, 'base64');
      
      // Save to disk cache
      fs.writeFileSync(cachePath, audioBuffer);
      logger.info(`TTS generated successfully and cached for language: ${targetLang}`);
      
      return audioBuffer;
    } else {
      logger.error('Invalid response format from Sarvam API');
      return null;
    }
  } catch (error) {
    const errorDetails = error.response?.data ? JSON.stringify(error.response.data) : error.message;
    logger.error(`Error generating TTS from Sarvam AI: HTTP ${error.response?.status} - ${errorDetails}`);
    return null;
  }
}

module.exports = {
  generateAudio
};
