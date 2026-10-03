import { Router } from 'express';
import { HttpError } from '../middleware/errors.js';
import { DUMMY_HASH, hashPassword, verifyPassword } from '../auth/password.js';
import { createLoginLimiter } from '../middleware/security.js';
import { toSessionUser } from '../serializers.js';
import { parseId, validateRegistration } from '../validation.js';
import { requireAuth } from '../middleware/auth.js';
import { validateProfilePicture } from '../auth/profilePicture.js';

export const SESSION_COOKIE = 'stackstory.sid';

export function authRouter(db) {
  const router = Router();
  const limiter = createLoginLimiter();
  const findByUsername = db.prepare(
    'SELECT id, username, display_name, password_hash, picture_version FROM users WHERE username = ?',
  );
  const insertUser = db.prepare(
    'INSERT INTO users (username, display_name, password_hash, profile_picture, picture_version) VALUES (?, ?, ?, ?, ?)',
  );
  const savePicture = db.prepare('UPDATE users SET profile_picture = ?, picture_version = ? WHERE id = ?');
  const getPicture = db.prepare('SELECT profile_picture FROM users WHERE id = ?');

  function startSession(req, res, next, row, status = 200) {
    // Registration and sign-in both replace the session id to prevent session fixation.
    req.session.regenerate((regenerateError) => {
      if (regenerateError) return next(regenerateError);
      req.session.userId = row.id;
      req.session.save((saveError) => {
        if (saveError) return next(saveError);
        res.status(status).json({
          user: toSessionUser({ id: row.id, username: row.username, displayName: row.display_name, pictureVersion: row.picture_version }),
        });
      });
    });
  }

  router.get('/me', (req, res) => {
    res.json({ user: toSessionUser(req.user) });
  });

  router.get('/avatars/:userId', (req, res) => {
    const id = parseId(req.params.userId, 'That profile picture could not be found.');
    const row = getPicture.get(id);
    if (!row?.profile_picture) throw new HttpError(404, 'That profile picture could not be found.');
    res.type('image/jpeg').send(row.profile_picture);
  });

  router.patch('/profile-picture', requireAuth, (req, res) => {
    if (!Object.hasOwn(req.body ?? {}, 'profilePicture'))
      throw new HttpError(400, 'Choose a picture or select Remove picture.');
    const { picture, version } = validateProfilePicture(req.body.profilePicture);
    savePicture.run(picture, version, req.user.id);
    res.json({ user: toSessionUser({ ...req.user, pictureVersion: version }) });
  });

  router.post('/register', (req, res, next) => {
    const { displayName, username, password } = validateRegistration(req.body);
    if (findByUsername.get(username)) {
      throw new HttpError(409, 'Please choose another username.', {
        username: 'This username is already taken.',
      });
    }
    const { picture, version } = validateProfilePicture(req.body.profilePicture);
    const { lastInsertRowid } = insertUser.run(username, displayName, hashPassword(password), picture, version);
    const row = { id: Number(lastInsertRowid), username, display_name: displayName, picture_version: version };
    startSession(req, res, next, row, 201);
  });

  router.post('/login', (req, res, next) => {
    limiter.check(req);
    const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    const fields = {};
    if (!username) fields.username = 'Enter a username.';
    if (!password) fields.password = 'Enter a password.';
    else if (password.length > 128) fields.password = 'Keep the password to 128 characters or fewer.';
    if (Object.keys(fields).length) throw new HttpError(400, 'Please fill in both fields.', fields);

    const row = findByUsername.get(username);
    // Verify against a dummy hash for unknown users so response timing does not reveal valid usernames.
    const valid = verifyPassword(password, row?.password_hash ?? DUMMY_HASH) && Boolean(row);
    if (!valid) {
      limiter.fail(req);
      throw new HttpError(401, 'That username and password do not match.');
    }
    limiter.succeed(req);

    startSession(req, res, next, row);
  });

  router.post('/logout', (req, res, next) => {
    req.session.destroy((error) => {
      if (error) return next(error);
      res.clearCookie(SESSION_COOKIE, { path: '/', httpOnly: true, sameSite: 'lax' });
      res.status(204).end();
    });
  });

  return router;
}
