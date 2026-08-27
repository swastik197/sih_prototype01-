const Farmer = require('../models/Farmer');
const { getMessage, getLanguageName } = require('./languageService');
const logger = require('../utils/logger');

const LANGUAGE_MAP = { '1': 'hi', '2': 'en', '3': 'ta', '4': 'te' };

// Hindi-to-English crop name mapping for storage
const CROP_MAP = {
  'धान': 'rice', 'dhan': 'rice', 'chawal': 'rice',
  'गेहूं': 'wheat', 'gehun': 'wheat',
  'टमाटर': 'tomato', 'tamatar': 'tomato',
  'प्याज': 'onion', 'pyaz': 'onion',
  'आलू': 'potato', 'aloo': 'potato',
  'कपास': 'cotton', 'kapas': 'cotton',
  'मक्का': 'maize', 'makka': 'maize',
  'सरसों': 'mustard', 'sarson': 'mustard',
  'चना': 'chickpea', 'chana': 'chickpea',
  'मूंग': 'moong', 'moong': 'moong',
  'गन्ना': 'sugarcane', 'ganna': 'sugarcane',
  'सोयाबीन': 'soybean', 'soybean': 'soybean'
};

/**
 * Check if a farmer has an active registration in progress
 */
async function isRegistrationInProgress(phone) {
  const farmer = await Farmer.findOne({ phone });
  return farmer && farmer.registrationStep >= 1 && farmer.registrationStep <= 6;
}

/**
 * Handle multi-step registration flow
 * Returns the response message to send back
 */
async function handleRegistration(phone, messageBody, channel) {
  const text = messageBody ? messageBody.trim() : '';

  // Cancel check
  if (text.toLowerCase() === 'cancel' || text.toLowerCase() === 'radd') {
    await Farmer.findOneAndUpdate(
      { phone },
      { registrationStep: 0, tempData: {}, isRegistered: false },
      { upsert: true }
    );
    return getMessage('reg_cancel', 'hi');
  }

  // Find or create farmer
  let farmer = await Farmer.findOneAndUpdate(
    { phone },
    { $setOnInsert: { phone, channel, registrationStep: 0, tempData: {} } },
    { upsert: true, new: true }
  );

  const step = farmer.registrationStep || 0;

  switch (step) {
    case 0: {
      // Start registration — ask for name
      await Farmer.updateOne({ phone }, { registrationStep: 1, channel });
      return getMessage('reg_step1', 'hi');
    }

    case 1: {
      // Received name — validate and ask for district
      if (text.length < 2 || text.length > 100) {
        return getMessage('reg_invalid', 'hi', { hint: 'कृपया अपना पूरा नाम दें (2-100 अक्षर) / Please enter your full name (2-100 characters)' });
      }
      await Farmer.updateOne(
        { phone },
        { registrationStep: 2, 'tempData.name': text }
      );
      return getMessage('reg_step2', 'hi', { name: text });
    }

    case 2: {
      // Received district, state — parse and validate
      const parts = text.split(',').map(s => s.trim());
      if (parts.length < 2) {
        return getMessage('reg_invalid', 'hi', { hint: 'कृपया "ज़िला, राज्य" फॉर्मेट में दें / Please use "District, State" format' });
      }
      const [district, state] = parts;
      await Farmer.updateOne(
        { phone },
        { registrationStep: 3, 'tempData.district': district, 'tempData.state': state }
      );
      return getMessage('reg_step3', 'hi', { district, state });
    }

    case 3: {
      // Received crops — parse comma-separated list
      const rawCrops = text.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
      if (rawCrops.length === 0) {
        return getMessage('reg_invalid', 'hi', { hint: 'कृपया कम से कम एक फसल का नाम दें / Please enter at least one crop name' });
      }
      // Normalize crop names (Hindi → English)
      const crops = rawCrops.map(c => CROP_MAP[c] || c);
      await Farmer.updateOne(
        { phone },
        { registrationStep: 4, 'tempData.crops': crops }
      );
      return getMessage('reg_step4', 'hi', { crops: crops.join(', ') });
    }

    case 4: {
      // Received land size
      const landSize = parseFloat(text);
      if (isNaN(landSize) || landSize <= 0 || landSize > 10000) {
        return getMessage('reg_invalid', 'hi', { hint: 'कृपया एकड़ में सही संख्या दें / Please enter a valid number in acres' });
      }
      await Farmer.updateOne(
        { phone },
        { registrationStep: 5, 'tempData.landSize': landSize }
      );
      return getMessage('reg_step5', 'hi', { landSize: landSize.toString() });
    }

    case 5: {
      // Received language preference
      const langCode = LANGUAGE_MAP[text] || LANGUAGE_MAP[text.trim()];
      if (!langCode) {
        return getMessage('reg_invalid', 'hi', { hint: 'कृपया 1-4 में से एक नंबर चुनें / Please choose a number from 1-4' });
      }
      await Farmer.updateOne(
        { phone },
        { registrationStep: 6, 'tempData.language': langCode }
      );
      return getMessage('reg_step6', 'hi', { language: getLanguageName(langCode) });
    }

    case 6: {
      // Received loan info or skip
      let loanAmount = null;
      let loanDueDate = null;

      if (text.toLowerCase() !== 'skip' && text.toLowerCase() !== 'nahi' && text.toLowerCase() !== 'no') {
        // Try to parse "amount date" format
        const loanParts = text.split(/\s+/);
        if (loanParts.length >= 2) {
          loanAmount = parseFloat(loanParts[0]);
          // Parse date (DD-MM-YYYY format)
          const dateParts = loanParts[1].split('-');
          if (dateParts.length === 3) {
            loanDueDate = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`);
          }
        }
        if (!loanAmount || isNaN(loanAmount)) {
          return getMessage('reg_invalid', 'hi', { hint: 'कृपया "राशि तारीख" दें (उदा: 50000 15-09-2026) या skip भेजें / Enter "amount DD-MM-YYYY" or send skip' });
        }
      }

      // Finalize registration
      const tempData = (await Farmer.findOne({ phone })).tempData || {};

      await Farmer.updateOne({ phone }, {
        name: tempData.name,
        district: tempData.district,
        state: tempData.state,
        crops: tempData.crops || [],
        landSize: tempData.landSize,
        language: tempData.language || 'hi',
        loanAmount: loanAmount,
        loanDueDate: loanDueDate,
        channel: channel,
        isRegistered: true,
        registrationStep: 7,
        tempData: {}
      });

      const lang = tempData.language || 'hi';
      return getMessage('reg_complete', lang, {
        name: tempData.name,
        district: tempData.district,
        state: tempData.state,
        crops: (tempData.crops || []).join(', '),
        landSize: String(tempData.landSize),
        language: getLanguageName(lang)
      });
    }

    default:
      return getMessage('help_menu', 'hi');
  }
}

module.exports = {
  handleRegistration,
  isRegistrationInProgress
};
