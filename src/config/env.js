require('dotenv').config();

const config = {
  port: process.env.PORT || 3000,
  mongoDbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/sih2026',
  metaWhatsapp: {
    phoneNumberId: process.env.META_WA_PHONE_NUMBER_ID || '',
    accessToken: process.env.META_WA_ACCESS_TOKEN || '',
    verifyToken: process.env.META_WA_VERIFY_TOKEN || 'sih_2026_webhook_secret',
  },
  sarvamApiKey: process.env.SARVAM_API_KEY || '',
  openWeatherApiKey: process.env.OPENWEATHER_API_KEY || '',
  distressThreshold: parseInt(process.env.DISTRESS_THRESHOLD, 10) || 70,
  alertCronSchedule: process.env.ALERT_CRON_SCHEDULE || '0 */6 * * *',
  nodeEnv: process.env.NODE_ENV || 'development'
};

// Warn about missing optional vars
if (!config.metaWhatsapp.accessToken || !config.metaWhatsapp.phoneNumberId) {
  console.warn('⚠️  META_WA_ACCESS_TOKEN or META_WA_PHONE_NUMBER_ID not set. WhatsApp messaging will be disabled.');
}
if (!config.openWeatherApiKey) {
  console.warn('⚠️  OPENWEATHER_API_KEY not set. Using simulated weather data.');
}

module.exports = config;
