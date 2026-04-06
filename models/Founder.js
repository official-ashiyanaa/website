const mongoose = require('mongoose');

const founderSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  title: { type: String, required: true, trim: true }, // e.g. "Managing Director", "Co-Founder"
  bio: { type: String, trim: true, default: '' },
  image: { type: String, default: '' },
  phone: { type: String, trim: true, default: '' },
  email: { type: String, trim: true, default: '' },
  displayOrder: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Founder', founderSchema);
