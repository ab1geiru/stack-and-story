import crypto from 'node:crypto';
import { SCHEMA_SQL } from './schema.js';
import { DEMO_ACCOUNTS, SAMPLE_POSTS, PREVIOUS_SAMPLE_POSTS, RETIRED_SAMPLE_POSTS } from './seedData.js';
import { hashPassword } from '../auth/password.js';

const SEED_MARKER = 'seeded_at';
const SAMPLE_REVISION_MARKER = 'four_sample_notes';
const AWS_SAMPLE_MARKER = 'aws_learning_samples';

export function getMeta(db, key) {
  return db.prepare('SELECT value FROM app_meta WHERE key = ?').get(key)?.value ?? null;
}

function setMeta(db, key, value) {
  db.prepare(
    'INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
  ).run(key, value);
}

/** Trim old examples once, but keep any note or discussion that someone has changed. */
function trimRetiredSamples(db) {
  if (getMeta(db, SAMPLE_REVISION_MARKER)) return;
  const findPosts = db.prepare(`
    SELECT p.id FROM posts p JOIN users u ON u.id = p.user_id
    WHERE u.username = ? AND p.title = ? AND p.description = ? AND p.created_at = ? AND p.updated_at IS NULL
  `);
  const findComments = db.prepare(`
    SELECT c.body, c.created_at, c.updated_at, u.username FROM comments c JOIN users u ON u.id = c.user_id
    WHERE c.post_id = ? ORDER BY c.created_at, c.id
  `);
  const removePost = db.prepare('DELETE FROM posts WHERE id = ?');

  db.transaction(() => {
    for (const example of RETIRED_SAMPLE_POSTS) {
      for (const post of findPosts.all(example.author, example.title, example.description, example.createdAt)) {
        const comments = findComments.all(post.id);
        const unchanged = comments.length === example.comments.length && comments.every((comment, index) => {
          const original = example.comments[index];
          return comment.updated_at === null && comment.body === original.body && comment.created_at === original.createdAt && comment.username === original.author;
        });
        if (unchanged) removePost.run(post.id);
      }
    }
    setMeta(db, SAMPLE_REVISION_MARKER, new Date().toISOString());
  })();
}

/** Replace untouched examples once, keeping their IDs and all personal or edited content. */
function refreshAwsSamples(db) {
  if (getMeta(db, AWS_SAMPLE_MARKER)) return;
  const findPosts = db.prepare(`
    SELECT p.id FROM posts p JOIN users u ON u.id = p.user_id
    WHERE u.username = ? AND p.title = ? AND p.description = ? AND p.created_at = ?
      AND p.updated_at IS NULL
  `);
  const findComments = db.prepare(`
    SELECT c.id, c.body, c.created_at, c.updated_at, u.username
    FROM comments c JOIN users u ON u.id = c.user_id
    WHERE c.post_id = ? ORDER BY c.created_at, c.id
  `);
  const updatePost = db.prepare('UPDATE posts SET title = ?, description = ? WHERE id = ?');
  const updateComment = db.prepare('UPDATE comments SET body = ? WHERE id = ?');

  db.transaction(() => {
    for (const original of PREVIOUS_SAMPLE_POSTS) {
      const replacement = SAMPLE_POSTS.find((post) => post.author === original.author && post.createdAt === original.createdAt);
      for (const post of findPosts.all(original.author, original.title, original.description, original.createdAt)) {
        const comments = findComments.all(post.id);
        const unchanged = comments.length === original.comments.length && comments.every((comment, index) => {
          const before = original.comments[index];
          return comment.updated_at === null && comment.body === before.body
            && comment.created_at === before.createdAt && comment.username === before.author;
        });
        if (!unchanged) continue;
        updatePost.run(replacement.title, replacement.description, post.id);
        comments.forEach((comment, index) => updateComment.run(replacement.comments[index].body, comment.id));
      }
    }
    setMeta(db, AWS_SAMPLE_MARKER, new Date().toISOString());
  })();
}

/**
 * Creates any missing tables and seeds demo content exactly once.
 * The seed marker in app_meta means ordinary restarts never touch user-created posts or comments.
 */
export function ensureDatabase(db) {
  db.exec(SCHEMA_SQL);

  // Upgrade older copies in place, keeping their users and content.
  for (const [table, columns] of Object.entries({
    users: { profile_picture: 'BLOB', picture_version: 'TEXT' },
    posts: { updated_at: 'TEXT' },
    comments: { updated_at: 'TEXT' },
  })) {
    const existing = new Set(db.pragma(`table_info(${table})`).map((column) => column.name));
    for (const [column, type] of Object.entries(columns)) {
      if (!existing.has(column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
    }
  }

  // Demo accounts are always made available, but existing rows are never modified.
  const insertUser = db.prepare(
    'INSERT OR IGNORE INTO users (username, display_name, password_hash) VALUES (?, ?, ?)',
  );
  const userExists = db.prepare('SELECT 1 FROM users WHERE username = ?');
  for (const account of DEMO_ACCOUNTS) {
    if (!userExists.get(account.username)) {
      insertUser.run(account.username, account.displayName, hashPassword(account.password));
    }
  }

  if (getMeta(db, SEED_MARKER)) {
    trimRetiredSamples(db);
    refreshAwsSamples(db);
    return { seeded: false };
  }

  const userId = db.prepare('SELECT id FROM users WHERE username = ?');
  const insertPost = db.prepare(
    'INSERT INTO posts (user_id, title, description, created_at) VALUES (?, ?, ?, ?)',
  );
  const insertComment = db.prepare(
    'INSERT INTO comments (post_id, user_id, body, created_at) VALUES (?, ?, ?, ?)',
  );

  const seed = db.transaction(() => {
    for (const post of SAMPLE_POSTS) {
      const { lastInsertRowid: postId } = insertPost.run(
        userId.get(post.author).id,
        post.title,
        post.description,
        post.createdAt,
      );
      for (const comment of post.comments) {
        insertComment.run(postId, userId.get(comment.author).id, comment.body, comment.createdAt);
      }
    }
    setMeta(db, SEED_MARKER, new Date().toISOString());
    setMeta(db, SAMPLE_REVISION_MARKER, new Date().toISOString());
    setMeta(db, AWS_SAMPLE_MARKER, new Date().toISOString());
  });
  seed();
  return { seeded: true };
}

/** Returns SESSION_SECRET from the environment, or a random secret persisted on first run. */
export function resolveSessionSecret(db, fromEnv) {
  if (fromEnv) return fromEnv;
  let secret = getMeta(db, 'session_secret');
  if (!secret) {
    secret = crypto.randomBytes(32).toString('hex');
    setMeta(db, 'session_secret', secret);
  }
  return secret;
}
