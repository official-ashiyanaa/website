const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  ownerName: { type: String, trim: true, default: '' },
  location: { type: String, required: true, trim: true },
  city: { type: String, required: true, enum: ['nagaon', 'lumding', 'hojai'], lowercase: true },
  type: { type: String, enum: ['residential', 'commercial'], default: 'residential' },
  status: { type: String, enum: ['completed', 'ongoing', 'upcoming'], default: 'ongoing' },
  completionPercent: { type: Number, min: 0, max: 100, default: null },
  description: { type: String, trim: true, default: '' },
  image: { type: String, default: '' },
  seriesLabel: { type: String, trim: true, default: '' }, // e.g. "Project 5", "Project 1 - Lumding Series"
  displayOrder: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);
