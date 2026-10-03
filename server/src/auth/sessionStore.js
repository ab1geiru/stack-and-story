import session from 'express-session';

const ONE_DAY = 24 * 60 * 60 * 1000;

/** A small express-session store backed by the app's SQLite database, so sign-ins survive restarts. */
export class SqliteSessionStore extends session.Store {
  constructor(db) {
    super();
    this.getStmt = db.prepare('SELECT data FROM sessions WHERE sid = ? AND expires > ?');
    this.setStmt = db.prepare(
      `INSERT INTO sessions (sid, data, expires) VALUES (?, ?, ?)
       ON CONFLICT(sid) DO UPDATE SET data = excluded.data, expires = excluded.expires`,
    );
    this.touchStmt = db.prepare('UPDATE sessions SET expires = ? WHERE sid = ?');
    this.destroyStmt = db.prepare('DELETE FROM sessions WHERE sid = ?');
    this.pruneStmt = db.prepare('DELETE FROM sessions WHERE expires <= ?');
    this.prune();
    this.pruneTimer = setInterval(() => this.prune(), ONE_DAY);
    this.pruneTimer.unref();
  }

  expiryFor(sess) {
    const cookieExpiry = sess?.cookie?.expires ? new Date(sess.cookie.expires).getTime() : NaN;
    return Number.isFinite(cookieExpiry) ? cookieExpiry : Date.now() + ONE_DAY;
  }

  get(sid, callback) {
    try {
      const row = this.getStmt.get(sid, Date.now());
      callback(null, row ? JSON.parse(row.data) : null);
    } catch (error) {
      callback(error);
    }
  }

  set(sid, sess, callback = () => {}) {
    try {
      this.setStmt.run(sid, JSON.stringify(sess), this.expiryFor(sess));
      callback(null);
    } catch (error) {
      callback(error);
    }
  }

  touch(sid, sess, callback = () => {}) {
    try {
      this.touchStmt.run(this.expiryFor(sess), sid);
      callback(null);
    } catch (error) {
      callback(error);
    }
  }

  destroy(sid, callback = () => {}) {
    try {
      this.destroyStmt.run(sid);
      callback(null);
    } catch (error) {
      callback(error);
    }
  }

  prune() {
    this.pruneStmt.run(Date.now());
  }

  close() {
    clearInterval(this.pruneTimer);
  }
}
