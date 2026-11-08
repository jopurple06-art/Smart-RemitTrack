import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import Transaction from '../models/Transaction.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (request, response, next) => {
  try {
    const transactions = await Transaction.find({ user: request.user.id }).sort({ createdAt: 1 }).lean();
    const totals = transactions.reduce((result, item) => {
      result.sent += item.usdAmount ?? item.amount;
      result.fees += item.usdFee ?? item.fee;
      result.count += 1;
      if (item.status === 'Received') result.completed += 1;
      else result.pending += 1;
      return result;
    }, { sent: 0, fees: 0, count: 0, completed: 0, pending: 0 });
    totals.averageFee = totals.count ? Math.round((totals.fees / totals.count) * 100) / 100 : 0;
    const countries = Object.values(transactions.reduce((groups, item) => {
      groups[item.country] ||= { country: item.country, count: 0, amount: 0 };
      groups[item.country].count += 1;
      groups[item.country].amount += item.usdAmount ?? item.amount;
      return groups;
    }, {})).sort((a, b) => b.amount - a.amount);
    totals.mostUsedCountry = [...countries].sort((a, b) => b.count - a.count)[0]?.country || null;
    const now = new Date();
    totals.thisMonth = Math.round(transactions.reduce((sum, item) => {
      const createdAt = new Date(item.createdAt);
      return createdAt.getFullYear() === now.getFullYear() && createdAt.getMonth() === now.getMonth()
        ? sum + (item.usdAmount ?? item.amount)
        : sum;
    }, 0) * 100) / 100;
    const months = Array.from({ length: 6 }, (_, offset) => {
      const date = new Date();
      date.setDate(1);
      date.setMonth(date.getMonth() - (5 - offset));
      return { key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`, month: date.toLocaleString('en', { month: 'short' }), amount: 0, fees: 0, count: 0 };
    });
    const monthIndex = Object.fromEntries(months.map((item, index) => [item.key, index]));
    transactions.forEach((item) => {
      const date = new Date(item.createdAt);
      const index = monthIndex[`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`];
      if (index !== undefined) {
        months[index].amount += item.usdAmount ?? item.amount;
        months[index].fees += item.usdFee ?? item.fee;
        months[index].count += 1;
      }
    });
    response.json({ totals, countries, months, transactions: transactions.length });
  } catch (error) { next(error); }
});

export default router;
