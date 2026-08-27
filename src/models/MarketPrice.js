const mongoose = require('mongoose');

const marketPriceSchema = new mongoose.Schema({
  crop: { type: String, required: true, lowercase: true, trim: true },
  mandi: { type: String, required: true, trim: true },
  district: { type: String, required: true, trim: true },
  state: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: 0 },
  previousPrice: { type: Number, min: 0 },
  priceDate: { type: Date, required: true },
  unit: { type: String, default: 'quintal' }
}, { 
  timestamps: true, 
  versionKey: false 
});

marketPriceSchema.index({ crop: 1, district: 1 });
marketPriceSchema.index({ crop: 1, priceDate: -1 });

module.exports = mongoose.model('MarketPrice', marketPriceSchema);
