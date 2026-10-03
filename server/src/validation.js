import { HttpError } from './middleware/errors.js';

export const LIMITS = {
  displayNameMax: 60,
  usernameMin: 3,
  usernameMax: 24,
  passwordMin: 8,
  passwordMax: 128,
  titleMax: 120,
  descriptionMax: 10000,
  commentMax: 2000,
};

function normalizeText(value) {
  return typeof value === 'string' ? value.replace(/\r\n?/g, '\n').trim() : '';
}

function fail(fields) {
  throw new HttpError(400, 'Please fix the highlighted fields.', fields);
}

export function validateRegistration(body = {}) {
  const displayName = normalizeText(body.displayName).replace(/\s+/g, ' ');
  const username = normalizeText(body.username).toLowerCase();
  // Preserve spaces in passwords; never silently change someone's credentials.
  const password = typeof body.password === 'string' ? body.password : '';
  const fields = {};

  if (displayName.length < 2 || displayName.length > LIMITS.displayNameMax)
    fields.displayName = `Use a name between 2 and ${LIMITS.displayNameMax} characters.`;
  if (!/^[a-z0-9_]{3,24}$/.test(username))
    fields.username = 'Use 3–24 letters, numbers, or underscores.';
  if (!password.trim() || password.length < LIMITS.passwordMin || password.length > LIMITS.passwordMax)
    fields.password = `Use a password between ${LIMITS.passwordMin} and ${LIMITS.passwordMax} characters.`;
  if (body.confirmPassword !== password || !password)
    fields.confirmPassword = 'The passwords must match.';

  if (Object.keys(fields).length) fail(fields);
  return { displayName, username, password };
}

export function validatePost(body = {}) {
  // Titles are a single line: collapse any line breaks or runs of spaces.
  const title = normalizeText(body.title).replace(/\s+/g, ' ');
  const description = normalizeText(body.description);
  const fields = {};

  if (!title) fields.title = 'Give your note a title.';
  else if (title.length > LIMITS.titleMax)
    fields.title = `Keep the title to ${LIMITS.titleMax} characters or fewer (currently ${title.length}).`;

  if (!description) fields.description = 'Add a description so other builders can follow along.';
  else if (description.length > LIMITS.descriptionMax)
    fields.description = `Keep the description to ${LIMITS.descriptionMax.toLocaleString('en-US')} characters or fewer.`;

  if (Object.keys(fields).length) fail(fields);
  return { title, description };
}

export function validateComment(body = {}) {
  const text = normalizeText(body.body);
  if (!text) fail({ body: 'Write something before posting your comment.' });
  if (text.length > LIMITS.commentMax)
    fail({ body: `Keep comments to ${LIMITS.commentMax.toLocaleString('en-US')} characters or fewer.` });
  return { body: text };
}

/** Route ids must be positive integers; anything else is treated as "not found". */
export function parseId(raw, notFoundMessage) {
  if (!/^\d{1,12}$/.test(String(raw))) throw new HttpError(404, notFoundMessage);
  const id = Number(raw);
  if (!Number.isSafeInteger(id) || id < 1) throw new HttpError(404, notFoundMessage);
  return id;
}
