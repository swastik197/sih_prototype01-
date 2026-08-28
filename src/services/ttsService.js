const axios = require('axios');
const config = require('../config/env');
const logger = require('../utils/logger');

// Maps our internal language codes to Sarvam API target language codes
const SARVAM_LANG_MAP = {
  'hi': 'hi-IN',
  'en': 'en-IN',
  'ta': 'ta-IN',
  'te': 'te-IN'
};

/**
 * Generates an audio buffer from text using Sarvam AI TTS
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

  try {
    const response = await axios.post(
      'https://api.sarvam.ai/text-to-speech',
      {
        text: safeText,
        language_code: targetLang,
        speaker: 'ritu', // 'ritu', 'aditya', 'shubh' etc.
        pace: 1.0,
        speech_sample_rate: 24000,
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
      logger.info(`TTS generated successfully for language: ${targetLang}`);
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
