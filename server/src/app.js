import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import session from 'express-session';
import helmet from 'helmet';
import { SqliteSessionStore } from './auth/sessionStore.js';
import { loadUser } from './middleware/auth.js';
import { apiNotFound, errorHandler } from './middleware/errors.js';
import { sameOriginWrites } from './middleware/security.js';
import { authRouter, SESSION_COOKIE } from './routes/auth.js';
import { postsRouter } from './routes/posts.js';
import { commentsRouter } from './routes/comments.js';

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

export function createApp({ db, sessionSecret, clientDist = null }) {
  const app = express();
  app.disable('x-powered-by');

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
          fontSrc: ["'self'"],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          // The app runs over plain HTTP on localhost, so do not ask browsers to upgrade requests.
          upgradeInsecureRequests: null,
        },
      },
      strictTransportSecurity: false,
    }),
  );

  const store = new SqliteSessionStore(db);
  app.locals.sessionStore = store;

  // Only picture forms need a larger JSON body; ordinary content keeps its existing limit.
  app.use(['/api/auth/register', '/api/auth/profile-picture'], express.json({ limit: '384kb' }));

  app.use(
    '/api',
    express.json({ limit: '64kb' }),
    session({
      name: SESSION_COOKIE,
      secret: sessionSecret,
      store,
      resave: false,
      saveUninitialized: false,
      cookie: { httpOnly: true, sameSite: 'lax', secure: false, maxAge: SEVEN_DAYS },
    }),
    sameOriginWrites,
    loadUser(db),
  );

  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  app.use('/api/auth', authRouter(db));
  app.use('/api/posts', postsRouter(db));
  app.use('/api/comments', commentsRouter(db));
  app.get('/api/health', (req, res) => res.json({ ok: true }));
  app.use('/api', apiNotFound);

  // After `npm run build`, the same server also delivers the React app.
  const indexHtml = clientDist ? path.join(clientDist, 'index.html') : null;
  if (indexHtml && fs.existsSync(indexHtml)) {
    app.use(express.static(clientDist, { index: false, maxAge: '1h' }));
    app.use((req, res, next) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') return next();
      // Resolve relative to the build directory, so parent folders beginning with a dot also work.
      res.sendFile('index.html', { root: clientDist });
    });
  } else {
    app.get('/', (req, res) => {
      res
        .type('text')
        .send(
          'The Stack & Story API is running.\n\nIn development, open the app at http://localhost:5173\nTo serve the app from this port, run "npm run build" and then "npm start".',
        );
    });
  }

  app.use(errorHandler);
  return app;
}
