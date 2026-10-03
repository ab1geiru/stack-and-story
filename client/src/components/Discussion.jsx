import { useRef, useState } from 'react';
import { Link } from 'react-router';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { formatDateTime, plural } from '../lib/format.js';
import { Avatar } from './Avatar.jsx';
import { ActionMenu } from './ActionMenu.jsx';
import { ConfirmDialog } from './ConfirmDialog.jsx';
import { AlertIcon, PenIcon, TrashIcon } from './Icons.jsx';
import styles from './Discussion.module.css';

const COMMENT_MAX = 2000;

function CommentForm({ postId, onAdded }) {
  const { user, clearUser } = useAuth();
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const fieldRef = useRef(null);

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;
    if (!text.trim()) {
      setError('Write something before posting your comment.');
      fieldRef.current?.focus();
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const { comment } = await api.addComment(postId, text);
      setText('');
      onAdded(comment);
    } catch (err) {
      if (err.status === 401) clearUser();
      setError(err.status === 401 ? 'Your session ended. Sign in again to post this comment; your text is kept here.' : err.fields?.body ?? err.message);
      fieldRef.current?.focus();
    } finally {
      setSubmitting(false);
    }
  }

  const over = text.length > COMMENT_MAX;
  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <Avatar person={user} />
      <div className={styles.formBody}>
        <div className="field-row">
          <label htmlFor="comment-body" className="field-label">
            Add a comment
          </label>
          <span className="counter" data-over={over} aria-hidden="true">
            {text.length}/{COMMENT_MAX}
          </span>
        </div>
        <textarea
          id="comment-body"
          ref={fieldRef}
          className={`textarea ${styles.textarea}`}
          rows={3}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            if (error) setError('');
          }}
          placeholder="Share a fix, a question, or what worked for you."
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? 'comment-error' : undefined}
          disabled={submitting}
        />
        {error && (
          <p id="comment-error" className="field-error">
            <AlertIcon />
            {error}
          </p>
        )}
        <div className={styles.formActions}>
          <span className="field-hint">Posting as {user.displayName}</span>
          <button type="submit" className="btn btn-primary" disabled={submitting || over} aria-busy={submitting || undefined}>
            {submitting ? 'Posting…' : 'Post comment'}
          </button>
        </div>
      </div>
    </form>
  );
}

function CommentEditor({ comment, onSaved, onCancel }) {
  const [text, setText] = useState(comment.body);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fieldRef = useRef(null);
  const over = text.length > COMMENT_MAX;

  async function handleSubmit(event) {
    event.preventDefault();
    if (saving) return;
    if (!text.trim() || over) {
      setError(!text.trim() ? 'Your comment cannot be empty.' : `Keep your comment to ${COMMENT_MAX} characters or fewer.`);
      fieldRef.current?.focus();
      return;
    }
    setSaving(true);
    setError('');
    try {
      const data = await api.updateComment(comment.id, text);
      onSaved(data.comment);
    } catch (err) {
      setError(err.status === 401 ? 'Your session ended. Copy your changes, then sign in again to save them.' : err.fields?.body ?? err.message);
      fieldRef.current?.focus();
      setSaving(false);
    }
  }

  return (
    <form className={styles.editor} onSubmit={handleSubmit} noValidate>
      <div className="field-row">
        <label htmlFor={`edit-comment-${comment.id}`} className="field-label">Edit your comment</label>
        <span className="counter" data-over={over} aria-hidden="true">{text.length}/{COMMENT_MAX}</span>
      </div>
      <textarea
        id={`edit-comment-${comment.id}`} ref={fieldRef} autoFocus className="textarea" rows={4}
        value={text} onChange={(event) => { setText(event.target.value); setError(''); }} disabled={saving}
        aria-invalid={Boolean(error) || undefined} aria-describedby={error ? `edit-error-${comment.id}` : undefined}
      />
      {error && <p id={`edit-error-${comment.id}`} className="field-error" role="alert"><AlertIcon />{error}</p>}
      <div className={styles.editorActions}>
        <button type="submit" className="btn btn-primary" disabled={saving || over || text === comment.body} aria-busy={saving || undefined}>{saving ? 'Saving…' : 'Save changes'}</button>
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={saving}>Cancel</button>
      </div>
    </form>
  );
}

