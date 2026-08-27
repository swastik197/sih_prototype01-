const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  farmerPhone: { type: String, required: true },
  officerPhone: String,
  type: { type: String, enum: ['distress', 'weather', 'price_crash', 'advisory'], required: true },
  message: { type: String, required: true },
  distressScore: Number,
  channel: { type: String, enum: ['whatsapp', 'sms'] },
  sentAt: { type: Date, default: Date.now },
  acknowledged: { type: Boolean, default: false }
}, { 
  timestamps: true, 
  versionKey: false 
});

alertSchema.index({ farmerPhone: 1, sentAt: -1 });

module.exports = mongoose.model('Alert', alertSchema);
