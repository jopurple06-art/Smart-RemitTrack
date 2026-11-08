import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  transaction: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', default: null },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['success', 'info', 'warning'], default: 'info' },
  readAt: { type: Date, default: null }
}, { timestamps: true });

export default mongoose.model('Notification', notificationSchema);
