// Creates the database and seeds sample content if it has never been seeded. Safe to run repeatedly.
import { config } from '../src/config.js';
import { openDatabase } from '../src/db/connection.js';
import { ensureDatabase } from '../src/db/init.js';

const db = openDatabase(config.databaseFile);
const { seeded } = ensureDatabase(db);
const counts = db
  .prepare('SELECT (SELECT COUNT(*) FROM posts) AS posts, (SELECT COUNT(*) FROM comments) AS comments')
  .get();
db.close();

console.log(`Database ready at ${config.databaseFile}`);
console.log(
  seeded
    ? `Sample content added: ${counts.posts} notes, ${counts.comments} comments.`
    : `Already initialized; existing content kept (${counts.posts} notes, ${counts.comments} comments).`,
);
