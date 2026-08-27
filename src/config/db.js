const mongoose = require('mongoose');
const config = require('./env');
const logger = require('../utils/logger');

let isConnected;

const connectDB = async () => {
  if (isConnected) {
    logger.info('Using existing database connection');
    return;
  }

  try {
    const db = await mongoose.connect(config.mongoDbUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });
    
    isConnected = db.connections[0].readyState;

    mongoose.connection.on('connected', () => {
      logger.info('MongoDB connected successfully');
    });

    mongoose.connection.on('error', (err) => {
      logger.error(`MongoDB connection error: ${err}`);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

  } catch (error) {
    logger.error(`Error connecting to database: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
