import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import ExchangeRate from '../models/ExchangeRate.js';
import Notification from '../models/Notification.js';
import Transaction, { TRANSFER_STATUSES } from '../models/Transaction.js';
import { getActionAlerts, getSmartInsight, getTransferRisk } from '../utils/insights.js';
import { createReference } from '../utils/reference.js';
import { encryptAccountNumber, maskAccountNumber } from '../utils/accountSecurity.js';

const router = Router();
router.use(requireAuth);
const processingDays = { India: 2, Philippines: 2, Mexico: 1, Nepal: 3, Nigeria: 3, Pakistan: 3, Bangladesh: 2, Kenya: 2, 'United Kingdom': 1, Canada: 1, Germany: 1, Australia: 2, 'United States': 1 };
const destinationCurrencies = { India: 'INR', Philippines: 'PHP', Mexico: 'MXN', Nepal: 'NPR', Nigeria: 'NGN', Pakistan: 'PKR', Bangladesh: 'BDT', Kenya: 'KES', 'United Kingdom': 'GBP', Canada: 'CAD', Germany: 'EUR', Australia: 'AUD', 'United States': 'USD' };
const routingTypes = { India: 'IFSC', 'United States': 'ABA routing number', 'United Kingdom': 'Sort code', Canada: 'Transit / institution number', Australia: 'BSB', Mexico: 'CLABE', Germany: 'IBAN', Pakistan: 'IBAN', Philippines: 'SWIFT / BIC', Nepal: 'SWIFT / BIC', Nigeria: 'SWIFT / BIC', Bangladesh: 'Bank routing number', Kenya: 'SWIFT / BIC' };
const safePattern = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const routingPattern = (country) => ({
  India: /^[A-Z]{4}0[A-Z0-9]{6}$/,
  'United States': /^\d{9}$/,
  'United Kingdom': /^\d{6}$/,
  Australia: /^\d{6}$/,
  Mexico: /^\d{18}$/,
  Germany: /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/,
  Pakistan: /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/
}[country] || /^[A-Z0-9]{6,34}$/);
const defaultSenderCountry = { INR: 'India', USD: 'United States', EUR: 'Germany', GBP: 'United Kingdom', CAD: 'Canada', AUD: 'Australia' };

function safeTransaction(transaction) {
  const value = transaction.toObject ? transaction.toObject() : { ...transaction };
  const lastFour = value.recipientAccountLast4 || transaction.recipientAccountLast4;
  delete value.recipientAccountEncrypted;
  delete value.recipientAccountLast4;
  value.recipientAccountMasked = maskAccountNumber(lastFour);
  return value;
}

router.get('/rates', async (_request, response, next) => {
  try { response.json({ rates: await ExchangeRate.find().sort({ from: 1, to: 1 }).lean() }); }
  catch (error) { next(error); }
});

router.get('/reference', (_request, response) => response.json({ reference: createReference() }));

router.get('/', async (request, response, next) => {
  try {
    const { status, country, search } = request.query;
    const filter = { user: request.user.id };
    if (TRANSFER_STATUSES.includes(status)) filter.status = status;
    if (country) filter.country = country;
    if (search) {
      const pattern = new RegExp(safePattern(String(search).slice(0, 80)), 'i');
      filter.$or = [{ reference: pattern }, { receiverName: pattern }, { senderName: pattern }, { country: pattern }];
    }
    const transactions = await Transaction.find(filter).select('-recipientAccountLast4').sort({ createdAt: -1 }).limit(100).lean();
    response.json({ transactions });
  } catch (error) { next(error); }
});

