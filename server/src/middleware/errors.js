export class HttpError extends Error {
  constructor(status, message, fields) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

export function apiNotFound(req, res) {
  res.status(404).json({ error: { message: 'That API route does not exist.' } });
}

// Errors are reported in a consistent shape and never include stack traces or SQL details.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    const body = { message: err.message };
    if (err.fields) body.fields = err.fields;
    return res.status(err.status).json({ error: body });
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { message: 'The request body is not valid JSON.' } });
  }
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: { message: 'That request is too large to save.' } });
  }
  console.error('[stack-and-story] Unexpected error:', err);
  return res
    .status(500)
    .json({ error: { message: 'Something went wrong on the server. Please try again.' } });
}
