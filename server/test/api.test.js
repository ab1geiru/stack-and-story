// End-to-end API checks against a temporary database. Run with `npm test` from the project root.
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDatabase } from '../src/db/connection.js';
import { ensureDatabase } from '../src/db/init.js';
import { RETIRED_SAMPLE_POSTS, PREVIOUS_SAMPLE_POSTS, SAMPLE_POSTS } from '../src/db/seedData.js';
import { createApp } from '../src/app.js';

const pictureOne = fs.readFileSync(new URL('./fixtures/avatar-one.jpg', import.meta.url));
const pictureTwo = fs.readFileSync(new URL('./fixtures/avatar-two.jpg', import.meta.url));
const imageUrl = (picture) => `data:image/jpeg;base64,${picture.toString('base64')}`;

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stack-and-story-test-'));
const dbFile = path.join(tempDir, 'test.sqlite');
let db;
let server;
let baseUrl;

function startServer() {
  db = openDatabase(dbFile);
  ensureDatabase(db);
  const app = createApp({ db, sessionSecret: 'test-secret' });
  return new Promise((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve(app);
    });
  });
}

async function stopServer(app) {
  await new Promise((resolve) => server.close(resolve));
  app.locals.sessionStore.close();
  db.close();
}

/** A tiny HTTP client that keeps its own session cookie, like a separate browser. */
function client() {
  let cookie = '';
  return async function request(method, url, body, headers = {}) {
    const response = await fetch(baseUrl + url, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) cookie = setCookie.split(';')[0];
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null };
  };
}

