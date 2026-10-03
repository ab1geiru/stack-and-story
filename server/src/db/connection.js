import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

export function openDatabase(file) {
  if (file !== ':memory:') {
    fs.mkdirSync(path.dirname(file), { recursive: true });
  }
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  // SQLite leaves foreign keys off unless asked, so cascades would silently not run.
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 3000');
  return db;
}
