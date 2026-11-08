export function getTransferRisk(transaction, now = new Date()) {
  const elapsedHours = (now - new Date(transaction.createdAt)) / 3_600_000;
  if (transaction.status === 'Verification' && Number(transaction.amount) >= 5000) {
    return { level: 'Attention Required', reason: 'A higher-value transfer is under verification.' };
  }
  if (!['Received'].includes(transaction.status) && elapsedHours > Number(transaction.estimatedDays || 2) * 24) {
    return { level: 'Delayed', reason: 'This transfer has exceeded its estimated processing window.' };
  }
  if (transaction.country === 'Nepal' && transaction.status !== 'Received' && elapsedHours > 48) {
    return { level: 'Delayed', reason: 'Transfers to this destination can require additional processing time.' };
  }
  return { level: 'Normal', reason: 'This transfer is progressing within its expected window.' };
}

export function getSmartInsight(transaction, history = [], now = new Date()) {
  const risk = getTransferRisk(transaction, now);
  if (risk.level === 'Attention Required') return 'This transaction is currently under verification. We will update you as soon as checks are complete.';
  if (risk.level === 'Delayed') return 'Your transfer is taking longer than expected. We are keeping it visible here while it completes.';
  if (transaction.status === 'Received') return 'Your recipient has received the funds. This transfer is complete.';
  if (transaction.status === 'Verification') return 'This transaction is currently under verification.';
  const prior = history.filter((item) => !(item._id && transaction._id && item._id.toString() === transaction._id.toString()) && item.status === 'Received');
  const usualHours = prior.length
    ? prior.reduce((sum, item) => sum + (new Date(item.completedAt || item.updatedAt) - new Date(item.createdAt)) / 3_600_000, 0) / prior.length
    : null;
  const elapsedHours = (now - new Date(transaction.createdAt)) / 3_600_000;
  if (usualHours !== null && elapsedHours > usualHours * 1.25 && !['Sent', 'Received'].includes(transaction.status)) {
    return 'This transfer is taking longer than your usual transfers.';
  }
  if (transaction.status === 'Sent') return 'Funds are on their way. Your recipient should receive them soon.';
  if (Number(transaction.fee) > 0 && Number(transaction.receiveAmount) < Number(transaction.amount) * Number(transaction.exchangeRate)) {
    return 'Your estimated receiving amount is lower because the transfer fee is deducted before conversion.';
  }
  if (transaction.status === 'Processing') return 'This transfer is being processed and is expected to complete soon.';
  if (transaction.status === 'Verification') return 'This transaction is currently under verification.';
  return 'Your transfer is on its way. We will keep its progress up to date here.';
}

export function getActionAlerts(transaction, history = [], now = new Date()) {
  const alerts = ['Please check that the receiver bank details are correct.'];
  const earlierAmounts = history
    .filter((item) => item._id?.toString() !== transaction._id?.toString())
    .map((item) => Number(item.usdAmount ?? item.amount))
    .filter((amount) => Number.isFinite(amount) && amount > 0);
  if (earlierAmounts.length) {
    const usualAmount = earlierAmounts.reduce((sum, amount) => sum + amount, 0) / earlierAmounts.length;
    if (Number(transaction.usdAmount ?? transaction.amount) > usualAmount * 1.5) {
      alerts.push('This transfer amount is higher than your usual amount. Please review it.');
    }
  }
  const risk = getTransferRisk(transaction, now);
  if (risk.level === 'Delayed') alerts.push('This transfer is taking longer than usual.');
  else if (!['Received', 'Verification'].includes(transaction.status)) alerts.push('Your transfer is being processed normally. No action is needed.');
  return alerts;
}
