import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDatabase } from './config/database.js';
import ExchangeRate from './models/ExchangeRate.js';
import Notification from './models/Notification.js';
import Transaction from './models/Transaction.js';
import User from './models/User.js';
import { encryptAccountNumber } from './utils/accountSecurity.js';

await connectDatabase();

const rateRows = [
  ['USD', 'INR', 83.12], ['USD', 'PHP', 56.2], ['USD', 'MXN', 17.1], ['USD', 'NPR', 133.0],
  ['USD', 'NGN', 1535], ['USD', 'PKR', 278], ['USD', 'BDT', 109.8], ['USD', 'KES', 129.5],
  ['USD', 'GBP', 0.79], ['USD', 'CAD', 1.36], ['USD', 'EUR', 0.92], ['USD', 'AUD', 1.52]
];
const usdValues = new Map([['USD', 1], ...rateRows.map(([, to, rate]) => [to, rate])]);
for (const [from, fromValue] of usdValues) {
  for (const [to, toValue] of usdValues) {
    if (from === to) continue;
    const rate = toValue / fromValue;
    await ExchangeRate.updateOne({ from, to }, { $set: { rate, updatedAt: new Date() } }, { upsert: true });
  }
}

const email = 'demo@smartremittrack.com';
let user = await User.findOne({ email }).select('+passwordHash');
if (!user) {
  user = new User({ name: 'Alex Morgan', email, phone: '+1 415 555 0184', homeCountry: 'United States' });
  await user.setPassword('DemoPass123!');
  await user.save();
}
await Promise.all([
  Transaction.deleteMany({ user: user.id }),
  Notification.deleteMany({ user: user.id })
]);

const now = Date.now();
const examples = [
  { receiverName: 'Priya Sharma', country: 'India', toCurrency: 'INR', amount: 850, status: 'Received', ageDays: 11 },
  { receiverName: 'Mateo Cruz', country: 'Mexico', toCurrency: 'MXN', amount: 420, status: 'Received', ageDays: 8 },
  { receiverName: 'Maria Santos', country: 'Philippines', toCurrency: 'PHP', amount: 1200, status: 'Sent', ageDays: 1 },
  { receiverName: 'Aarav Karki', country: 'Nepal', toCurrency: 'NPR', amount: 650, status: 'Processing', ageDays: 4 },
  { receiverName: 'Fatima Ali', country: 'Pakistan', toCurrency: 'PKR', amount: 525, status: 'Verification', ageDays: 0.2 },
  { receiverName: 'Chinwe Okafor', country: 'Nigeria', toCurrency: 'NGN', amount: 960, status: 'Processing', ageDays: 0.7 },
  { receiverName: 'Luz Reyes', country: 'Philippines', toCurrency: 'PHP', amount: 310, status: 'Received', ageDays: 20 },
  { receiverName: 'Daniel Kim', country: 'Canada', toCurrency: 'CAD', amount: 780, status: 'Initiated', ageDays: 0.1 }
];
const statusIndex = { Initiated: 0, Verification: 1, Processing: 2, Sent: 3, Received: 4 };
const transactions = examples.map((example, itemIndex) => {
  const createdAt = new Date(now - example.ageDays * 86_400_000);
  const fee = Math.round(Math.max(3, example.amount * 0.0125) * 100) / 100;
  const rate = rateRows.find((row) => row[1] === example.toCurrency)[2];
  const recipientAccountNumber = `9000000000${String(itemIndex + 1).padStart(2, '0')}`;
  const recipientRoutingType = example.country === 'India' ? 'IFSC' : example.country === 'Mexico' ? 'CLABE' : example.country === 'Canada' ? 'Transit / institution number' : 'SWIFT / BIC';
  const recipientRoutingCode = example.country === 'India' ? 'HDFC0001234' : example.country === 'Mexico' ? '012345678901234567' : example.country === 'Canada' ? '001000100' : 'DEMOUS33XXX';
  const timeline = Array.from({ length: statusIndex[example.status] + 1 }, (_, index) => ({
    status: ['Initiated', 'Verification', 'Processing', 'Sent', 'Received'][index],
    note: index === 0 ? 'Transfer details submitted.' : 'Transfer status updated.',
    at: new Date(createdAt.getTime() + index * 3_600_000)
  }));
  return {
    user: user.id,
    reference: `SMR-DEMO-${String(itemIndex + 1).padStart(4, '0')}`,
    senderName: user.name,
    receiverName: example.receiverName,
    recipientBankName: 'Demo International Bank',
    recipientAccountEncrypted: encryptAccountNumber(recipientAccountNumber),
    recipientAccountLast4: recipientAccountNumber.slice(-4),
    recipientRoutingCode,
    recipientRoutingType,
    country: example.country,
    fromCurrency: 'USD',
    toCurrency: example.toCurrency,
    amount: example.amount,
    usdAmount: example.amount,
    fee,
    usdFee: fee,
    exchangeRate: rate,
    receiveAmount: Math.round((example.amount - fee) * rate * 100) / 100,
    purpose: ['Family support', 'Education', 'Household expenses'][itemIndex % 3],
    estimatedDays: example.country === 'Nepal' ? 3 : 2,
    status: example.status,
    timeline,
    createdAt,
    updatedAt: timeline.at(-1).at,
    completedAt: example.status === 'Received' ? timeline.at(-1).at : null
  };
});
await Transaction.insertMany(transactions);
await Notification.insertMany([
  { user: user.id, transaction: transactions[0].id, title: 'Transfer received', message: `${transactions[0].reference}: funds were delivered to Priya.`, type: 'success', createdAt: new Date(now - 10 * 86_400_000), readAt: new Date(now - 9 * 86_400_000) },
  { user: user.id, transaction: transactions[3].id, title: 'Delay detected', message: `${transactions[3].reference} is beyond its estimated processing window.`, type: 'warning', createdAt: new Date(now - 2 * 86_400_000), readAt: null },
  { user: user.id, transaction: transactions[2].id, title: 'Transfer sent', message: `${transactions[2].reference}: funds are on their way.`, type: 'info', createdAt: new Date(now - 12 * 3_600_000), readAt: null }
]);
console.log(`Seed complete. Demo sign-in: ${email} / DemoPass123!`);
await mongoose.disconnect();
