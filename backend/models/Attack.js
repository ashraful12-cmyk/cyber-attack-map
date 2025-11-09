// backend/models/Attack.js
const mongoose = require('mongoose');

const AttackSchema = new mongoose.Schema({
  ip: { type: String, default: '0.0.0.0' },
  country: String,
  lat: Number,
  lon: Number,
  confidence: Number,
  source: String,
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Attack', AttackSchema);
