import { Router } from 'express';
import { HttpError } from '../middleware/errors.js';
import { requireAuth } from '../middleware/auth.js';
import { parseId, validateComment } from '../validation.js';
import { toComment } from '../serializers.js';

export function commentsRouter(db) {
  const router = Router();
  const findComment = db.prepare(
    `SELECT c.id, c.post_id, c.user_id, c.body, c.created_at, c.updated_at,
      u.id AS author_id, u.username AS author_username, u.display_name AS author_name,
      u.picture_version AS author_picture_version, p.user_id AS post_owner_id
     FROM comments c JOIN users u ON u.id = c.user_id
     JOIN posts p ON p.id = c.post_id WHERE c.id = ?`,
  );
  const deleteComment = db.prepare('DELETE FROM comments WHERE id = ?');
  const updateComment = db.prepare("UPDATE comments SET body = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?");

  function permittedComment(req, action) {
    const commentId = parseId(req.params.commentId, 'That comment could not be found.');
    const row = findComment.get(commentId);
    if (!row) throw new HttpError(404, 'That comment could not be found. It may already be removed.');
    const isCommentAuthor = row.user_id === req.user.id;
    const mayModerate = action === 'delete' && row.post_owner_id === req.user.id;
    if (!isCommentAuthor && !mayModerate) {
      throw new HttpError(403, action === 'edit'
        ? 'Only the author of this comment can edit it.'
        : 'Only the comment author or the note author can delete this comment.');
    }
    return commentId;
  }

  router.patch('/:commentId', requireAuth, (req, res) => {
    const id = permittedComment(req, 'edit');
    const { body } = validateComment(req.body);
    updateComment.run(body, id);
    res.json({ comment: toComment(findComment.get(id)) });
  });

  router.delete('/:commentId', requireAuth, (req, res) => {
    deleteComment.run(permittedComment(req, 'delete'));
    res.status(204).end();
  });

  return router;
}
