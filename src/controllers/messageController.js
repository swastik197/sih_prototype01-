const Farmer = require('../models/Farmer');
const { parseIntent } = require('../services/intentParser');
const { getAdvisory, getWeatherUpdate } = require('../services/advisoryEngine');
const { calculateDistressScore } = require('../services/distressScorer');
const { getPrices } = require('../services/marketPriceService');
const { handleRegistration } = require('../services/registrationService');
const { getMessage } = require('../services/languageService');
const { normalizePhone } = require('../utils/helpers');
const logger = require('../utils/logger');

/**
 * Central message handler for incoming WhatsApp/SMS messages
 * Routes to appropriate service based on detected intent
 */
exports.handleIncoming = async ({ body, from, profileName, channel, location }) => {
  try {
    const phone = normalizePhone(from);
    const text = body ? body.trim() : '';
    let farmer = await Farmer.findOne({ phone });
    const lang = farmer?.language || 'hi';

    logger.info(`[${channel}] ${phone}: "${text}"`);

    // --- Handle active registration flow ---
    if (farmer && farmer.registrationStep >= 1 && farmer.registrationStep <= 6) {
      return await handleRegistration(phone, text, channel);
    }

    // --- Parse intent ---
    const { intent, params } = parseIntent(text);
    logger.info(`Intent: ${intent}, Params: ${JSON.stringify(params)}`);

    switch (intent) {
      case 'register': {
        if (farmer && farmer.isRegistered) {
          return getMessage('reg_complete', lang, {
            name: farmer.name,
            district: farmer.district,
            state: farmer.state,
            crops: (farmer.crops || []).join(', '),
            landSize: String(farmer.landSize || ''),
            language: lang
          }).split('\n')[0] + '\nआप पहले से पंजीकृत हैं / You are already registered!';
        }
        return await handleRegistration(phone, text, channel);
      }

      case 'help': {
        const textMsg = getMessage('help_menu', lang);
        // Fallback to text if audio-specific script isn't found
        const voiceMsg = getMessage('help_menu_audio', lang) !== 'help_menu_audio' 
                         ? getMessage('help_menu_audio', lang) 
                         : textMsg;
        return { text: textMsg, voiceText: voiceMsg };
      }

      case 'weather': {
        if (!farmer || !farmer.isRegistered) {
          return getMessage('not_registered', lang);
        }
        return await getWeatherUpdate(farmer);
      }

      case 'advisory': {
        if (!farmer || !farmer.isRegistered) {
          return getMessage('not_registered', lang);
        }
        return await getAdvisory(farmer);
      }

      case 'price': {
        const crop = params.crop || (farmer?.crops?.[0] || null);
        if (!crop) {
          return getMessage('price_not_found', lang, {
            crop: '?',
            available: 'tomato, wheat, rice, onion, potato'
          });
        }
        return await getPrices(crop, farmer?.district, lang);
      }

      case 'risk': {
        if (!farmer || !farmer.isRegistered) {
          return getMessage('not_registered', lang);
        }
        const result = await calculateDistressScore(farmer);
        const riskTemplateKey = `risk_${result.riskLevel}`;
        const recommendation = getMessage(riskTemplateKey, lang);

        return getMessage('risk_report', lang, {
          score: String(result.score),
          riskLevel: result.riskLevel.toUpperCase(),
          rainfallScore: String(result.factors.rainfallScore),
          priceScore: String(result.factors.priceScore),
          loanScore: String(result.factors.loanScore),
          recommendation
        });
      }

      case 'scheme': {
        return getMessage('scheme_info', lang);
      }

      default: {
        const textMsg = getMessage('help_menu', lang);
        const voiceMsg = getMessage('help_menu_audio', lang) !== 'help_menu_audio' 
                         ? getMessage('help_menu_audio', lang) 
                         : textMsg;
        return { text: textMsg, voiceText: voiceMsg };
      }
    }
  } catch (error) {
    logger.error(`Message handler error: ${error.message}`, error.stack);
    return getMessage('error', 'hi');
  }
};
