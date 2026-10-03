export function initialsFor(name) {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] ?? '?').slice(0, 2);
  return letters.toUpperCase();
}

export function toAuthor(row) {
  return {
    id: row.author_id,
    username: row.author_username,
    displayName: row.author_name,
    initials: initialsFor(row.author_name),
    avatarUrl: avatarUrl(row.author_id, row.author_picture_version),
  };
}

export function toPost(row) {
  return {
    id: row.id,
    entryNumber: row.entry_number,
    title: row.title,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? null,
    commentCount: row.comment_count,
    author: toAuthor(row),
  };
}

export function toComment(row) {
  return {
    id: row.id,
    postId: row.post_id,
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? null,
    author: toAuthor(row),
  };
}

export function toSessionUser(user) {
  return user
    ? { id: user.id, username: user.username, displayName: user.displayName, initials: initialsFor(user.displayName), avatarUrl: avatarUrl(user.id, user.pictureVersion) }
    : null;
}

function avatarUrl(id, version) {
  return version ? `/api/auth/avatars/${id}?v=${version}` : null;
}
