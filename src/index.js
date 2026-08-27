const express = require('express');
const morgan = require('morgan');
const config = require('./config/env');
const connectDB = require('./config/db');
const { startScheduler } = require('./cron/scheduler');
const logger = require('./utils/logger');
const webhookRoutes = require('./routes/webhook');
const adminRoutes = require('./routes/admin');

const app = express();

// Middleware
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/webhook', webhookRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'SIH2026 Smart Crop Advisory',
    timestamp: new Date().toISOString()
  });
});

// Start server
const startServer = async () => {
  try {
    await connectDB();
    logger.info('MongoDB connected successfully');

    startScheduler();
    logger.info('Cron scheduler started');

    const server = app.listen(config.port, () => {
      logger.info(`Server running on port ${config.port} [${config.nodeEnv}]`);
      logger.info(`Webhook URL: http://localhost:${config.port}/webhook/whatsapp`);
      logger.info(`Admin API: http://localhost:${config.port}/api/admin/stats`);
    });

    const shutdown = () => {
      logger.info('Shutting down gracefully...');
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    logger.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