export function Discussion({ post, comments, onCommentsChange }) {
  const { user } = useAuth();
  const [pending, setPending] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [editingId, setEditingId] = useState(null);
  const menuButtons = useRef({});
  const headingRef = useRef(null);

  function handleAdded(comment) {
    onCommentsChange([...comments, comment]);
    setAnnouncement('Your comment was posted.');
  }

  function closeEditor(id) {
    setEditingId(null);
    // Return to the comment's options after saving or cancelling an inline edit.
    requestAnimationFrame(() => menuButtons.current[id]?.current?.focus());
  }

  function handleEdited(comment) {
    onCommentsChange(comments.map((current) => current.id === comment.id ? comment : current));
    setAnnouncement('Your comment was updated.');
    closeEditor(comment.id);
  }

  function closeDialog() {
    setPending(null);
    setDeleteError('');
  }

  async function confirmDelete() {
    setDeleting(true);
    setDeleteError('');
    try {
      await api.deleteComment(pending.id);
      onCommentsChange(comments.filter((comment) => comment.id !== pending.id));
      setAnnouncement(`Comment from ${pending.author.displayName} removed.`);
      setPending(null);
      headingRef.current?.focus();
    } catch (err) {
      if (err.status === 404) {
        onCommentsChange(comments.filter((comment) => comment.id !== pending.id));
        setAnnouncement('That comment had already been removed.');
        setPending(null);
        headingRef.current?.focus();
      } else {
        setDeleteError(err.message);
      }
    } finally {
      setDeleting(false);
    }
  }

  const signInHref = `/signin?next=${encodeURIComponent(`/posts/${post.id}`)}`;

  return (
    <section className={styles.discussion} aria-labelledby="discussion-heading">
      <div className={styles.header}>
        <h2 id="discussion-heading" ref={headingRef} tabIndex={-1} className={styles.heading}>
          Discussion
        </h2>
        <span className={styles.count}>{plural(comments.length, 'comment')}</span>
      </div>

      <p className={styles.guidance}>
        Share a useful fix or a question. Use ⋮ to manage your comments.
        {user?.id === post.author.id && ' As the note author, you can also delete other replies.'}
      </p>

      <p className="visually-hidden" role="status" aria-live="polite">
        {announcement}
      </p>

      {user ? (
        <CommentForm postId={post.id} onAdded={handleAdded} />
      ) : (
        <div className={styles.signInPrompt}>
          <p>Sign in to join the discussion.</p>
          <Link to={signInHref} className="btn btn-secondary">
            Sign in to comment
          </Link>
        </div>
      )}

      {comments.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>No comments yet</p>
          <p>Start the discussion with a question, a related fix, or a note on what worked for you.</p>
        </div>
      ) : (
        <ol className={styles.list}>
          {comments.map((comment) => {
            const isPostAuthor = comment.author.id === post.author.id;
            const isOwnComment = user?.id === comment.author.id;
            const canDelete = Boolean(user && (isOwnComment || user.id === post.author.id));
            const when = formatDateTime(comment.createdAt);
            menuButtons.current[comment.id] ??= { current: null };
            return (
              <li key={comment.id} className={styles.comment}>
                <Avatar person={comment.author} />
                <div className={styles.commentBody}>
                  <div className={styles.commentHead}>
                    <div className={styles.commentMeta}>
                      <span className={styles.commentName}>{comment.author.displayName}</span>
                      {isPostAuthor && <span className={styles.authorTag}>Note author</span>}
                      <time className={styles.commentTime} dateTime={comment.createdAt}>
                        {when}
                      </time>
                      {comment.updatedAt && <time className={styles.commentTime} dateTime={comment.updatedAt} title={`Edited ${formatDateTime(comment.updatedAt)}`}>Edited</time>}
                    </div>
                    {canDelete && (
                      <ActionMenu label={`Comment options for ${comment.author.displayName}, ${when}`}
                        buttonRef={menuButtons.current[comment.id]} disabled={editingId !== null}
                        items={[
                          ...(isOwnComment ? [{ label: 'Edit comment', icon: <PenIcon />, onSelect: () => setEditingId(comment.id) }] : []),
                          { label: 'Delete comment', icon: <TrashIcon />, danger: true, onSelect: () => { setDeleteError(''); setPending(comment); } },
                        ]}
                      />
                    )}
                  </div>
                  {editingId === comment.id && isOwnComment ? (
                    <CommentEditor comment={comment} onSaved={handleEdited} onCancel={() => closeEditor(comment.id)} />
                  ) : (
                    <p className={styles.commentText}>{comment.body}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <ConfirmDialog
        open={Boolean(pending)}
        title="Delete this comment?"
        confirmLabel="Delete comment"
        busyLabel="Deleting…"
        cancelLabel="Keep comment"
        busy={deleting}
        error={deleteError}
        onConfirm={confirmDelete}
        onCancel={closeDialog}
      >
        {pending && (
          <>
            <p>
              The comment from <strong>{pending.author.displayName}</strong> will be permanently removed from this
              discussion.
            </p>
            <blockquote className={styles.quote}>{pending.body}</blockquote>
          </>
        )}
      </ConfirmDialog>
    </section>
  );
}
