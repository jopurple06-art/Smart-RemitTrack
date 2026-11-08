import test from 'node:test';
import assert from 'node:assert/strict';
import { getActionAlerts, getSmartInsight, getTransferRisk } from '../src/utils/insights.js';

const now = new Date('2026-09-30T12:00:00Z');
const transfer = (overrides = {}) => ({
  status: 'Processing', amount: 250, fee: 3.13, exchangeRate: 83.12,
  receiveAmount: 20515.43, estimatedDays: 2, country: 'India',
  createdAt: new Date('2026-09-30T08:00:00Z'), ...overrides
});

test('flags a high-value transfer under verification for attention', () => {
  assert.equal(getTransferRisk(transfer({ status: 'Verification', amount: 6000 }), now).level, 'Attention Required');
});

test('flags an overdue transfer as delayed', () => {
  assert.equal(getTransferRisk(transfer({ createdAt: new Date('2026-09-27T00:00:00Z') }), now).level, 'Delayed');
});

test('explains the fee impact on estimated recipient amount', () => {
  assert.match(getSmartInsight(transfer(), [], now), /fee is deducted/i);
});

test('marks a received transfer complete', () => {
  assert.match(getSmartInsight(transfer({ status: 'Received' }), [], now), /complete/i);
});

test('uses transaction history to identify a slower-than-usual transfer', () => {
  const prior = { status: 'Received', createdAt: new Date('2026-09-30T06:00:00Z'), completedAt: new Date('2026-09-30T08:00:00Z') };
  const current = transfer({ createdAt: new Date('2026-09-30T08:00:00Z') });
  assert.match(getSmartInsight(current, [prior], now), /longer than your usual transfers/i);
});

test('returns normal for a recent in-flight transfer', () => {
  assert.equal(getTransferRisk(transfer(), now).level, 'Normal');
});

test("warns when the transfer is much larger than the user's usual amount", () => {
  const current = transfer({ _id: 'current', amount: 500, usdAmount: 500 });
  const history = [{ _id: 'past-1', amount: 100, usdAmount: 100 }, { _id: 'past-2', amount: 120, usdAmount: 120 }];
  assert.ok(getActionAlerts(current, history, now).some((alert) => /higher than your usual amount/i.test(alert)));
});
