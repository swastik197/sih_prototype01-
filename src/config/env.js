require('dotenv').config();

const config = {
  port: process.env.PORT || 3000,
  mongoDbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/sih2026',
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    whatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886',
    smsNumber: process.env.TWILIO_SMS_NUMBER || '',
  },
  openWeatherApiKey: process.env.OPENWEATHER_API_KEY || '',
  distressThreshold: parseInt(process.env.DISTRESS_THRESHOLD, 10) || 70,
  alertCronSchedule: process.env.ALERT_CRON_SCHEDULE || '0 */6 * * *',
  nodeEnv: process.env.NODE_ENV || 'development'
};

// Warn about missing optional vars
if (!config.twilio.accountSid) {
  console.warn('⚠️  TWILIO_ACCOUNT_SID not set. Twilio messaging will be disabled.');
}
if (!config.openWeatherApiKey) {
  console.warn('⚠️  OPENWEATHER_API_KEY not set. Using simulated weather data.');
}

module.exports = config;