router.post('/', async (request, response, next) => {
  try {
    const {
      reference: requestedReference, senderName, senderCountry, receiverName, recipientBankName = '', recipientAccountNumber = '',
      recipientAccountType = 'Other', recipientBranchName = '', recipientRoutingCode = '', swiftCode = '', ifscCode = '',
      country, fromCurrency, toCurrency, amount, purpose, transferMethod = 'Bank deposit', note = ''
    } = request.body;
    const required = [senderName, receiverName, country, fromCurrency, toCurrency, purpose];
    if (required.some((value) => typeof value !== 'string' || !value.trim())) return response.status(400).json({ message: 'Complete all transfer fields.' });
    const accountNumber = recipientAccountNumber.replace(/[\s-]/g, '').toUpperCase();
    const swift = swiftCode.replace(/[\s-]/g, '').toUpperCase();
    const ifsc = ifscCode.replace(/[\s-]/g, '').toUpperCase();
    const routingCode = (recipientRoutingCode || ifscCode || swiftCode).replace(/[\s-]/g, '').toUpperCase();
    if (!['Bank deposit', 'Mobile wallet', 'Cash pickup'].includes(transferMethod)) return response.status(400).json({ message: 'Choose a transfer method.' });
    if (!['Checking', 'Savings', 'Current', 'Other'].includes(recipientAccountType)) return response.status(400).json({ message: 'Choose a valid account type.' });
    if (transferMethod === 'Bank deposit') {
      if (!recipientBankName.trim() || !accountNumber || !routingCode) return response.status(400).json({ message: 'Add the receiver bank name, account number, and bank code.' });
      if (!/^[A-Z0-9]{4,34}$/.test(accountNumber)) return response.status(400).json({ message: 'Account number must be 4–34 letters or digits.' });
      if (!/^[A-Z0-9]{4,34}$/.test(routingCode) || !routingPattern(country).test(routingCode)) {
        return response.status(400).json({ message: `Enter a valid ${routingTypes[country] || 'bank routing code'} for ${country}.` });
      }
    }
    if (swift && !/^[A-Z0-9]{8}([A-Z0-9]{3})?$/.test(swift)) return response.status(400).json({ message: 'SWIFT/BIC must be 8 or 11 letters or digits.' });
    if (ifsc && !routingPattern('India').test(ifsc)) return response.status(400).json({ message: 'Enter a valid IFSC code.' });
    if (note && (typeof note !== 'string' || note.length > 300)) return response.status(400).json({ message: 'Notes must be 300 characters or fewer.' });
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount < 1 || numericAmount > 1_000_000) return response.status(400).json({ message: 'Amount must be between 1 and 1,000,000.' });
    const from = fromCurrency.toUpperCase();
    const to = toCurrency.toUpperCase();
    if (!['INR', 'USD', 'EUR', 'GBP', 'CAD', 'AUD'].includes(from)) return response.status(400).json({ message: 'Choose a supported sending currency.' });
    if (!destinationCurrencies[country] || destinationCurrencies[country] !== to) return response.status(400).json({ message: 'Destination country and receiving currency do not match.' });
    const rateRecord = from === to ? { rate: 1 } : await ExchangeRate.findOne({ from, to });
    if (!rateRecord) return response.status(400).json({ message: `No demo exchange rate is available for ${from} to ${to}.` });
    const usdRate = from === 'USD' ? { rate: 1 } : await ExchangeRate.findOne({ from, to: 'USD' });
    if (!usdRate) return response.status(400).json({ message: `No USD conversion is available for ${from}.` });
    const fee = Math.round(Math.max(3, numericAmount * 0.0125) * 100) / 100;
    const usdAmount = Math.round(numericAmount * usdRate.rate * 100) / 100;
    const usdFee = Math.round(fee * usdRate.rate * 100) / 100;
    const exchangeRate = rateRecord.rate;
    let reference = createReference();
    if (requestedReference !== undefined) {
      if (typeof requestedReference !== 'string' || !/^SRM-\d{4}-\d{6}$/.test(requestedReference)) {
        return response.status(400).json({ message: 'The transaction reference is not valid. Please review the transfer again.' });
      }
      if (await Transaction.exists({ reference: requestedReference })) {
        return response.status(409).json({ message: 'This reference was just used. Please review the transfer again.' });
      }
      reference = requestedReference;
    }
    const transaction = await Transaction.create({
      user: request.user.id,
      reference,
      senderName: senderName.trim().slice(0, 100),
      senderCountry: (senderCountry || defaultSenderCountry[from] || 'United States').trim().slice(0, 60),
      receiverName: receiverName.trim().slice(0, 100),
      recipientBankName: recipientBankName.trim().slice(0, 100),
      recipientAccountEncrypted: accountNumber ? encryptAccountNumber(accountNumber) : '',
      recipientAccountLast4: accountNumber.slice(-4),
      recipientAccountType,
      recipientBranchName: recipientBranchName.trim().slice(0, 100),
      recipientRoutingCode: routingCode,
      recipientRoutingType: ifsc ? 'IFSC' : routingCode ? routingTypes[country] || 'Bank routing code' : swift ? 'SWIFT/BIC' : '',
      swiftCode: swift,
      ifscCode: ifsc,
      country: country.trim().slice(0, 60),
      fromCurrency: from,
      toCurrency: to,
      amount: numericAmount,
      usdAmount,
      fee,
      usdFee,
      exchangeRate,
      receiveAmount: Math.round((numericAmount - fee) * exchangeRate * 100) / 100,
      purpose: purpose.trim().slice(0, 100),
      transferMethod,
      note: note.trim(),
      estimatedDays: processingDays[country] || 2,
      timeline: [{ status: 'Initiated', note: 'Transfer details submitted.' }]
    });
    await Notification.create({ user: request.user.id, transaction: transaction.id, title: 'Transfer started', message: `${transaction.reference} is ready for tracking.`, type: 'info' });
    response.status(201).json({ transaction: safeTransaction(transaction), insight: getSmartInsight(transaction, []) });
  } catch (error) { next(error); }
});

