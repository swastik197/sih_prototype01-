const axios = require('axios');
const config = require('../config/env');
const logger = require('../utils/logger');

/**
 * Send a WhatsApp message via Meta Cloud API
 */
async function sendMessage(to, message) {
  if (!config.metaWhatsapp.accessToken || !config.metaWhatsapp.phoneNumberId) {
    logger.warn(`[DRY RUN] Would send to ${to}: ${message.substring(0, 100)}...`);
    return null;
  }

  try {
    // Ensure the number is correctly formatted (no "+" or "whatsapp:" prefix for Meta API)
    let cleanTo = to.replace('whatsapp:', '').replace('+', '');
    
    // Quick fix for Indian numbers if they don't have country code (assuming 10 digits)
    if (cleanTo.length === 10) {
      cleanTo = '91' + cleanTo;
    }

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
 * Convenience wrapper for backward compatibility 
 */
async function sendWhatsApp(to, message) {
  return sendMessage(to, message);
}

module.exports = {
  sendMessage,
  sendWhatsApp
};