let app;
before(async () => {
  app = await startServer();
});
after(async () => {
  if (server?.listening) await stopServer(app);
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe('Stack & Story API', () => {
  const ana = client();
  const paolo = client();
  const guest = client();
  let newPostId;
  let paoloCommentId;

  test('seed data is present: 4 notes from both demo accounts, with comments', async () => {
    const { status, body } = await guest('GET', '/api/posts');
    assert.equal(status, 200);
    assert.equal(body.posts.length, 4);
    assert.equal(body.stats.posts, 4);
    assert.equal(body.stats.comments, 8);
    const authors = new Set(body.posts.map((p) => p.author.username));
    assert.deepEqual([...authors].sort(), ['ana', 'paolo']);
    assert.deepEqual(body.posts.map((post) => post.title), SAMPLE_POSTS.map((post) => post.title).reverse());
  });

  test('both demo accounts can sign in; a wrong password is rejected', async () => {
    const a = await ana('POST', '/api/auth/login', { username: 'ana', password: 'fieldnotes-ana' });
    assert.equal(a.status, 200);
    assert.equal(a.body.user.displayName, 'Ana Reyes');
    const p = await paolo('POST', '/api/auth/login', { username: 'paolo', password: 'fieldnotes-paolo' });
    assert.equal(p.status, 200);
    assert.equal(p.body.user.displayName, 'Paolo Cruz');

    const bad = await guest('POST', '/api/auth/login', { username: 'ana', password: 'wrong' });
    assert.equal(bad.status, 401);
    assert.equal((await ana('GET', '/api/auth/me')).body.user.username, 'ana');
    assert.equal((await guest('GET', '/api/auth/me')).body.user, null);
  });

  test('creating a post requires sign-in', async () => {
    const res = await guest('POST', '/api/posts', { title: 'Hi', description: 'There' });
    assert.equal(res.status, 401);
  });

  test('blank title and description return field-level errors', async () => {
    const res = await ana('POST', '/api/posts', { title: '   ', description: '' });
    assert.equal(res.status, 400);
    assert.ok(res.body.error.fields.title);
    assert.ok(res.body.error.fields.description);
    const tooLong = await ana('POST', '/api/posts', { title: 'x'.repeat(121), description: 'ok' });
    assert.equal(tooLong.status, 400);
    assert.ok(tooLong.body.error.fields.title);
  });

  test('a signed-in user can publish; ownership comes from the session, not the body', async () => {
    const res = await ana('POST', '/api/posts', {
      title: '  Testing the journal  ',
      description: 'First paragraph.\r\n\r\nSecond paragraph <script>alert(1)</script>',
      userId: 999,
    });
    assert.equal(res.status, 201);
    newPostId = res.body.post.id;
    assert.equal(res.body.post.title, 'Testing the journal');
    assert.equal(res.body.post.author.username, 'ana');
    assert.equal(res.body.post.entryNumber, 5);
    assert.equal(res.body.post.description, 'First paragraph.\n\nSecond paragraph <script>alert(1)</script>');
  });

  test('the new post appears first in the journal and opens on its own page', async () => {
    const list = await guest('GET', '/api/posts');
    assert.equal(list.body.posts[0].id, newPostId);
    assert.equal(list.body.posts[0].commentCount, 0);
    const dates = list.body.posts.map((p) => p.createdAt);
    assert.deepEqual(dates, [...dates].sort().reverse(), 'posts are ordered newest first');

    const single = await guest('GET', `/api/posts/${newPostId}`);
    assert.equal(single.status, 200);
    assert.equal(single.body.post.title, 'Testing the journal');
    assert.deepEqual(single.body.comments, []);
    assert.equal(single.body.viewer.canManagePost, false);
    assert.equal((await ana('GET', `/api/posts/${newPostId}`)).body.viewer.canManagePost, true);
  });

  test('unknown or malformed post ids return 404', async () => {
    assert.equal((await guest('GET', '/api/posts/99999')).status, 404);
    assert.equal((await guest('GET', '/api/posts/abc')).status, 404);
  });

  test('comments must be nonempty and are saved under the correct post', async () => {
    const empty = await paolo('POST', `/api/posts/${newPostId}/comments`, { body: '   ' });
    assert.equal(empty.status, 400);
    assert.ok(empty.body.error.fields.body);

    const guestTry = await guest('POST', `/api/posts/${newPostId}/comments`, { body: 'hello' });
    assert.equal(guestTry.status, 401);

    const res = await paolo('POST', `/api/posts/${newPostId}/comments`, { body: 'Nice test note!' });
    assert.equal(res.status, 201);
    paoloCommentId = res.body.comment.id;
    assert.equal(res.body.comment.postId, newPostId);
    assert.equal(res.body.comment.author.username, 'paolo');

    const single = await guest('GET', `/api/posts/${newPostId}`);
    assert.deepEqual(single.body.comments.map((c) => c.id), [paoloCommentId]);
    const list = await guest('GET', '/api/posts');
    const others = list.body.posts.filter((p) => p.id !== newPostId);
    assert.equal(list.body.posts.find((p) => p.id === newPostId).commentCount, 1);
    assert.equal(others.reduce((sum, p) => sum + p.commentCount, 0), 8, 'other posts unchanged');
  });

  test('a user who owns neither the post nor the comment cannot delete it (direct request)', async () => {
    const list = await guest('GET', '/api/posts');
    const paolosPost = list.body.posts.find((post) => post.author.username === 'paolo' && post.commentCount > 1);
    const detail = await guest('GET', `/api/posts/${paolosPost.id}`);
    const target = detail.body.comments.find((comment) => comment.author.username === 'paolo');
    const forbidden = await ana('DELETE', `/api/comments/${target.id}`);
    assert.equal(forbidden.status, 403);
    const anon = await guest('DELETE', `/api/comments/${paoloCommentId}`);
    assert.equal(anon.status, 401);
    const still = await guest('GET', `/api/posts/${newPostId}`);
    assert.equal(still.body.comments.length, 1);
  });

  test('Paolo cannot delete Ana’s comment on Ana’s seeded post either', async () => {
    const { body } = await guest('GET', '/api/posts');
    const anasPostWithComments = body.posts.find((p) => p.id !== newPostId && p.author.username === 'ana' && p.commentCount > 0);
    const detail = await guest('GET', `/api/posts/${anasPostWithComments.id}`);
    const target = detail.body.comments.find((comment) => comment.author.username === 'ana');
    assert.equal((await paolo('DELETE', `/api/comments/${target.id}`)).status, 403);
  });

  test('cross-site write requests are blocked', async () => {
    const res = await ana(
      'POST',
      `/api/posts/${newPostId}/comments`,
      { body: 'forged' },
      { Origin: 'http://evil.example' },
    );
    assert.equal(res.status, 403);
  });

  test('a comment author can delete their own comment on another user’s post', async () => {
    const res = await paolo('DELETE', `/api/comments/${paoloCommentId}`);
    assert.equal(res.status, 204);
    const single = await guest('GET', `/api/posts/${newPostId}`);
    assert.equal(single.body.comments.length, 0);
    assert.equal((await ana('DELETE', `/api/comments/${paoloCommentId}`)).status, 404);
  });

  test('sign-out ends the session', async () => {
    const out = await paolo('POST', '/api/auth/logout');
    assert.equal(out.status, 204);
    assert.equal((await paolo('GET', '/api/auth/me')).body.user, null);
  });

  test('content and sessions survive a restart, and seeding does not run again', async () => {
    const comment = await ana('POST', `/api/posts/${newPostId}/comments`, { body: 'Persisted comment' });
    assert.equal(comment.status, 201);

    await stopServer(app);
    app = await startServer();

    const list = await guest('GET', '/api/posts');
    assert.equal(list.body.posts.length, 5, 'seed did not duplicate and user post kept');
    assert.equal(list.body.posts[0].id, newPostId);
    const detail = await guest('GET', `/api/posts/${newPostId}`);
    assert.equal(detail.body.comments[0].body, 'Persisted comment');
    assert.equal((await ana('GET', '/api/auth/me')).body.user.username, 'ana', 'session kept');
  });

  test('errors do not leak internals', async () => {
    const res = await fetch(`${baseUrl}/api/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{not json',
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error.message, 'The request body is not valid JSON.');
    assert.equal(body.error.stack, undefined);
  });

  const newcomer = client();
  const registration = {
    displayName: '  Mika  Santos  ', username: 'New_Builder',
    password: 'a simple password', confirmPassword: 'a simple password',
  };
  let registeredPostId;

  test('registration returns field errors and does not insert incomplete accounts', async () => {
    const res = await newcomer('POST', '/api/auth/register', {});
    assert.equal(res.status, 400);
    assert.deepEqual(Object.keys(res.body.error.fields).sort(), ['confirmPassword', 'displayName', 'password', 'username']);
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM users').get().count, 2);

    const invalid = await newcomer('POST', '/api/auth/register', {
      ...registration, username: 'has a space', password: 'short', confirmPassword: 'different',
    });
    assert.equal(invalid.status, 400);
    assert.ok(invalid.body.error.fields.username);
    assert.ok(invalid.body.error.fields.password);
    assert.ok(invalid.body.error.fields.confirmPassword);

    const long = await newcomer('POST', '/api/auth/register', {
      ...registration, displayName: 'x'.repeat(61), password: 'x'.repeat(129), confirmPassword: 'x'.repeat(129),
    });
    assert.equal(long.status, 400);
    assert.ok(long.body.error.fields.displayName);
    assert.ok(long.body.error.fields.password);
  });

  test('existing usernames are rejected regardless of case', async () => {
    const res = await newcomer('POST', '/api/auth/register', { ...registration, username: 'ANA' });
    assert.equal(res.status, 409);
    assert.equal(res.body.error.fields.username, 'This username is already taken.');
    assert.equal((await newcomer('GET', '/api/auth/me')).body.user, null);
  });

  test('registration hashes the password, normalizes identity, and signs in immediately', async () => {
    const res = await newcomer('POST', '/api/auth/register', registration);
    assert.equal(res.status, 201);
    assert.equal(res.body.user.username, 'new_builder');
    assert.equal(res.body.user.displayName, 'Mika Santos');
    assert.equal(res.body.user.initials, 'MS');
    assert.equal(res.body.user.avatarUrl, null, 'registration does not require a picture');
    assert.equal(res.body.user.password, undefined);
    assert.equal(res.body.user.password_hash, undefined);
    const stored = db.prepare('SELECT password_hash FROM users WHERE username = ?').get('new_builder');
    assert.match(stored.password_hash, /^scrypt\$/);
    assert.notEqual(stored.password_hash, registration.password);
    assert.equal((await newcomer('GET', '/api/auth/me')).body.user.username, 'new_builder');
    const duplicate = await client()('POST', '/api/auth/register', registration);
    assert.equal(duplicate.status, 409);
  });

  test('registered post owners can delete other replies, but cannot edit them or moderate other posts', async () => {
    const published = await newcomer('POST', '/api/posts', {
      title: 'My first registered note', description: 'New accounts use the existing publishing flow.', userId: 1,
    });
    assert.equal(published.status, 201);
    registeredPostId = published.body.post.id;
    assert.equal(published.body.post.author.username, 'new_builder');
    const comment = await ana('POST', `/api/posts/${registeredPostId}/comments`, { body: 'Welcome to the journal!' });
    assert.equal(comment.status, 201);
    assert.equal((await newcomer('PATCH', `/api/comments/${comment.body.comment.id}`, { body: 'Change another author' })).status, 403);
    assert.equal((await newcomer('DELETE', `/api/comments/${comment.body.comment.id}`)).status, 204);
    const ownReply = await ana('POST', `/api/posts/${registeredPostId}/comments`, { body: 'My second reply.' });
    assert.equal((await ana('DELETE', `/api/comments/${ownReply.body.comment.id}`)).status, 204);
    const other = await ana('POST', `/api/posts/${newPostId}/comments`, { body: 'Keep this on Ana’s note.' });
    assert.equal((await newcomer('DELETE', `/api/comments/${other.body.comment.id}`)).status, 403);
  });

  test('registered identity and session survive restart; the same password signs in again', async () => {
    await stopServer(app);
    app = await startServer();
    assert.equal((await newcomer('GET', '/api/auth/me')).body.user.username, 'new_builder');
    assert.equal((await newcomer('GET', `/api/posts/${registeredPostId}`)).body.viewer.canManagePost, true);
    await newcomer('POST', '/api/auth/logout');
    assert.equal((await newcomer('GET', '/api/auth/me')).body.user, null);
    assert.equal((await newcomer('POST', '/api/auth/login', { username: 'NEW_BUILDER', password: 'wrong' })).status, 401);
    assert.equal((await newcomer('POST', '/api/auth/login', { username: 'NEW_BUILDER', password: registration.password })).status, 200);
  });

  test('registration rejects cross-site requests without creating an account', async () => {
    const res = await client()('POST', '/api/auth/register', {
      ...registration, username: 'forged_builder',
    }, { Origin: 'https://another.example' });
    assert.equal(res.status, 403);
    assert.equal(db.prepare('SELECT 1 FROM users WHERE username = ?').get('forged_builder'), undefined);
  });

  test('post editing preserves its author, publication date, entry number, and discussion', async () => {
    const before = (await ana('GET', `/api/posts/${newPostId}`)).body;
    const edited = await ana('PATCH', `/api/posts/${newPostId}`, {
      title: '  A revised journal note  ', description: 'Updated first paragraph.\r\n\r\nStill the same discussion.', userId: 2,
    });
    assert.equal(edited.status, 200);
    assert.equal(edited.body.post.title, 'A revised journal note');
    assert.equal(edited.body.post.description, 'Updated first paragraph.\n\nStill the same discussion.');
    assert.deepEqual(edited.body.post.author, before.post.author);
    assert.equal(edited.body.post.createdAt, before.post.createdAt);
    assert.equal(edited.body.post.entryNumber, before.post.entryNumber);
    assert.ok(edited.body.post.updatedAt);
    assert.deepEqual((await ana('GET', `/api/posts/${newPostId}`)).body.comments, before.comments);
  });

  test('editing validates both fields without changing an existing post', async () => {
    const before = (await ana('GET', `/api/posts/${newPostId}`)).body.post;
    for (const fields of [{ title: ' ', description: '' }, { title: 'x'.repeat(121), description: 'x'.repeat(10001) }]) {
      const res = await ana('PATCH', `/api/posts/${newPostId}`, fields);
      assert.equal(res.status, 400);
      assert.ok(res.body.error.fields.title);
      assert.ok(res.body.error.fields.description);
    }
    assert.deepEqual((await ana('GET', `/api/posts/${newPostId}`)).body.post, before);
  });

  test('another user and signed-out visitors cannot edit or delete a post', async () => {
    assert.equal((await paolo('POST', '/api/auth/login', { username: 'paolo', password: 'fieldnotes-paolo' })).status, 200);
    for (const method of ['PATCH', 'DELETE']) {
      const fields = method === 'PATCH' ? { title: 'Forged', description: 'Do not save this.', userId: 1 } : undefined;
      assert.equal((await paolo(method, `/api/posts/${newPostId}`, fields)).status, 403);
      assert.equal((await guest(method, `/api/posts/${newPostId}`, fields)).status, 401);
    }
    assert.equal((await guest('GET', `/api/posts/${newPostId}`)).body.post.title, 'A revised journal note');
  });

  test('post edits and deletes reject missing or malformed IDs', async () => {
    for (const id of ['missing', '999999', '0']) {
      assert.equal((await ana('PATCH', `/api/posts/${id}`, { title: 'Hi', description: 'There' })).status, 404);
      assert.equal((await ana('DELETE', `/api/posts/${id}`)).status, 404);
    }
  });

  test('only the post author can delete it, and its comments are removed together', async () => {
    const post = (await newcomer('POST', '/api/posts', { title: 'A temporary note', description: 'For deletion checks.' })).body.post;
    const comment = (await ana('POST', `/api/posts/${post.id}/comments`, { body: 'A temporary reply.' })).body.comment;
    const before = (await guest('GET', '/api/posts')).body.stats;
    assert.equal((await ana('DELETE', `/api/posts/${post.id}`)).status, 403);
    assert.equal((await newcomer('DELETE', `/api/posts/${post.id}`)).status, 204);
    assert.equal((await guest('GET', `/api/posts/${post.id}`)).status, 404);
    assert.equal(db.prepare('SELECT 1 FROM comments WHERE id = ?').get(comment.id), undefined);
    const after = (await guest('GET', '/api/posts')).body.stats;
    assert.equal(after.posts, before.posts - 1);
    assert.equal(after.comments, before.comments - 1);
    assert.equal((await newcomer('DELETE', `/api/posts/${post.id}`)).status, 404);
  });

  let editableComment;
  test('a comment author can edit on someone else’s note without changing ownership or order', async () => {
    editableComment = (await paolo('POST', `/api/posts/${newPostId}/comments`, { body: 'My original reply.' })).body.comment;
    const edited = await paolo('PATCH', `/api/comments/${editableComment.id}`, { body: '  My updated reply.  ', userId: 1, postId: registeredPostId });
    assert.equal(edited.status, 200);
    assert.equal(edited.body.comment.body, 'My updated reply.');
    assert.deepEqual(edited.body.comment.author, editableComment.author);
    assert.equal(edited.body.comment.postId, newPostId);
    assert.equal(edited.body.comment.createdAt, editableComment.createdAt);
    assert.ok(edited.body.comment.updatedAt);
    const detail = (await guest('GET', `/api/posts/${newPostId}`)).body;
    assert.equal(detail.comments.at(-1).id, editableComment.id);
    assert.equal(detail.post.commentCount, detail.comments.length);
  });

  test('comment editing validates text, and the post owner cannot edit another author’s comment', async () => {
    for (const body of ['  ', 'x'.repeat(2001)]) {
      const res = await paolo('PATCH', `/api/comments/${editableComment.id}`, { body });
      assert.equal(res.status, 400);
      assert.ok(res.body.error.fields.body);
    }
    assert.equal((await ana('PATCH', `/api/comments/${editableComment.id}`, { body: 'Forged edit' })).status, 403);
    assert.equal((await newcomer('PATCH', `/api/comments/${editableComment.id}`, { body: 'Forged edit' })).status, 403);
    assert.equal((await guest('PATCH', `/api/comments/${editableComment.id}`, { body: 'Forged edit' })).status, 401);
    assert.equal((await guest('GET', `/api/posts/${newPostId}`)).body.comments.at(-1).body, 'My updated reply.');
  });

  test('post-author moderation is restricted to deletion on that exact post', async () => {
    const reply = (await paolo('POST', `/api/posts/${newPostId}/comments`, { body: 'A reply for moderation checks.' })).body.comment;
    assert.equal((await newcomer('DELETE', `/api/comments/${reply.id}`, { postId: registeredPostId, userId: 1 })).status, 403);
    assert.equal((await guest('DELETE', `/api/comments/${reply.id}`)).status, 401);
    assert.equal((await ana('PATCH', `/api/comments/${reply.id}`, { body: 'Rewrite someone else', userId: reply.author.id })).status, 403);
    const crossSite = await ana('DELETE', `/api/comments/${reply.id}`, undefined, { Origin: 'https://another-site.example' });
    assert.equal(crossSite.status, 403);
    assert.equal((await guest('GET', `/api/posts/${newPostId}`)).body.comments.find((comment) => comment.id === reply.id).body, reply.body);
    assert.equal((await ana('DELETE', `/api/comments/${reply.id}`)).status, 204);
    const after = (await guest('GET', `/api/posts/${newPostId}`)).body;
    assert.equal(after.comments.some((comment) => comment.id === reply.id), false);
    assert.equal(after.post.commentCount, after.comments.length);
    assert.ok(after.comments.some((comment) => comment.id === editableComment.id), 'other replies are preserved');
  });

  test('comment edits and deletes reject missing and malformed IDs', async () => {
    for (const id of ['missing', '999999', '0']) {
      assert.equal((await ana('PATCH', `/api/comments/${id}`, { body: 'Hi' })).status, 404);
      assert.equal((await ana('DELETE', `/api/comments/${id}`)).status, 404);
    }
  });

  const pictureOwner = client();
  let pictureUser;
  let picturePost;
  let pictureComment;
  test('an optional signup picture is saved and served as an image without exposing database bytes', async () => {
    const registered = await pictureOwner('POST', '/api/auth/register', {
      ...registration, username: 'photo_builder', profilePicture: imageUrl(pictureOne),
    });
    assert.equal(registered.status, 201);
    pictureUser = registered.body.user;
    assert.match(pictureUser.avatarUrl, /^\/api\/auth\/avatars\/\d+\?v=[a-f0-9]{16}$/);
    assert.equal(pictureUser.profile_picture, undefined);
    const image = await fetch(baseUrl + pictureUser.avatarUrl);
    assert.equal(image.status, 200);
    assert.equal(image.headers.get('content-type'), 'image/jpeg');
    assert.equal(image.headers.get('x-content-type-options'), 'nosniff');
    assert.deepEqual(Buffer.from(await image.arrayBuffer()), pictureOne);
    assert.equal((await pictureOwner('GET', '/api/auth/me')).body.user.avatarUrl, pictureUser.avatarUrl);
    picturePost = (await pictureOwner('POST', '/api/posts', { title: 'A profile note', description: 'A note with an avatar.' })).body.post;
    pictureComment = (await pictureOwner('POST', `/api/posts/${newPostId}/comments`, { body: 'A reply with an avatar.' })).body.comment;
    assert.equal(picturePost.author.avatarUrl, pictureUser.avatarUrl);
    assert.equal(pictureComment.author.avatarUrl, pictureUser.avatarUrl);
  });

  test('changing a picture updates only the signed-in account and appears on old content', async () => {
    const anaId = (await ana('GET', '/api/auth/me')).body.user.id;
    const updated = await pictureOwner('PATCH', '/api/auth/profile-picture', { profilePicture: imageUrl(pictureTwo), userId: anaId });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.user.id, pictureUser.id);
    assert.notEqual(updated.body.user.avatarUrl, pictureUser.avatarUrl);
    pictureUser = updated.body.user;
    assert.equal((await ana('GET', '/api/auth/me')).body.user.avatarUrl, null);
    assert.equal((await guest('GET', `/api/posts/${picturePost.id}`)).body.post.author.avatarUrl, pictureUser.avatarUrl);
    assert.equal((await guest('GET', `/api/posts/${newPostId}`)).body.comments.find((c) => c.id === pictureComment.id).author.avatarUrl, pictureUser.avatarUrl);
    const image = await fetch(baseUrl + pictureUser.avatarUrl);
    assert.deepEqual(Buffer.from(await image.arrayBuffer()), pictureTwo);
  });

  test('unreadable, oversized, wrong-format, and oversized-dimension pictures are rejected', async () => {
    const bigDimensions = Buffer.from(pictureOne);
    const frame = bigDimensions.indexOf(Buffer.from([0xff, 0xc0]));
    assert.ok(frame > 0);
    bigDimensions.writeUInt16BE(513, frame + 7);
    for (const profilePicture of [
      'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
      'data:image/jpeg;base64,aGVsbG8=',
      `data:image/jpeg;base64,${'A'.repeat(350000)}`,
      imageUrl(bigDimensions),
      123,
    ]) {
      const res = await pictureOwner('PATCH', '/api/auth/profile-picture', { profilePicture });
      assert.equal(res.status, 400);
      assert.ok(res.body.error.fields.profilePicture);
    }
    assert.equal((await pictureOwner('PATCH', '/api/auth/profile-picture', {})).status, 400);
    assert.equal((await pictureOwner('GET', '/api/auth/me')).body.user.avatarUrl, pictureUser.avatarUrl);
    const invalidSignup = await client()('POST', '/api/auth/register', { ...registration, username: 'bad_picture', profilePicture: 'not an image' });
    assert.equal(invalidSignup.status, 400);
    assert.equal(db.prepare('SELECT 1 FROM users WHERE username = ?').get('bad_picture'), undefined);
  });

  test('picture changes require a session and reject cross-site writes', async () => {
    assert.equal((await guest('PATCH', '/api/auth/profile-picture', { profilePicture: imageUrl(pictureOne) })).status, 401);
    assert.equal((await pictureOwner('PATCH', '/api/auth/profile-picture', { profilePicture: null }, { Origin: 'https://another.example' })).status, 403);
    assert.equal((await pictureOwner('GET', '/api/auth/me')).body.user.avatarUrl, pictureUser.avatarUrl);
  });

  test('edited content and profile pictures survive a database and session restart', async () => {
    await stopServer(app);
    app = await startServer();
    assert.equal((await pictureOwner('GET', '/api/auth/me')).body.user.avatarUrl, pictureUser.avatarUrl);
    assert.equal((await guest('GET', `/api/posts/${newPostId}`)).body.post.title, 'A revised journal note');
    const detail = (await guest('GET', `/api/posts/${newPostId}`)).body;
    assert.equal(detail.comments.find((c) => c.id === editableComment.id).body, 'My updated reply.');
    const image = await fetch(baseUrl + pictureUser.avatarUrl);
    assert.deepEqual(Buffer.from(await image.arrayBuffer()), pictureTwo);
  });

  test('removing and later adding a picture keeps initials and existing content', async () => {
    const removed = await pictureOwner('PATCH', '/api/auth/profile-picture', { profilePicture: null });
    assert.equal(removed.status, 200);
    assert.equal(removed.body.user.avatarUrl, null);
    assert.equal(removed.body.user.initials, 'MS');
    assert.equal((await fetch(baseUrl + pictureUser.avatarUrl)).status, 404);
    assert.equal((await guest('GET', `/api/posts/${picturePost.id}`)).body.post.author.avatarUrl, null);
    const added = await pictureOwner('PATCH', '/api/auth/profile-picture', { profilePicture: imageUrl(pictureOne) });
    assert.equal(added.status, 200);
    assert.equal(added.body.user.avatarUrl, picturePost.author.avatarUrl);
    assert.equal((await fetch(baseUrl + '/api/auth/avatars/999999')).status, 404);
  });
});

describe('Upgrading the existing database schema', () => {
  test('older accounts, hashes, notes, and comments remain intact and repeated upgrades are safe', () => {
    const legacy = openDatabase(':memory:');
    try {
      legacy.exec(fs.readFileSync(new URL('./fixtures/old-schema.sql', import.meta.url), 'utf8'));
      legacy.prepare('INSERT INTO users (id, username, display_name, password_hash) VALUES (10, ?, ?, ?)').run('existing_student', 'Existing Student', 'existing-salted-hash');
      legacy.prepare('INSERT INTO posts (id, user_id, title, description) VALUES (10, 10, ?, ?)').run('An existing note', 'Keep my writing.');
      legacy.prepare('INSERT INTO comments (id, post_id, user_id, body) VALUES (10, 10, 10, ?)').run('Keep my comment.');
      legacy.prepare('INSERT INTO app_meta (key, value) VALUES (?, ?)').run('seeded_at', 'previous-run');
      ensureDatabase(legacy);
      ensureDatabase(legacy);
      const user = legacy.prepare('SELECT * FROM users WHERE id = 10').get();
      assert.equal(user.password_hash, 'existing-salted-hash');
      assert.equal(user.display_name, 'Existing Student');
      assert.equal(user.profile_picture, null);
      assert.equal(user.picture_version, null);
      const post = legacy.prepare('SELECT * FROM posts WHERE id = 10').get();
      assert.equal(post.title, 'An existing note');
      assert.equal(post.description, 'Keep my writing.');
      assert.equal(post.updated_at, null);
      const comment = legacy.prepare('SELECT * FROM comments WHERE id = 10').get();
      assert.equal(comment.body, 'Keep my comment.');
      assert.equal(comment.updated_at, null);
      assert.equal(legacy.prepare('SELECT COUNT(*) AS count FROM posts').get().count, 1);
      assert.equal(legacy.prepare('SELECT COUNT(*) AS count FROM comments').get().count, 1);
    } finally { legacy.close(); }
  });
});

describe('Replacing untouched examples with AWS learning journals', () => {
  function previousDatabase() {
    const legacy = openDatabase(':memory:');
    ensureDatabase(legacy);
    legacy.prepare('DELETE FROM posts').run();
    legacy.prepare('DELETE FROM app_meta WHERE key = ?').run('aws_learning_samples');
    const userId = legacy.prepare('SELECT id FROM users WHERE username = ?');
    const insertPost = legacy.prepare('INSERT INTO posts (user_id, title, description, created_at) VALUES (?, ?, ?, ?)');
    const insertComment = legacy.prepare('INSERT INTO comments (post_id, user_id, body, created_at) VALUES (?, ?, ?, ?)');
    const ids = PREVIOUS_SAMPLE_POSTS.map((post) => {
      const { lastInsertRowid } = insertPost.run(userId.get(post.author).id, post.title, post.description, post.createdAt);
      for (const comment of post.comments) insertComment.run(lastInsertRowid, userId.get(comment.author).id, comment.body, comment.createdAt);
      return Number(lastInsertRowid);
    });
    return { legacy, ids };
  }

  test('untouched examples are replaced without changing IDs, dates, accounts, pictures, or personal content', () => {
    const { legacy, ids } = previousDatabase();
    try {
      legacy.prepare('UPDATE users SET profile_picture = ?, picture_version = ? WHERE username = ?').run(pictureOne, 'existing-picture', 'ana');
      const accounts = legacy.prepare('SELECT * FROM users ORDER BY id').all();
      const personal = legacy.prepare('INSERT INTO posts (user_id, title, description) VALUES (1, ?, ?)').run('My actual AWS learning', 'Keep my own writing.');
      const reply = legacy.prepare('INSERT INTO comments (post_id, user_id, body) VALUES (?, 2, ?)').run(personal.lastInsertRowid, 'Keep my own reply.');
      const personalBefore = legacy.prepare('SELECT * FROM posts WHERE id = ?').get(personal.lastInsertRowid);
      const replyBefore = legacy.prepare('SELECT * FROM comments WHERE id = ?').get(reply.lastInsertRowid);
      const commentsBefore = legacy.prepare('SELECT id, post_id, user_id, created_at, updated_at FROM comments ORDER BY id').all();
      ensureDatabase(legacy);
      for (const [index, id] of ids.entries()) {
        const post = legacy.prepare('SELECT * FROM posts WHERE id = ?').get(id);
        assert.equal(post.title, SAMPLE_POSTS[index].title);
        assert.equal(post.description, SAMPLE_POSTS[index].description);
        assert.equal(post.created_at, PREVIOUS_SAMPLE_POSTS[index].createdAt);
        assert.equal(post.updated_at, null);
        assert.deepEqual(legacy.prepare('SELECT body FROM comments WHERE post_id = ? ORDER BY created_at, id').all(id).map((comment) => comment.body), SAMPLE_POSTS[index].comments.map((comment) => comment.body));
      }
      assert.deepEqual(legacy.prepare('SELECT id, post_id, user_id, created_at, updated_at FROM comments ORDER BY id').all(), commentsBefore);
      assert.deepEqual(legacy.prepare('SELECT * FROM users ORDER BY id').all(), accounts);
      assert.deepEqual(legacy.prepare('SELECT * FROM posts WHERE id = ?').get(personal.lastInsertRowid), personalBefore);
      assert.deepEqual(legacy.prepare('SELECT * FROM comments WHERE id = ?').get(reply.lastInsertRowid), replyBefore);
      legacy.prepare('UPDATE posts SET description = ? WHERE id = ?').run('My later revision.', ids[0]);
      ensureDatabase(legacy);
      assert.equal(legacy.prepare('SELECT description FROM posts WHERE id = ?').get(ids[0]).description, 'My later revision.');
      assert.equal(legacy.prepare('SELECT COUNT(*) AS count FROM posts').get().count, 5);
    } finally { legacy.close(); }
  });

  test('changed notes, edited replies, added replies, and deleted replies are all preserved', () => {
    const { legacy, ids } = previousDatabase();
    try {
      legacy.prepare('UPDATE posts SET description = ? WHERE id = ?').run('My revised example.', ids[0]);
      legacy.prepare('UPDATE comments SET body = ? WHERE post_id = ?').run('My revised reply.', ids[1]);
      legacy.prepare('INSERT INTO comments (post_id, user_id, body) VALUES (?, 1, ?)').run(ids[2], 'My added reply.');
      const lastReply = legacy.prepare('SELECT id FROM comments WHERE post_id = ? ORDER BY id DESC').get(ids[3]);
      legacy.prepare('DELETE FROM comments WHERE id = ?').run(lastReply.id);
      const before = legacy.prepare('SELECT * FROM posts ORDER BY id').all();
      const comments = legacy.prepare('SELECT * FROM comments ORDER BY id').all();
      ensureDatabase(legacy);
      assert.deepEqual(legacy.prepare('SELECT * FROM posts ORDER BY id').all(), before);
      assert.deepEqual(legacy.prepare('SELECT * FROM comments ORDER BY id').all(), comments);
    } finally { legacy.close(); }
  });

  test('edit timestamps protect restored original text, and deleted examples are never recreated', () => {
    const { legacy, ids } = previousDatabase();
    try {
      legacy.prepare('UPDATE posts SET updated_at = ? WHERE id = ?').run('2026-10-03T01:00:00.000Z', ids[0]);
      legacy.prepare('UPDATE comments SET updated_at = ? WHERE post_id = ?').run('2026-10-03T01:00:00.000Z', ids[1]);
      legacy.prepare('DELETE FROM posts WHERE id = ?').run(ids[2]);
      ensureDatabase(legacy);
      assert.equal(legacy.prepare('SELECT title FROM posts WHERE id = ?').get(ids[0]).title, PREVIOUS_SAMPLE_POSTS[0].title);
      assert.equal(legacy.prepare('SELECT title FROM posts WHERE id = ?').get(ids[1]).title, PREVIOUS_SAMPLE_POSTS[1].title);
      assert.equal(legacy.prepare('SELECT 1 FROM posts WHERE id = ?').get(ids[2]), undefined);
      assert.equal(legacy.prepare('SELECT title FROM posts WHERE id = ?').get(ids[3]).title, SAMPLE_POSTS[3].title);
      assert.equal(legacy.prepare('SELECT COUNT(*) AS count FROM posts').get().count, 3);
    } finally { legacy.close(); }
  });
});

describe('Updating the old example set', () => {
  function legacyDatabase() {
    const legacy = openDatabase(':memory:');
    ensureDatabase(legacy);
    legacy.prepare('DELETE FROM app_meta WHERE key = ?').run('four_sample_notes');
    const userId = legacy.prepare('SELECT id FROM users WHERE username = ?');
    const post = legacy.prepare('INSERT INTO posts (user_id, title, description, created_at) VALUES (?, ?, ?, ?)');
    const comment = legacy.prepare('INSERT INTO comments (post_id, user_id, body, created_at) VALUES (?, ?, ?, ?)');
    const retiredIds = RETIRED_SAMPLE_POSTS.map((example) => {
      const { lastInsertRowid } = post.run(userId.get(example.author).id, example.title, example.description, example.createdAt);
      for (const reply of example.comments) comment.run(lastInsertRowid, userId.get(reply.author).id, reply.body, reply.createdAt);
      return Number(lastInsertRowid);
    });
    return { legacy, retiredIds };
  }

  test('a pristine old database becomes four examples and stays stable on restart', () => {
    const { legacy } = legacyDatabase();
    try {
      assert.equal(legacy.prepare('SELECT COUNT(*) AS count FROM posts').get().count, 7);
      ensureDatabase(legacy);
      assert.equal(legacy.prepare('SELECT COUNT(*) AS count FROM posts').get().count, 4);
      assert.equal(legacy.prepare('SELECT COUNT(*) AS count FROM comments').get().count, 8);
      ensureDatabase(legacy);
      assert.equal(legacy.prepare('SELECT COUNT(*) AS count FROM posts').get().count, 4);
    } finally { legacy.close(); }
  });

  test('personal notes, modified examples, and examples with new comments are preserved', () => {
    const { legacy, retiredIds } = legacyDatabase();
    try {
      const personal = legacy.prepare('INSERT INTO posts (user_id, title, description) VALUES (1, ?, ?)').run('My actual project', 'Keep this.');
      legacy.prepare('UPDATE posts SET description = ? WHERE id = ?').run('My revised example.', retiredIds[0]);
      legacy.prepare('INSERT INTO comments (post_id, user_id, body) VALUES (?, 1, ?)').run(retiredIds[1], 'My new comment.');
      ensureDatabase(legacy);
      assert.equal(legacy.prepare('SELECT COUNT(*) AS count FROM posts').get().count, 7);
      assert.ok(legacy.prepare('SELECT 1 FROM posts WHERE id = ?').get(personal.lastInsertRowid));
      assert.ok(legacy.prepare('SELECT 1 FROM posts WHERE id = ?').get(retiredIds[0]));
      assert.ok(legacy.prepare('SELECT 1 FROM posts WHERE id = ?').get(retiredIds[1]));
      assert.equal(legacy.prepare('SELECT 1 FROM posts WHERE id = ?').get(retiredIds[2]), undefined);
      assert.equal(legacy.prepare('SELECT body FROM comments WHERE body = ?').get('My new comment.').body, 'My new comment.');
    } finally { legacy.close(); }
  });
});
