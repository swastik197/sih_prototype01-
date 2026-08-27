const twilio = require('twilio');
const config = require('../config/env');
const logger = require('../utils/logger');

// Initialize Twilio client if credentials are available
let client = null;
if (config.twilio.accountSid && config.twilio.authToken) {
  client = twilio(config.twilio.accountSid, config.twilio.authToken);
  logger.info('Twilio client initialized');
} else {
  logger.warn('Twilio credentials not configured. Messages will be logged only.');
}

/**
 * Send a WhatsApp message via Twilio
 */
async function sendWhatsApp(to, message) {
  return sendMessage(to, message, 'whatsapp');
}

/**
 * Send an SMS message via Twilio
 */
async function sendSMS(to, message) {
  return sendMessage(to, message, 'sms');
}

/**
 * Unified message sender - picks WhatsApp or SMS based on channel
 */
async function sendMessage(to, message, channel = 'whatsapp') {
  if (!client) {
    logger.warn(`[DRY RUN] Would send ${channel} to ${to}: ${message.substring(0, 100)}...`);
    return null;
  }

  try {
    const isWhatsApp = channel === 'whatsapp';
    const fromNumber = isWhatsApp ? config.twilio.whatsappNumber : config.twilio.smsNumber;
    const toNumber = isWhatsApp ? (to.startsWith('whatsapp:') ? to : `whatsapp:${to}`) : to;

    const result = await client.messages.create({
      body: message,
      from: fromNumber,
      to: toNumber
    });

    logger.info(`Message sent via ${channel} to ${to}. SID: ${result.sid}`);
    return result.sid;
  } catch (error) {
    logger.error(`Failed to send ${channel} message to ${to}: ${error.message}`);
    return null;
  }
}

/**
 * Build TwiML response for webhook replies
 */
function buildTwiMLReply(message) {
  const MessagingResponse = twilio.twiml.MessagingResponse;
  const twiml = new MessagingResponse();
  twiml.message(message);
  return twiml.toString();
}

module.exports = {
  sendWhatsApp,
  sendSMS,
  buildTwiMLReply,
  sendMessage
};
