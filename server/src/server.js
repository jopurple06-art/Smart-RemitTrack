import 'dotenv/config';
import app from './app.js';
import { connectDatabase } from './config/database.js';

const port = Number(process.env.PORT) || 5000;

try {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('Set JWT_SECRET to a random value of at least 32 characters.');
  await connectDatabase();
  app.listen(port, '0.0.0.0', () => console.log(`Smart RemitTrack API listening on port ${port}`));
} catch (error) {
  console.error(`Unable to start API: ${error.message}`);
  process.exit(1);
}
