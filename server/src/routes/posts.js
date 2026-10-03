import { Router } from 'express';
import { HttpError } from '../middleware/errors.js';
import { requireAuth } from '../middleware/auth.js';
import { parseId, validateComment, validatePost } from '../validation.js';
import { toComment, toPost } from '../serializers.js';

// Entry numbers follow publication order, like numbered pages in a notebook.
const POST_COLUMNS = `
  p.id, p.title, p.description, p.created_at, p.updated_at,
  u.id AS author_id, u.username AS author_username, u.display_name AS author_name,
  u.picture_version AS author_picture_version,
  (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comment_count,
  (SELECT COUNT(*) FROM posts p2
     WHERE p2.created_at < p.created_at OR (p2.created_at = p.created_at AND p2.id <= p.id)) AS entry_number
`;

const COMMENT_COLUMNS = `
  c.id, c.post_id, c.body, c.created_at, c.updated_at,
  u.id AS author_id, u.username AS author_username, u.display_name AS author_name,
  u.picture_version AS author_picture_version
`;

export function postsRouter(db) {
  const router = Router();

  const listPosts = db.prepare(
    `SELECT ${POST_COLUMNS} FROM posts p JOIN users u ON u.id = p.user_id
     ORDER BY p.created_at DESC, p.id DESC`,
  );
  const getPost = db.prepare(
    `SELECT ${POST_COLUMNS}, p.user_id AS owner_id FROM posts p JOIN users u ON u.id = p.user_id WHERE p.id = ?`,
  );
  const listComments = db.prepare(
    `SELECT ${COMMENT_COLUMNS} FROM comments c JOIN users u ON u.id = c.user_id
     WHERE c.post_id = ? ORDER BY c.created_at ASC, c.id ASC`,
  );
  const getComment = db.prepare(
    `SELECT ${COMMENT_COLUMNS} FROM comments c JOIN users u ON u.id = c.user_id WHERE c.id = ?`,
  );
  const stats = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM posts) AS posts,
      (SELECT COUNT(*) FROM comments) AS comments,
      (SELECT COUNT(*) FROM (SELECT user_id FROM posts UNION SELECT user_id FROM comments)) AS contributors
  `);
  const insertPost = db.prepare('INSERT INTO posts (user_id, title, description) VALUES (?, ?, ?)');
  const insertComment = db.prepare('INSERT INTO comments (post_id, user_id, body) VALUES (?, ?, ?)');
  const postExists = db.prepare('SELECT 1 FROM posts WHERE id = ?');
  const updatePost = db.prepare("UPDATE posts SET title = ?, description = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?");
  const deletePost = db.prepare('DELETE FROM posts WHERE id = ?');

  function ownedPost(req) {
    const id = parseId(req.params.postId, 'That note could not be found.');
    const row = getPost.get(id);
    if (!row) throw new HttpError(404, 'That note could not be found.');
    if (row.owner_id !== req.user.id) throw new HttpError(403, 'Only the author of this note can edit or delete it.');
    return id;
  }

  router.get('/', (req, res) => {
    res.json({ posts: listPosts.all().map(toPost), stats: stats.get() });
  });

  router.post('/', requireAuth, (req, res) => {
    const { title, description } = validatePost(req.body);
    // Ownership comes from the session, never from the request body.
    const { lastInsertRowid } = insertPost.run(req.user.id, title, description);
    res.status(201).json({ post: toPost(getPost.get(lastInsertRowid)) });
  });

  router.get('/:postId', (req, res) => {
    const postId = parseId(req.params.postId, 'That note could not be found.');
    const row = getPost.get(postId);
    if (!row) throw new HttpError(404, 'That note could not be found.');
    res.json({
      post: toPost(row),
      comments: listComments.all(postId).map(toComment),
      viewer: { canManagePost: Boolean(req.user && req.user.id === row.owner_id) },
    });
  });

  router.patch('/:postId', requireAuth, (req, res) => {
    const id = ownedPost(req);
    const { title, description } = validatePost(req.body);
    updatePost.run(title, description, id);
    res.json({ post: toPost(getPost.get(id)) });
  });

  router.delete('/:postId', requireAuth, (req, res) => {
    deletePost.run(ownedPost(req));
    res.status(204).end();
  });

  router.post('/:postId/comments', requireAuth, (req, res) => {
    const postId = parseId(req.params.postId, 'That note could not be found.');
    if (!postExists.get(postId)) throw new HttpError(404, 'That note could not be found.');
    const { body } = validateComment(req.body);
    const { lastInsertRowid } = insertComment.run(postId, req.user.id, body);
    res.status(201).json({ comment: toComment(getComment.get(lastInsertRowid)) });
  });

  return router;
}
