import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import analyticsRouter from './routes/analytics.js';
import authRouter from './routes/auth.js';
import notificationsRouter from './routes/notifications.js';
import transactionsRouter from './routes/transactions.js';
import usersRouter from './routes/users.js';
import { handleError, notFound } from './middleware/errors.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDistPath = path.resolve(__dirname, '../../client/dist');

const app = express();
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: false,
  crossOriginOpenerPolicy: false
}));
app.use(express.json({ limit: '20kb' }));
app.use(express.static(clientDistPath, {
  setHeaders: (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));

app.get('/api/health', (_request, response) => response.json({ status: 'ok', service: 'Smart RemitTrack API' }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 100, standardHeaders: true, legacyHeaders: false }), authRouter);
app.use('/api/users', usersRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/analytics', analyticsRouter);

app.get('*', (request, response, next) => {
  if (request.path.startsWith('/api/')) return next();
  response.sendFile(path.join(clientDistPath, 'index.html'));
});

app.use(notFound);
app.use(handleError);

export default app;
