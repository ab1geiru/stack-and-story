import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const SERVER_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const PROJECT_ROOT = path.resolve(SERVER_ROOT, '..');

// An .env file is optional. Every setting below has a working local default.
const envFile = path.join(SERVER_ROOT, '.env');
if (fs.existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

function resolveFromServer(value) {
  return path.isAbsolute(value) ? value : path.resolve(SERVER_ROOT, value);
}

export const config = {
  port: Number.parseInt(process.env.PORT ?? '4000', 10),
  isProduction: process.env.NODE_ENV === 'production',
  databaseFile: resolveFromServer(process.env.DATABASE_FILE ?? './data/stack-and-story.sqlite'),
  // When SESSION_SECRET is empty, a random secret is generated once and stored in the database.
  sessionSecret: process.env.SESSION_SECRET?.trim() || null,
  clientDist: path.join(PROJECT_ROOT, 'client', 'dist'),
};
