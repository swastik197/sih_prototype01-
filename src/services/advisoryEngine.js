const { getWeatherForecast } = require('./weatherService');
const { getMessage } = require('./languageService');
const Crop = require('../models/Crop');
const logger = require('../utils/logger');

/**
 * Analyze weather conditions against crop requirements
 * Returns array of advisory items
 */
async function analyzeConditions(weather, farmerCrops) {
  const advisoryItems = [];
  const currentMonth = new Date().getMonth() + 1; // 1-12

  // Load crop data from DB
  const crops = await Crop.find({ name: { $in: farmerCrops } }).lean();

  for (const crop of crops) {
    const cropName = crop.nameHi || crop.name;

    // Heavy rain during harvest months
    if (crop.harvestMonths && crop.harvestMonths.includes(currentMonth)) {
      const totalRain = weather.today.totalRainfall + (weather.next3Days[0]?.rainfall || 0);
      if (totalRain > 30) {
        advisoryItems.push(`${cropName}: भारी बारिश की संभावना। कटाई टाल दें / Heavy rain expected. Delay harvesting of ${crop.name}.`);
      }
    }

    // Sowing season check
    if (crop.sowingMonths && crop.sowingMonths.includes(currentMonth)) {
      if (weather.today.totalRainfall >= 5 && weather.today.totalRainfall <= 30) {
        advisoryItems.push(`${cropName}: बुवाई का अच्छा समय / Good time to sow ${crop.name}. Adequate moisture available.`);
      }
    }

    // High temperature
    if (weather.today.maxTemp > 40) {
      if (crop.idealTemp && weather.today.maxTemp > crop.idealTemp.max) {
        advisoryItems.push(`${cropName}: तापमान बहुत अधिक (${weather.today.maxTemp}°C)। सिंचाई बढ़ाएं / High temp. Increase irrigation for ${crop.name}.`);
      }
    }

    // Frost risk
    if (weather.today.minTemp < 5) {
      advisoryItems.push(`${cropName}: पाला पड़ने का खतरा (${weather.today.minTemp}°C)। फसल को ढकें / Frost risk. Cover ${crop.name} with mulch.`);
    }

    // Drought conditions during growing season
    if (weather.today.totalRainfall === 0 && weather.next3Days.every(d => d.rainfall === 0)) {
      if (crop.idealRainfall && crop.idealRainfall.min > 0) {
        advisoryItems.push(`${cropName}: कोई बारिश अपेक्षित नहीं। सिंचाई करें / No rain expected. Ensure irrigation for ${crop.name}.`);
      }
    }
  }

  // Wind advisory
  if (weather.alerts && weather.alerts.some(a => a.toLowerCase().includes('wind'))) {
    advisoryItems.push('तेज़ हवा की चेतावनी। फसल सहारा मजबूत करें / Strong winds expected. Secure crop supports.');
  }

  return advisoryItems;
}

/**
 * Get weather update message for a farmer
 */
async function getWeatherUpdate(farmer) {
  const weather = await getWeatherForecast(farmer.district);
  const lang = farmer.language || 'hi';

  // Build forecast string for next 3 days
  const forecastLines = weather.next3Days.map(d => {
    return getMessage('weather_day', lang, {
      date: d.date,
      maxTemp: d.maxTemp,
      minTemp: d.minTemp,
      rainfall: d.rainfall,
      conditions: d.conditions
    });
  }).join('\n');

  // Main weather message
  let response = getMessage('weather_update', lang, {
    district: farmer.district,
    temp: weather.current.temp,
    conditions: weather.current.description,
    humidity: weather.current.humidity,
    rainfall: weather.today.totalRainfall,
    forecast: forecastLines
  });

  // Add alerts if any
  if (weather.alerts.length > 0) {
    response += '\n\n';
    response += weather.alerts.map(alert => getMessage('weather_alert', lang, { alert })).join('\n');
  }

  return response;
}

/**
 * Get full crop advisory for a farmer
 */
async function getAdvisory(farmer) {
  const weather = await getWeatherForecast(farmer.district);
  const lang = farmer.language || 'hi';
  const advisoryItems = await analyzeConditions(weather, farmer.crops || []);

  if (advisoryItems.length === 0) {
    return getMessage('advisory_none', lang);
  }

  let response = getMessage('advisory_header', lang, { district: farmer.district });
  response += advisoryItems.map(item => getMessage('advisory_item', lang, { advice: item })).join('\n');

  return response;
}

module.exports = {
  getAdvisory,
  getWeatherUpdate,
  analyzeConditions
};
