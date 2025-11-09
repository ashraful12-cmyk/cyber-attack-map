// backend/models/Attack.js
import mongoose from "mongoose";

const attackSchema = new mongoose.Schema({
  source: String,
  target: String,
  type: String,
  timestamp: { type: Date, default: Date.now }
});

export default mongoose.model("Attack", attackSchema);
