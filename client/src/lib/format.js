const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const longDateFormat = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
const timeFormat = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });

export function formatDate(iso) {
  return dateFormat.format(new Date(iso));
}

export function formatLongDate(iso) {
  return longDateFormat.format(new Date(iso));
}

export function formatDateTime(iso) {
  const date = new Date(iso);
  return `${dateFormat.format(date)} at ${timeFormat.format(date)}`;
}

export function plural(count, one, many = `${one}s`) {
  return `${count} ${count === 1 ? one : many}`;
}

export function entryLabel(number) {
  return `No. ${String(number).padStart(2, '0')}`;
}

/** Shortens text to roughly `max` characters, ending on a whole word. */
export function excerpt(text, max = 180) {
  const flat = String(text).replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:!?-]+$/, '')}…`;
}

/** Splits on blank lines so the reader sees the author's paragraphs. */
export function paragraphs(text) {
  return String(text)
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function initials(name) {
  const parts = String(name ?? '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2)).toUpperCase();
}
