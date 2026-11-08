import 'dotenv/config';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from './app.js';
import { connectDatabase } from './config/database.js';
import mongoose from 'mongoose';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mongo;
let server;
let stopping = false;

async function shutdown(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  if (server) await new Promise((resolve) => server.close(resolve));
  if (mongoose.connection.readyState) await mongoose.disconnect();
  if (mongo) await mongo.stop();
  process.exit(exitCode);
}

try {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri('smart_remittrack_demo');
  process.env.JWT_SECRET ||= 'smart-remittrack-demo-secret-change-this-value';
  await connectDatabase();
  await new Promise((resolve, reject) => {
    const seedPath = path.resolve(__dirname, 'seed.js');
    const seed = spawn(process.execPath, [seedPath], { cwd: __dirname, env: process.env, stdio: 'inherit' });
    seed.once('error', reject);
    seed.once('exit', (code) => code === 0 ? resolve() : reject(new Error(`Demo seed exited with code ${code}.`)));
  });
  const port = Number(process.env.PORT) || 5000;
  server = app.listen(port, '0.0.0.0', () => console.log(`Smart RemitTrack demo API listening on port ${port}; data resets when the demo stops.`));
} catch (error) {
  console.error(`Unable to start demo: ${error.message}`);
  await shutdown(1);
}

process.once('SIGINT', () => shutdown());
process.once('SIGTERM', () => shutdown());
