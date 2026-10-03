import { HttpError } from './errors.js';

/** Loads the signed-in user from the session. Identity always comes from the server-side session. */
export function loadUser(db) {
  const findUser = db.prepare('SELECT id, username, display_name, picture_version FROM users WHERE id = ?');
  return (req, res, next) => {
    req.user = null;
    const userId = req.session?.userId;
    if (userId) {
      const row = findUser.get(userId);
      if (row) {
        req.user = { id: row.id, username: row.username, displayName: row.display_name, pictureVersion: row.picture_version };
      }
    }
    next();
  };
}

export function requireAuth(req, res, next) {
  if (!req.user) {
    return next(new HttpError(401, 'Sign in to continue.'));
  }
  return next();
}
