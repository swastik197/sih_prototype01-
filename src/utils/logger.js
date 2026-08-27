const getTimestamp = () => new Date().toISOString();

const logger = {
  info: (message) => {
    console.log(`\x1b[34mℹ️ [${getTimestamp()}] INFO:\x1b[0m ${message}`);
  },
  warn: (message) => {
    console.warn(`\x1b[33m⚠️ [${getTimestamp()}] WARN:\x1b[0m ${message}`);
  },
  error: (message) => {
    console.error(`\x1b[31m❌ [${getTimestamp()}] ERROR:\x1b[0m ${message}`);
  },
  debug: (message) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`\x1b[36m🐛 [${getTimestamp()}] DEBUG:\x1b[0m ${message}`);
    }
  }
};

module.exports = logger;
