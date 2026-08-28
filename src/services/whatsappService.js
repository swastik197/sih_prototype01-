const axios = require('axios');
const FormData = require('form-data');
const config = require('../config/env');
const logger = require('../utils/logger');
const ttsService = require('./ttsService');

/**
 * Helper to clean and format phone numbers for Meta API
 */
function getCleanNumber(to) {
  let cleanTo = to.replace('whatsapp:', '').replace('+', '');
  if (cleanTo.length === 10) {
    cleanTo = '91' + cleanTo;
  }
  return cleanTo;
}

/**
 * Upload a media buffer to Meta WhatsApp API and return the media ID
 * @param {Buffer} buffer The media buffer to upload
 * @param {string} mimeType The mime type of the media
 * @returns {Promise<string|null>} The media ID
 */
async function uploadMedia(buffer, mimeType = 'audio/mpeg') {
  if (!config.metaWhatsapp.accessToken || !config.metaWhatsapp.phoneNumberId) return null;

  try {
    const formData = new FormData();
    formData.append('messaging_product', 'whatsapp');
    // Using a generic filename so Meta processes it correctly
    formData.append('file', buffer, { filename: 'audio.mp3', contentType: mimeType });

    const url = `https://graph.facebook.com/v19.0/${config.metaWhatsapp.phoneNumberId}/media`;
    const response = await axios.post(url, formData, {
      headers: {
        'Authorization': `Bearer ${config.metaWhatsapp.accessToken}`,
        ...formData.getHeaders()
      }
    });

    return response.data.id;
  } catch (error) {
    logger.error(`Media upload failed: ${error.response?.data?.error?.message || error.message}`);
    return null;
  }
}

/**
 * Send an audio message via Meta Cloud API using a Media ID
 */
async function sendAudio(to, mediaId) {
  if (!mediaId) return null;

  try {
    const cleanTo = getCleanNumber(to);
    const url = `https://graph.facebook.com/v19.0/${config.metaWhatsapp.phoneNumberId}/messages`;
    
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanTo,
      type: 'audio',
      audio: { id: mediaId }
    };

    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${config.metaWhatsapp.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    logger.info(`Audio message sent to ${cleanTo}. Message ID: ${response.data.messages[0].id}`);
    return response.data.messages[0].id;
  } catch (error) {
    logger.error(`Failed to send Audio message to ${to}: ${error.response?.data?.error?.message || error.message}`);
    return null;
  }
}

/**
 * Send a Text WhatsApp message via Meta Cloud API
 */
async function sendMessage(to, message) {
  if (!config.metaWhatsapp.accessToken || !config.metaWhatsapp.phoneNumberId) {
    logger.warn(`[DRY RUN] Would send to ${to}: ${message.substring(0, 100)}...`);
    return null;
  }

  try {
    const cleanTo = getCleanNumber(to);
    const url = `https://graph.facebook.com/v19.0/${config.metaWhatsapp.phoneNumberId}/messages`;
    
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanTo,
      type: 'text',
      text: {
        preview_url: false,
        body: message
      }
    };

    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${config.metaWhatsapp.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    logger.info(`Message sent to ${cleanTo}. Message ID: ${response.data.messages[0].id}`);
    return response.data.messages[0].id;
  } catch (error) {
    logger.error(`Failed to send WhatsApp message to ${to}: ${error.response?.data?.error?.message || error.message}`);
    return null;
  }
}

/**
 * High-level wrapper that sends BOTH text and audio (via Sarvam AI TTS)
 * @param {string} to Phone number
 * @param {string} message Text message to send and vocalize
 * @param {string} language Internal language code (e.g. 'hi')
 */
async function sendTextAndVoice(to, message, language = 'hi') {
  // 1. Send the text message immediately
  await sendMessage(to, message);

  // 2. Generate and send audio in the background (or sequentially)
  try {
    const audioBuffer = await ttsService.generateAudio(message, language);
    if (audioBuffer) {
      const mediaId = await uploadMedia(audioBuffer, 'audio/mpeg');
      if (mediaId) {
        await sendAudio(to, mediaId);
      }
    }
  } catch (error) {
    logger.error(`Failed to process TTS/Audio pipeline: ${error.message}`);
  }
}

module.exports = {
  sendMessage,
  sendWhatsApp: sendMessage,
  sendAudio,
  uploadMedia,
  sendTextAndVoice
};
