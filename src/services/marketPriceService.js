const MarketPrice = require('../models/MarketPrice');
const { getMessage } = require('./languageService');
const { formatCurrency } = require('../utils/helpers');
const logger = require('../utils/logger');

/**
 * Get price trend arrow
 */
function getPriceTrend(currentPrice, previousPrice) {
  if (!previousPrice || previousPrice === 0) return '→';
  if (currentPrice > previousPrice * 1.02) return '↑';
  if (currentPrice < previousPrice * 0.98) return '↓';
  return '→';
}

/**
 * Get raw price data for a crop
 */
async function getPriceData(cropName, district) {
  if (!cropName) return [];

  const query = { crop: cropName.toLowerCase() };
  let prices = await MarketPrice.find(query)
    .sort({ price: -1 })
    .limit(10)
    .lean();

  // If district provided, prioritize same-district mandis
  if (district && prices.length > 4) {
    const sameDistrict = prices.filter(p => p.district.toLowerCase() === district.toLowerCase());
    const others = prices.filter(p => p.district.toLowerCase() !== district.toLowerCase());
    prices = [...sameDistrict, ...others].slice(0, 4);
  } else {
    prices = prices.slice(0, 4);
  }

  return prices;
}

/**
 * Get best mandi for a crop
 */
async function getBestMandi(cropName, district) {
  const prices = await getPriceData(cropName, district);
  return prices.length > 0 ? prices[0] : null;
}

/**
 * Get formatted price comparison message
 */
async function getPrices(cropName, district, language = 'hi') {
  if (!cropName) {
    const crops = await getAvailableCrops();
    return getMessage('price_not_found', language, {
      crop: '?',
      available: crops.join(', ')
    });
  }

  const prices = await getPriceData(cropName, district);

  if (prices.length === 0) {
    const crops = await getAvailableCrops();
    return getMessage('price_not_found', language, {
      crop: cropName,
      available: crops.join(', ')
    });
  }

  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

  // Header
  let response = getMessage('price_header', language, {
    crop: cropName.charAt(0).toUpperCase() + cropName.slice(1),
    date: today
  });

  // Price rows
  for (const p of prices) {
    const trend = getPriceTrend(p.price, p.previousPrice);
    response += getMessage('price_row', language, {
      mandi: p.mandi,
      district: p.district,
      price: formatCurrency(p.price).replace('₹', ''),
      unit: p.unit || 'quintal',
      trend
    }) + '\n';
  }

  // Best mandi
  const best = prices[0]; // already sorted by price desc
  response += getMessage('price_best', language, {
    mandi: best.mandi,
    price: formatCurrency(best.price).replace('₹', '')
  });

  return response;
}

/**
 * Get list of available crops in the database
 */
async function getAvailableCrops() {
  try {
    return await MarketPrice.distinct('crop');
  } catch (error) {
    logger.error('Error fetching available crops:', error.message);
    return ['tomato', 'wheat', 'rice', 'onion', 'potato'];
  }
}

module.exports = {
  getPrices,
  getPriceData,
  getBestMandi,
  getPriceTrend,
  getAvailableCrops
};
