// Rebuilds the local database with fresh sample content.
// Tables are dropped and recreated inside the same file, so this also works on Windows
// (no locked-file errors). Restart the server afterwards so everyone signs in again cleanly.
import { config } from '../src/config.js';
import { openDatabase } from '../src/db/connection.js';
import { ensureDatabase } from '../src/db/init.js';

const db = openDatabase(config.databaseFile);
db.pragma('foreign_keys = OFF');
db.transaction(() => {
  for (const table of ['comments', 'posts', 'sessions', 'users', 'app_meta']) {
    db.exec(`DROP TABLE IF EXISTS ${table}`);
  }
})();
db.pragma('foreign_keys = ON');
ensureDatabase(db);
db.exec('VACUUM');

const counts = db
  .prepare('SELECT (SELECT COUNT(*) FROM posts) AS posts, (SELECT COUNT(*) FROM comments) AS comments')
  .get();
db.close();
console.log(`Database reset at ${config.databaseFile}`);
console.log(`Fresh sample content: ${counts.posts} notes, ${counts.comments} comments. All other content was removed.`);
console.log('If the server is running, restart it so existing sign-ins are cleared.');
