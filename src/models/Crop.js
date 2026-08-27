const mongoose = require('mongoose');

const cropSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, lowercase: true, trim: true },
  nameHi: { type: String, trim: true },
  nameTa: { type: String, trim: true },
  nameTe: { type: String, trim: true },
  season: { type: String, enum: ['kharif', 'rabi', 'zaid', 'annual'], required: true },
  sowingMonths: [{ type: Number, min: 1, max: 12 }],
  harvestMonths: [{ type: Number, min: 1, max: 12 }],
  idealRainfall: { 
    min: Number, 
    max: Number 
  },
  idealTemp: { 
    min: Number, 
    max: Number 
  },
  regions: [{ type: String, trim: true }]
}, { 
  timestamps: true, 
  versionKey: false 
});

module.exports = mongoose.model('Crop', cropSchema);
