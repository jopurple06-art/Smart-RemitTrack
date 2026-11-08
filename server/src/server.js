import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import app from './app.js';
import { connectDatabase } from './config/database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT) || 5000;

process.env.JWT_SECRET ||= 'smart-remittrack-production-secret-key-must-be-at-least-32-chars-long';

try {
  if (!process.env.MONGODB_URI) {
    console.log('No MONGODB_URI provided. Starting in-memory database and seeding demo data...');
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const mongo = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongo.getUri('smart_remittrack_demo');
    await connectDatabase();
    await new Promise((resolve, reject) => {
      const seedPath = path.resolve(__dirname, 'seed.js');
      const seed = spawn(process.execPath, [seedPath], { cwd: __dirname, env: process.env, stdio: 'inherit' });
      seed.once('error', reject);
      seed.once('exit', (code) => (code === 0 ? resolve() : reject(new Error(`Demo seed exited with code ${code}.`))));
    });
  } else {
    await connectDatabase();
  }

  app.listen(port, '0.0.0.0', () => console.log(`Smart RemitTrack API listening on port ${port}`));
} catch (error) {
  console.error(`Unable to start API: ${error.message}`);
  process.exit(1);
}
