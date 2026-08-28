const cron = require('node-cron');
const { runDistressCheck } = require('../services/distressScorer');
const { getWeatherForecast } = require('../services/weatherService');
const { sendMessage } = require('../services/whatsappService');
const { getMessage } = require('../services/languageService');
const Farmer = require('../models/Farmer');
const AgriOfficer = require('../models/AgriOfficer');
const Alert = require('../models/Alert');
const MarketPrice = require('../models/MarketPrice');
const logger = require('../utils/logger');
const config = require('../config/env');

let isDistressRunning = false;

/**
 * Start all cron jobs
 */
function startScheduler() {
  // --- Job 1: Distress Check (every 6 hours) ---
  cron.schedule(config.alertCronSchedule, async () => {
    if (isDistressRunning) {
      logger.warn('Distress check still running, skipping');
      return;
    }
    isDistressRunning = true;
    logger.info('🔄 Starting distress check...');

    try {
      const highRiskResults = await runDistressCheck();
      let alertsSent = 0;

      for (const { farmer, score, factors, riskLevel } of highRiskResults) {
        // Alert the farmer
        const farmerMsg = getMessage('risk_report', farmer.language || 'hi', {
          score: String(score),
          riskLevel: riskLevel.toUpperCase(),
          rainfallScore: String(factors.rainfallScore),
          priceScore: String(factors.priceScore),
          loanScore: String(factors.loanScore),
          recommendation: getMessage(`risk_${riskLevel}`, farmer.language || 'hi')
        });
        await sendMessage(farmer.phone, farmerMsg, farmer.channel || 'whatsapp');

        // Alert the agri-officer
        const officer = await AgriOfficer.findOne({ district: farmer.district, isActive: true });
        if (officer) {
          const officerMsg = getMessage('distress_alert_officer', 'hi', {
            name: farmer.name || 'Unknown',
            district: farmer.district,
            state: farmer.state,
            score: String(score),
            rainfallDetail: `Score ${factors.rainfallScore}/100`,
            priceDetail: `Score ${factors.priceScore}/100`,
            loanDetail: `Score ${factors.loanScore}/100`,
            phone: farmer.phone
          });
          await sendMessage(officer.phone, officerMsg, 'sms');
        }

        // Log alert
        await Alert.create({
          farmerPhone: farmer.phone,
          officerPhone: officer?.phone || '',
          type: 'distress',
          message: `Distress score: ${score}/100 (${riskLevel})`,
          distressScore: score,
          channel: farmer.channel || 'whatsapp'
        });
        alertsSent++;
      }

      logger.info(`✅ Distress check complete: ${alertsSent} alerts sent`);
    } catch (error) {
      logger.error(`Distress check error: ${error.message}`);
    } finally {
      isDistressRunning = false;
    }
  }, { timezone: 'Asia/Kolkata' });

  // --- Job 2: Daily Weather Broadcast (7 AM IST) ---
  cron.schedule('0 7 * * *', async () => {
    logger.info('🌤️ Starting weather broadcast...');
    try {
      const farmers = await Farmer.find({ isRegistered: true }).lean();

      // Group by district to avoid duplicate API calls
      const districtMap = new Map();
      for (const f of farmers) {
        if (!f.district) continue;
        if (!districtMap.has(f.district)) districtMap.set(f.district, []);
        districtMap.get(f.district).push(f);
      }

      let alertCount = 0;
      for (const [district, farmersInDistrict] of districtMap.entries()) {
        const weather = await getWeatherForecast(district);

        if (weather.alerts && weather.alerts.length > 0) {
          for (const farmer of farmersInDistrict) {
            const msg = weather.alerts.map(alert =>
              getMessage('weather_alert', farmer.language || 'hi', { alert })
            ).join('\n');
            await sendMessage(farmer.phone, msg, farmer.channel || 'whatsapp');

            await Alert.create({
              farmerPhone: farmer.phone,
              type: 'weather',
              message: weather.alerts.join('; '),
              channel: farmer.channel || 'whatsapp'
            });
            alertCount++;
          }
        }
      }

      logger.info(`✅ Weather broadcast done: ${alertCount} alerts sent`);
    } catch (error) {
      logger.error(`Weather broadcast error: ${error.message}`);
    }
  }, { timezone: 'Asia/Kolkata' });

  // --- Job 3: Price Simulation Update (6 AM IST, demo only) ---
  cron.schedule('0 6 * * *', async () => {
    logger.info('💰 Updating simulated prices...');
    try {
      const prices = await MarketPrice.find({});
      let updated = 0;

      for (const priceDoc of prices) {
        const changePercent = (Math.random() * 0.30) - 0.15; // ±15%
        const newPrice = Math.round(priceDoc.price * (1 + changePercent));

        priceDoc.previousPrice = priceDoc.price;
        priceDoc.price = Math.max(newPrice, 10); // minimum ₹10
        priceDoc.priceDate = new Date();
        await priceDoc.save();
        updated++;
      }

      logger.info(`✅ Price update done: ${updated} records updated`);
    } catch (error) {
      logger.error(`Price update error: ${error.message}`);
    }
  }, { timezone: 'Asia/Kolkata' });

  logger.info('📅 All cron jobs scheduled');
}

module.exports = { startScheduler };
