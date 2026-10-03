import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { useFlash } from '../lib/useFlash.js';
import { useDocumentTitle } from '../lib/useDocumentTitle.js';
import { entryLabel, formatLongDate, paragraphs } from '../lib/format.js';
import { Avatar } from '../components/Avatar.jsx';
import { ActionMenu } from '../components/ActionMenu.jsx';
import { Discussion } from '../components/Discussion.jsx';
import { ConfirmDialog } from '../components/ConfirmDialog.jsx';
import { Notice } from '../components/Notice.jsx';
import { SkeletonLine } from '../components/Skeleton.jsx';
import { ArrowLeftIcon, PenIcon, TrashIcon } from '../components/Icons.jsx';
import styles from './PostPage.module.css';

export function PostPage() {
  const { postId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [flash, dismissFlash] = useFlash();
  const [state, setState] = useState({ status: 'loading', data: null, error: null });

  const load = useCallback(async () => {
    setState((current) => ({ ...current, status: current.data ? 'refreshing' : 'loading', error: null }));
    try {
      const data = await api.getPost(postId);
      setState({ status: 'ready', data, error: null });
    } catch (error) {
      setState({ status: 'error', data: null, error });
    }
  }, [postId]);

  // Reload when the signed-in user changes, since ownership controls depend on who is viewing.
  useEffect(() => {
    load();
  }, [load, user?.id]);

  const post = state.data?.post;
  useDocumentTitle(post ? post.title : state.status === 'error' ? 'Note not found' : 'Loading note');

  const setComments = (comments) =>
    setState((current) => ({ ...current, data: { ...current.data, comments } }));

  async function deleteNote() {
    setDeleting(true);
    setDeleteError('');
    try {
      await api.deletePost(postId);
      navigate('/', { replace: true, state: { flash: 'deleted' } });
    } catch (error) {
      if (error.status === 404) navigate('/', { replace: true, state: { flash: 'deleted' } });
      else setDeleteError(error.message);
    } finally {
      setDeleting(false);
    }
  }

  const backLink = (
    <Link to="/" className={styles.back}>
      <ArrowLeftIcon width={16} height={16} />
      Back to journal
    </Link>
  );

  if (state.status === 'loading') {
    return (
      <div className={styles.page} aria-busy="true">
        {backLink}
        <p className="visually-hidden" role="status">
          Loading the note…
        </p>
        <div className={styles.sheet} aria-hidden="true">
          <div className={styles.skeleton}>
            <SkeletonLine width="6rem" height="0.8rem" />
            <SkeletonLine width="90%" height="2.4rem" />
            <SkeletonLine width="55%" height="2.4rem" />
            <SkeletonLine width="12rem" height="1rem" style={{ marginTop: '0.75rem' }} />
            {[100, 96, 98, 70].map((w) => (
              <SkeletonLine key={w} width={`${w}%`} style={{ marginTop: '0.5rem' }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (state.status === 'error') {
    const notFound = state.error?.status === 404;
    return (
      <div className={styles.page}>
        {backLink}
        <div className={styles.sheet}>
          <div className={styles.missing}>
            <h1 className={styles.missingTitle}>{notFound ? 'This note is not in the journal' : 'The note did not load'}</h1>
            <p>
              {notFound
                ? 'The link may be mistyped, or the note may have been created in a database that was reset.'
                : state.error?.message}
            </p>
            <div className={styles.missingActions}>
              {!notFound && (
                <button type="button" className="btn btn-secondary" onClick={load}>
                  Try again
                </button>
              )}
              <Link to="/" className="btn btn-primary">
                Go to the journal
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { comments, viewer } = state.data;

  return (
    <div className={styles.page}>
      {backLink}
      {flash === 'published' && (
        <div className={styles.flash}>
          <Notice onDismiss={dismissFlash}>
            <strong>Note published.</strong> It now leads the journal, and other builders can comment on it.
          </Notice>
        </div>
      )}
      {flash === 'updated' && <div className={styles.flash}><Notice onDismiss={dismissFlash}>Your note has been updated.</Notice></div>}
      <article className={styles.sheet} aria-labelledby="post-title">
        <header className={styles.header}>
          <p className={styles.entry}>
            <span className="mono-label">{entryLabel(post.entryNumber)}</span>
          </p>
          <h1 id="post-title" className={styles.title}>
            {post.title}
          </h1>
          <div className={styles.byline}>
            <Avatar person={post.author} size="lg" />
            <div className={styles.bylineText}>
              <span className={styles.authorName}>{post.author.displayName}</span>
              <span className={styles.bylineMeta}>
                <span>@{post.author.username}</span>
                <span>
                  Published <time dateTime={post.createdAt}>{formatLongDate(post.createdAt)}</time>
                </span>
                {post.updatedAt && <span>Edited <time dateTime={post.updatedAt}>{formatLongDate(post.updatedAt)}</time></span>}
              </span>
            </div>
            {viewer.canManagePost && user?.id === post.author.id && (
              <ActionMenu label="Note options" items={[
                { label: 'Edit note', icon: <PenIcon />, to: `/posts/${post.id}/edit` },
                { label: 'Delete note', icon: <TrashIcon />, danger: true, onSelect: () => { setDeleteError(''); setDeleteOpen(true); } },
              ]} />
            )}
          </div>
        </header>

        <div className={styles.body}>
          {paragraphs(post.description).map((text, index) => (
            <p key={index}>{text}</p>
          ))}
        </div>

        <Discussion post={post} comments={comments} onCommentsChange={setComments} />
      </article>
      <ConfirmDialog
        open={deleteOpen} title="Delete this note?" confirmLabel="Delete note" cancelLabel="Keep note"
        busyLabel="Deleting…" busy={deleting} error={deleteError} onConfirm={deleteNote}
        onCancel={() => { setDeleteOpen(false); setDeleteError(''); }}
      >
        <p><strong>{post.title}</strong> and its {comments.length ? `${comments.length} ${comments.length === 1 ? 'comment' : 'comments'}` : 'discussion'} will be permanently deleted.</p>
      </ConfirmDialog>
    </div>
  );
}
