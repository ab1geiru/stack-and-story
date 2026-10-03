import crypto from 'node:crypto';

// scrypt is built into Node and memory-hard, so no native hashing package is needed.
const KEY_LENGTH = 64;
const PARAMS = { N: 16384, r: 8, p: 1 };

export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, KEY_LENGTH, PARAMS);
  return `scrypt$${PARAMS.N}$${PARAMS.r}$${PARAMS.p}$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export function verifyPassword(password, stored) {
  const parts = String(stored).split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, N, r, p, saltB64, hashB64] = parts;
  const expected = Buffer.from(hashB64, 'base64');
  const actual = crypto.scryptSync(password, Buffer.from(saltB64, 'base64'), expected.length, {
    N: Number(N),
    r: Number(r),
    p: Number(p),
  });
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

// Used when a username does not exist, so a failed sign-in takes the same time either way.
export const DUMMY_HASH = hashPassword(crypto.randomBytes(12).toString('hex'));
