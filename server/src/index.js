import { config } from './config.js';
import { openDatabase } from './db/connection.js';
import { ensureDatabase, resolveSessionSecret } from './db/init.js';
import { createApp } from './app.js';

const db = openDatabase(config.databaseFile);
const { seeded } = ensureDatabase(db);
const app = createApp({
  db,
  sessionSecret: resolveSessionSecret(db, config.sessionSecret),
  clientDist: config.clientDist,
});

const server = app.listen(config.port, () => {
  console.log(`Stack & Story API listening on http://localhost:${config.port}`);
  console.log(`Database: ${config.databaseFile}${seeded ? ' (sample notes added)' : ''}`);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${config.port} is already in use. Stop the other process or set PORT in server/.env.`);
  } else {
    console.error('Server failed to start:', error.message);
  }
  process.exit(1);
});

function shutdown() {
  server.close(() => {
    app.locals.sessionStore?.close();
    db.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 2000).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
