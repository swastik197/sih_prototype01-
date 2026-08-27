const mongoose = require('mongoose');

const agriOfficerSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true, trim: true },
  name: { type: String, required: true, trim: true },
  district: { type: String, required: true, trim: true },
  state: { type: String, required: true, trim: true },
  designation: { type: String, default: 'Block Development Officer' },
  isActive: { type: Boolean, default: true }
}, { 
  timestamps: true, 
  versionKey: false 
});

agriOfficerSchema.index({ district: 1, state: 1 });

module.exports = mongoose.model('AgriOfficer', agriOfficerSchema);
