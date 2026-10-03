/** Keep the destination inside the journal and avoid bouncing between authentication pages. */
export function safeNext(value) {
  if (!value?.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/';
  const path = value.split(/[?#]/)[0];
  return path === '/signin' || path === '/signup' ? '/' : value;
}
