import mongoose from 'mongoose';

export const TRANSFER_STATUSES = ['Initiated', 'Verification', 'Processing', 'Sent', 'Received'];

const eventSchema = new mongoose.Schema({
  status: { type: String, enum: TRANSFER_STATUSES, required: true },
  note: { type: String, default: '' },
  at: { type: Date, default: Date.now }
}, { _id: false });

const transactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  reference: { type: String, required: true, unique: true, index: true },
  senderName: { type: String, required: true, trim: true },
  senderCountry: { type: String, required: true, trim: true, default: 'United States' },
  receiverName: { type: String, required: true, trim: true },
  recipientAccountType: { type: String, enum: ['Checking', 'Savings', 'Current', 'Other'], default: 'Other' },
  recipientBankName: { type: String, trim: true, default: '' },
  recipientBranchName: { type: String, trim: true, default: '' },
  recipientAccountEncrypted: { type: String, default: '', select: false },
  recipientAccountLast4: { type: String, default: '' },
  recipientRoutingCode: { type: String, trim: true, uppercase: true, default: '' },
  recipientRoutingType: { type: String, trim: true, default: '' },
  swiftCode: { type: String, trim: true, uppercase: true, default: '' },
  ifscCode: { type: String, trim: true, uppercase: true, default: '' },
  country: { type: String, required: true, trim: true },
  fromCurrency: { type: String, required: true, uppercase: true },
  toCurrency: { type: String, required: true, uppercase: true },
  amount: { type: Number, required: true, min: 1 },
  usdAmount: { type: Number, required: true, min: 0 },
  fee: { type: Number, required: true },
  usdFee: { type: Number, required: true, min: 0 },
  exchangeRate: { type: Number, required: true },
  receiveAmount: { type: Number, required: true },
  purpose: { type: String, required: true },
  transferMethod: { type: String, enum: ['Bank deposit', 'Mobile wallet', 'Cash pickup'], default: 'Bank deposit' },
  note: { type: String, trim: true, maxlength: 300, default: '' },
  estimatedDays: { type: Number, required: true },
  status: { type: String, enum: TRANSFER_STATUSES, default: 'Initiated' },
  timeline: { type: [eventSchema], default: [] },
  completedAt: { type: Date, default: null }
}, { timestamps: true });

export default mongoose.model('Transaction', transactionSchema);