router.get('/:id', async (request, response, next) => {
  try {
    const transaction = await Transaction.findOne({ _id: request.params.id, user: request.user.id }).lean();
    if (!transaction) return response.status(404).json({ message: 'Transaction not found.' });
    const history = await Transaction.find({ user: request.user.id }).select('status createdAt updatedAt completedAt amount usdAmount').lean();
    response.json({ transaction: safeTransaction(transaction), insight: getSmartInsight(transaction, history), risk: getTransferRisk(transaction), alerts: getActionAlerts(transaction, history) });
  } catch (error) { next(error); }
});

router.post('/:id/advance', async (request, response, next) => {
  try {
    const transaction = await Transaction.findOne({ _id: request.params.id, user: request.user.id });
    if (!transaction) return response.status(404).json({ message: 'Transaction not found.' });
    const index = TRANSFER_STATUSES.indexOf(transaction.status);
    if (index === TRANSFER_STATUSES.length - 1) return response.status(409).json({ message: 'This transfer is already complete.' });
    transaction.status = TRANSFER_STATUSES[index + 1];
    const notes = {
      Verification: 'Identity and transfer details are being checked.',
      Processing: 'Transfer approved and being processed.',
      Sent: 'Funds have left the sending institution.',
      Received: 'Funds have been delivered to the recipient.'
    };
    transaction.timeline.push({ status: transaction.status, note: notes[transaction.status] });
    if (transaction.status === 'Received') transaction.completedAt = new Date();
    await transaction.save();
    const notification = await Notification.create({
      user: request.user.id,
      transaction: transaction.id,
      title: transaction.status === 'Received' ? 'Transfer received' : `${transaction.status} update`,
      message: `${transaction.reference}: ${notes[transaction.status]}`,
      type: transaction.status === 'Received' ? 'success' : 'info'
    });
    const history = await Transaction.find({ user: request.user.id }).select('status createdAt updatedAt completedAt amount usdAmount').lean();
    const risk = getTransferRisk(transaction);
    response.json({ transaction: safeTransaction(transaction), notification, insight: getSmartInsight(transaction, history), risk });
  } catch (error) { next(error); }
});

export default router;
