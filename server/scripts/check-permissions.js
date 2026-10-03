// Direct backend check, run while the app is running:
// Signs in as Paolo and selects a reply where he owns neither the note nor the comment.
// The server must refuse (403) and the comment must still exist. Nothing is changed.
const base = (process.argv[2] ?? process.env.API_URL ?? 'http://localhost:4000').replace(/\/$/, '');

async function call(method, path, { body, cookie } = {}) {
  const response = await fetch(base + path, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  return { status: response.status, cookie: response.headers.get('set-cookie')?.split(';')[0], data: text ? JSON.parse(text) : null };
}

try {
  const login = await call('POST', '/api/auth/login', { body: { username: 'paolo', password: 'fieldnotes-paolo' } });
  if (login.status !== 200) throw new Error(`Could not sign in as paolo (HTTP ${login.status}).`);
  console.log('Signed in as Paolo Cruz through the API.');

  const { data } = await call('GET', '/api/posts');
  let target = null;
  for (const post of data.posts.filter((p) => p.author.username === 'ana' && p.commentCount > 0)) {
    const detail = await call('GET', `/api/posts/${post.id}`);
    const otherComment = detail.data.comments.find((comment) => comment.author.username !== 'paolo');
    if (otherComment) {
      target = { post, comment: otherComment };
      break;
    }
  }
  if (!target) throw new Error('No comments by other users on Ana’s notes are available for this check. Use a fresh demonstration copy.');

  console.log(`Target: comment #${target.comment.id} by ${target.comment.author.displayName} on Ana's note "${target.post.title}".`);
  const attempt = await call('DELETE', `/api/comments/${target.comment.id}`, { cookie: login.cookie });
  console.log(`DELETE /api/comments/${target.comment.id} as Paolo -> HTTP ${attempt.status} ${attempt.data?.error?.message ?? ''}`);

  const after = await call('GET', `/api/posts/${target.post.id}`);
  const stillThere = after.data.comments.some((c) => c.id === target.comment.id);

  if (attempt.status === 403 && stillThere) {
    console.log('PASS: the server refused the deletion and the comment is still in the discussion.');
  } else {
    console.error('FAIL: the deletion was not refused as expected.');
    process.exitCode = 1;
  }
} catch (error) {
  console.error(error.cause?.code === 'ECONNREFUSED' ? `Cannot reach ${base}. Start the app first (npm run dev).` : error.message);
  process.exitCode = 1;
}
