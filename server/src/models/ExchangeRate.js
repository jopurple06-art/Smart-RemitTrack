import mongoose from 'mongoose';

const exchangeRateSchema = new mongoose.Schema({
  from: { type: String, required: true, uppercase: true },
  to: { type: String, required: true, uppercase: true },
  rate: { type: Number, required: true, min: 0 },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });
exchangeRateSchema.index({ from: 1, to: 1 }, { unique: true });

export default mongoose.model('ExchangeRate', exchangeRateSchema);
