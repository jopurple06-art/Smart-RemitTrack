import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import ExchangeRate from '../src/models/ExchangeRate.js';
import Transaction from '../src/models/Transaction.js';
import { decryptAccountNumber } from '../src/utils/accountSecurity.js';

let mongo;
let server;
let baseUrl;

before(async () => {
  process.env.JWT_SECRET = 'integration-test-secret-with-enough-length';
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await ExchangeRate.create([
    { from: 'USD', to: 'INR', rate: 83.12 },
    { from: 'INR', to: 'USD', rate: 1 / 83.12 }
  ]);
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api`;
});

after(async () => {
  if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  if (mongoose.connection.readyState) await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

async function call(path, { token, method = 'GET', body } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  return { status: response.status, data: await response.json() };
}

test('customer can register, send, track, complete, and analyse a transfer', async (context) => {
  const unauthorized = await call('/transactions');
  assert.equal(unauthorized.status, 401);

  const registration = await call('/auth/register', { method: 'POST', body: { name: 'Taylor Reed', email: 'taylor@example.com', password: 'Transfer123!' } });
  assert.equal(registration.status, 201);
  const { token, user } = registration.data;
  assert.equal(user.email, 'taylor@example.com');
  assert.ok(token);

  await context.test('rejects a malformed transfer', async () => {
    const invalid = await call('/transactions', { token, method: 'POST', body: { amount: -4 } });
    assert.equal(invalid.status, 400);
  });

  await context.test('rejects an invalid destination IFSC code', async () => {
    const invalid = await call('/transactions', { token, method: 'POST', body: {
      senderName: 'Taylor Reed', receiverName: 'Priya Sharma', country: 'India',
      recipientBankName: 'Example Bank', recipientAccountNumber: '123456789012', recipientRoutingCode: 'BADCODE',
      fromCurrency: 'USD', toCurrency: 'INR', amount: 120, purpose: 'Family support'
    } });
    assert.equal(invalid.status, 400);
    assert.match(invalid.data.message, /IFSC/i);
  });

  const referencePreview = await call('/transactions/reference', { token });
  assert.match(referencePreview.data.reference, /^SRM-\d{4}-\d{6}$/);

  const created = await call('/transactions', { token, method: 'POST', body: {
    reference: referencePreview.data.reference,
    senderName: 'Taylor Reed', receiverName: 'Priya Sharma', country: 'India',
    recipientBankName: 'Example Bank', recipientAccountNumber: '123456789012', recipientRoutingCode: 'HDFC0001234',
    fromCurrency: 'USD', toCurrency: 'INR', amount: 120, purpose: 'Family support'
  } });
  assert.equal(created.status, 201);
  assert.equal(created.data.transaction.fee, 3);
  assert.equal(created.data.transaction.receiveAmount, 9725.04);
  assert.equal(created.data.transaction.recipientAccountMasked, '**** 9012');
  assert.equal(created.data.transaction.recipientAccountEncrypted, undefined);
  assert.equal(created.data.transaction.recipientAccountNumber, undefined);
  assert.equal(created.data.transaction.reference, referencePreview.data.reference);
  const transferId = created.data.transaction._id;
  const storedAccount = await Transaction.findById(transferId).select('+recipientAccountEncrypted');
  assert.notEqual(storedAccount.recipientAccountEncrypted, '123456789012');
  assert.equal(decryptAccountNumber(storedAccount.recipientAccountEncrypted), '123456789012');

  const details = await call(`/transactions/${transferId}`, { token });
  assert.equal(details.status, 200);
  assert.equal(details.data.transaction.status, 'Initiated');
  assert.equal(details.data.transaction.recipientAccountMasked, '**** 9012');
  assert.equal(details.data.transaction.recipientAccountEncrypted, undefined);
  assert.equal(details.data.risk.level, 'Normal');
  assert.equal(details.data.alerts[0], 'Please check that the receiver bank details are correct.');

  assert.equal((await call('/transactions?search=Priya', { token })).data.transactions[0].recipientAccountLast4, undefined);

  const rupeeToDollar = await call('/transactions', { token, method: 'POST', body: {
    senderName: 'Taylor Reed', receiverName: 'Jordan Lee', country: 'United States',
    recipientBankName: 'Example US Bank', recipientAccountNumber: '9876543210', recipientRoutingCode: '123456789',
    fromCurrency: 'INR', toCurrency: 'USD', amount: 8312, purpose: 'Education'
  } });
  assert.equal(rupeeToDollar.status, 201);
  assert.equal(rupeeToDollar.data.transaction.fromCurrency, 'INR');
  assert.equal(rupeeToDollar.data.transaction.toCurrency, 'USD');
  assert.ok(Math.abs(rupeeToDollar.data.transaction.receiveAmount - 98.75) < 0.02);
  assert.equal(rupeeToDollar.data.transaction.recipientAccountMasked, '**** 3210');

  const history = await call('/transactions?search=Priya&country=India', { token });
  assert.equal(history.data.transactions.length, 1);

  for (const status of ['Verification', 'Processing', 'Sent', 'Received']) {
    const advanced = await call(`/transactions/${transferId}/advance`, { token, method: 'POST' });
    assert.equal(advanced.status, 200);
    assert.equal(advanced.data.transaction.status, status);
  }
  const completed = await call(`/transactions/${transferId}/advance`, { token, method: 'POST' });
  assert.equal(completed.status, 409);

  const notifications = await call('/notifications', { token });
  assert.equal(notifications.data.notifications.length, 6);
  assert.equal(notifications.data.unreadCount, 6);
  assert.equal((await call('/notifications/read-all', { token, method: 'PATCH' })).status, 200);
  assert.equal((await call('/notifications', { token })).data.unreadCount, 0);

  const analytics = await call('/analytics', { token });
  assert.equal(analytics.data.totals.sent, 220);
  assert.equal(analytics.data.totals.fees, 4.25);
  assert.equal(analytics.data.totals.completed, 1);
  assert.equal(analytics.data.totals.averageFee, 2.13);
  assert.equal(analytics.data.totals.mostUsedCountry, 'India');
  assert.equal(analytics.data.totals.thisMonth, 220);
  assert.equal(analytics.data.countries[0].country, 'India');

  const cashPickup = await call('/transactions', { token, method: 'POST', body: {
    senderName: 'Taylor Reed', senderCountry: 'India', receiverName: 'Jordan Lee', country: 'United States',
    fromCurrency: 'USD', toCurrency: 'USD', amount: 25, purpose: 'Family support', transferMethod: 'Cash pickup', note: 'Bring photo ID'
  } });
  assert.equal(cashPickup.status, 201);
  assert.equal(cashPickup.data.transaction.recipientBankName, '');
  assert.equal(cashPickup.data.transaction.recipientAccountMasked, '');
  assert.equal(cashPickup.data.transaction.transferMethod, 'Cash pickup');
  assert.equal(cashPickup.data.transaction.note, 'Bring photo ID');

  const profile = await call('/users/me', { token, method: 'PATCH', body: { phone: '+1 415 555 0100', homeCountry: 'United States' } });
  assert.equal(profile.data.user.phone, '+1 415 555 0100');

  const stranger = await call('/auth/register', { method: 'POST', body: { name: 'Sam Guest', email: 'sam@example.com', password: 'Transfer123!' } });
  const privateDetails = await call(`/transactions/${transferId}`, { token: stranger.data.token });
  assert.equal(privateDetails.status, 404);
});
