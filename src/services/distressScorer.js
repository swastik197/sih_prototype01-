const config = require('../config/env');
const { getWeatherForecast } = require('./weatherService');
const MarketPrice = require('../models/MarketPrice');
const Crop = require('../models/Crop');
const Farmer = require('../models/Farmer');
const logger = require('../utils/logger');

const WEIGHTS = { rainfall: 0.35, price: 0.35, loan: 0.30 };

/**
 * Map numeric score to risk level string
 */
function getRiskLevel(score) {
  if (score <= 30) return 'low';
  if (score <= 50) return 'medium';
  if (score <= 70) return 'high';
  return 'critical';
}

/**
 * Calculate rainfall deviation score (0-100)
 */
async function calcRainfallScore(farmer) {
  try {
    const weather = await getWeatherForecast(farmer.district);
    const crops = await Crop.find({ name: { $in: farmer.crops || [] } }).lean();

    if (crops.length === 0) return 20; // default moderate if no crop data

    // Average ideal rainfall across farmer's crops
    const avgIdeal = crops.reduce((sum, c) => {
      const mid = c.idealRainfall ? (c.idealRainfall.min + c.idealRainfall.max) / 2 : 100;
      return sum + mid;
    }, 0) / crops.length;

    // Compare 3-day total forecast rainfall to monthly ideal (scaled to 3 days)
    const expected3Day = (avgIdeal / 30) * 3; // expected rainfall for 3 days
    const actual3Day = weather.today.totalRainfall + weather.next3Days.reduce((s, d) => s + d.rainfall, 0);
    const deviation = Math.abs(actual3Day - expected3Day) / (expected3Day || 1) * 100;

    if (deviation > 50) return 100;
    if (deviation > 30) return 70;
    if (deviation > 10) return 40;
    return 10;
  } catch (error) {
    logger.warn(`Rainfall score error for ${farmer.phone}: ${error.message}`);
    return 20;
  }
}

/**
 * Calculate price crash score (0-100)
 */
async function calcPriceCrashScore(farmer) {
  try {
    if (!farmer.crops || farmer.crops.length === 0) return 10;

    let maxCrashScore = 10;

    for (const cropName of farmer.crops) {
      const prices = await MarketPrice.find({ crop: cropName })
        .sort({ priceDate: -1 })
        .limit(5)
        .lean();

      if (prices.length === 0) continue;

      for (const p of prices) {
        if (p.previousPrice && p.previousPrice > 0) {
          const dropPercent = ((p.previousPrice - p.price) / p.previousPrice) * 100;
          let score = 10;
          if (dropPercent > 30) score = 100;
          else if (dropPercent > 20) score = 75;
          else if (dropPercent > 10) score = 40;
          maxCrashScore = Math.max(maxCrashScore, score);
        }
      }
    }

    return maxCrashScore;
  } catch (error) {
    logger.warn(`Price crash score error for ${farmer.phone}: ${error.message}`);
    return 10;
  }
}

/**
 * Calculate loan proximity score (0-100)
 */
function calcLoanProximityScore(farmer) {
  if (!farmer.loanDueDate || !farmer.loanAmount) return 0;

  const daysUntil = (new Date(farmer.loanDueDate) - new Date()) / (1000 * 3600 * 24);

  if (daysUntil <= 0) return 100;  // overdue
  if (daysUntil <= 15) return 100;
  if (daysUntil <= 30) return 75;
  if (daysUntil <= 60) return 40;
  if (daysUntil <= 90) return 20;
  return 5;
}

/**
 * Calculate full distress score for a farmer
 */
async function calculateDistressScore(farmer) {
  const rainfallScore = await calcRainfallScore(farmer);
  const priceScore = await calcPriceCrashScore(farmer);
  const loanScore = calcLoanProximityScore(farmer);

  const score = Math.round(
    WEIGHTS.rainfall * rainfallScore +
    WEIGHTS.price * priceScore +
    WEIGHTS.loan * loanScore
  );

  const result = {
    score,
    factors: {
      rainfallScore,
      priceScore,
      loanScore
    },
    riskLevel: getRiskLevel(score)
  };

  logger.debug(`Distress score for ${farmer.phone}: ${score} (${result.riskLevel})`);
  return result;
}

/**
 * Run distress check on ALL registered farmers
 * Returns array of high-risk results
 */
async function runDistressCheck() {
  const farmers = await Farmer.find({ isRegistered: true }).lean();
  const results = [];

  for (const farmer of farmers) {
    const result = await calculateDistressScore(farmer);
    if (result.score >= config.distressThreshold) {
      results.push({
        farmer,
        ...result
      });
    }
  }

  logger.info(`Distress check: ${farmers.length} farmers checked, ${results.length} high-risk`);
  return results;
}

module.exports = {
  calculateDistressScore,
  runDistressCheck,
  getRiskLevel
};
