const mongoose = require('mongoose');

const farmerSchema = new mongoose.Schema({
  phone: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true, 
    match: /^\+[1-9]\d{1,14}$/ 
  },
  name: { type: String, trim: true, maxlength: 100 },
  district: { type: String, trim: true },
  state: { type: String, trim: true },
  language: { type: String, enum: ['hi', 'en', 'ta', 'te'], default: 'hi' },
  crops: [{ type: String, trim: true, lowercase: true }],
  landSize: { type: Number, min: 0 },
  loanDueDate: Date,
  loanAmount: { type: Number, min: 0 },
  channel: { type: String, enum: ['whatsapp', 'sms'], default: 'whatsapp' },
  isRegistered: { type: Boolean, default: false },
  registrationStep: { type: Number, default: 0 },
  tempData: { type: mongoose.Schema.Types.Mixed }
}, { 
  timestamps: true, 
  versionKey: false 
});

farmerSchema.index({ district: 1, isRegistered: 1 });
farmerSchema.index({ state: 1 });

module.exports = mongoose.model('Farmer', farmerSchema);
