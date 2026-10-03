export class ApiError extends Error {
  constructor(status, message, fields = null) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

async function request(method, path, body) {
  let response;
  try {
    response = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Cannot reach the Stack & Story server. Check that it is running, then try again.');
  }

  if (response.status === 204) return null;

  let data = null;
  try {
    data = await response.json();
  } catch {
    // A non-JSON response usually means the API server is not running behind the dev proxy.
  }

  if (!response.ok) {
    const message =
      data?.error?.message ??
      (response.status >= 500
        ? 'The server could not complete that request. Check that it is running, then try again.'
        : 'That request could not be completed.');
    throw new ApiError(response.status, message, data?.error?.fields ?? null);
  }
  return data;
}

export const api = {
  me: () => request('GET', '/api/auth/me'),
  signIn: (username, password) => request('POST', '/api/auth/login', { username, password }),
  signUp: (details) => request('POST', '/api/auth/register', details),
  signOut: () => request('POST', '/api/auth/logout'),
  saveProfilePicture: (profilePicture) => request('PATCH', '/api/auth/profile-picture', { profilePicture }),
  listPosts: () => request('GET', '/api/posts'),
  getPost: (id) => request('GET', `/api/posts/${encodeURIComponent(id)}`),
  createPost: (title, description) => request('POST', '/api/posts', { title, description }),
  updatePost: (id, title, description) => request('PATCH', `/api/posts/${encodeURIComponent(id)}`, { title, description }),
  deletePost: (id) => request('DELETE', `/api/posts/${encodeURIComponent(id)}`),
  addComment: (postId, body) => request('POST', `/api/posts/${encodeURIComponent(postId)}/comments`, { body }),
  updateComment: (id, body) => request('PATCH', `/api/comments/${encodeURIComponent(id)}`, { body }),
  deleteComment: (commentId) => request('DELETE', `/api/comments/${encodeURIComponent(commentId)}`),
};
