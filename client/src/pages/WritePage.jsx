import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useBlocker, useNavigate, useParams } from 'react-router';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { useDocumentTitle } from '../lib/useDocumentTitle.js';
import { entryLabel, excerpt, formatDate, plural } from '../lib/format.js';
import { Avatar } from '../components/Avatar.jsx';
import { ConfirmDialog } from '../components/ConfirmDialog.jsx';
import { Notice } from '../components/Notice.jsx';
import { AlertIcon, CommentIcon } from '../components/Icons.jsx';
import styles from './WritePage.module.css';

const TITLE_MAX = 120;
const DESCRIPTION_MAX = 10000;

function validate(title, description) {
  const errors = {};
  const cleanTitle = title.trim();
  const cleanDescription = description.trim();
  if (!cleanTitle) errors.title = 'Give your note a title.';
  else if (cleanTitle.length > TITLE_MAX) errors.title = `Keep the title to ${TITLE_MAX} characters or fewer.`;
  if (!cleanDescription) errors.description = 'Add a description so other builders can follow along.';
  else if (cleanDescription.length > DESCRIPTION_MAX)
    errors.description = `Keep the description to ${DESCRIPTION_MAX.toLocaleString('en-US')} characters or fewer.`;
  return errors;
}

function Preview({ title, description, user, original }) {
  const today = new Date().toISOString();
  return (
    <section className={styles.preview} aria-labelledby="preview-heading">
      <h2 id="preview-heading" className={styles.previewHeading}>
        Journal preview
      </h2>
      <p className={styles.previewHint}>This is how your note will appear in the journal.</p>
      <div className={styles.previewCard}>
        <p className="mono-label">{original ? entryLabel(original.entryNumber) : 'Next entry'}</p>
        <p className={styles.previewTitle} data-empty={!title.trim()}>
          {title.trim() || 'Your title appears here'}
        </p>
        <p className={styles.previewExcerpt} data-empty={!description.trim()}>
          {description.trim() ? excerpt(description, 150) : 'The opening lines of your description show here.'}
        </p>
        <div className={styles.previewMeta}>
          <span className={styles.previewAuthor}>
            <Avatar person={user} size="sm" />
            {user.displayName}
          </span>
          <span className={styles.previewMono}>{formatDate(original?.createdAt ?? today)}</span>
          <span className={styles.previewMono}>
            <CommentIcon width={14} height={14} />{plural(original?.commentCount ?? 0, 'comment')}
          </span>
        </div>
      </div>
    </section>
  );
}

export function WritePage() {
  const { postId } = useParams();
  const editMode = Boolean(postId);
  useDocumentTitle(editMode ? 'Edit your note' : 'Write a note');
  const { user, status } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState({ status: editMode ? 'loading' : 'ready', post: null, error: '' });
  const allowLeave = useRef(false);
  const titleRef = useRef(null);
  const descriptionRef = useRef(null);

  useEffect(() => {
    let active = true;
    allowLeave.current = false;
    setErrors({});
    if (!postId) {
      setTitle('');
      setDescription('');
      setEditing({ status: 'ready', post: null, error: '' });
      return undefined;
    }
    if (status !== 'ready' || !user) return undefined;
    setEditing({ status: 'loading', post: null, error: '' });
    api.getPost(postId).then((data) => {
      if (!active) return;
      if (!data.viewer.canManagePost) {
        setEditing({ status: 'error', post: null, error: 'Only the author of this note can edit it.' });
        return;
      }
      setTitle(data.post.title);
      setDescription(data.post.description);
      setEditing({ status: 'ready', post: data.post, error: '' });
    }).catch((error) => {
      if (active) setEditing({ status: 'error', post: null, error: error.message });
    });
    return () => { active = false; };
  }, [postId, status, user?.id]);

  const dirty = editMode
    ? editing.status === 'ready' && Boolean(editing.post) && (title !== editing.post.title || description !== editing.post.description)
    : Boolean(title.trim() || description.trim());

  // In-app navigation guard (links, back button) for unpublished text.
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && !allowLeave.current && currentLocation.pathname !== nextLocation.pathname,
  );

  // Browser-level guard for refresh, closing the tab, or typing a new address.
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (event) => {
      if (allowLeave.current) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  if (status === 'loading') {
    return (
      <p className={styles.loading} role="status">
        Checking your sign-in…
      </p>
    );
  }
  if (!user) {
    const next = editMode ? `/posts/${postId}/edit` : '/write';
    return <Navigate to={`/signin?next=${encodeURIComponent(next)}`} replace state={{ reason: 'write' }} />;
  }
  if (editing.status === 'loading') return <p className={styles.loading} role="status">Loading your note…</p>;
  if (editing.status === 'error') {
    return (
      <div className={styles.page}>
        <div className={styles.surface}>
          <h1 className={styles.heading}>This note cannot be edited</h1>
          <p>{editing.error}</p>
          <Link to={`/posts/${postId}`} className="btn btn-secondary">Back to the note</Link>
        </div>
      </div>
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (saving || (editMode && !dirty)) return;
    const found = validate(title, description);
    if (Object.keys(found).length) {
      setErrors({ ...found, form: `Your ${editMode ? 'changes were not saved' : 'note was not published'}. Fix the highlighted fields and try again.` });
      (found.title ? titleRef : descriptionRef).current?.focus();
      return;
    }
    setSaving(true);
    setErrors({});
    try {
      const { post } = editMode
        ? await api.updatePost(postId, title, description)
        : await api.createPost(title, description);
      allowLeave.current = true;
      navigate(`/posts/${post.id}`, { state: { flash: editMode ? 'updated' : 'published' } });
    } catch (error) {
      // Nothing is cleared on failure: the title and description stay in the form.
      const next = { ...(error.fields ?? {}) };
      const failed = editMode ? 'Your changes were not saved.' : 'Your note was not published.';
      next.form =
        error.status === 401
          ? `Your session has ended. ${failed} Copy your text, then sign in again.`
          : error.fields
            ? `${failed} Fix the highlighted fields and try again.`
            : `${failed} ${error.message}`;
      setErrors(next);
      setSaving(false);
    }
  }

  function updateTitle(value) {
    setTitle(value);
    if (errors.title || errors.form) setErrors((current) => ({ ...current, title: undefined, form: undefined }));
  }

  function updateDescription(value) {
    setDescription(value);
    if (errors.description || errors.form)
      setErrors((current) => ({ ...current, description: undefined, form: undefined }));
  }

  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <h1 className={styles.heading}>{editMode ? 'Edit your note' : 'Write a note'}</h1>
        <p className={styles.lede}>{editMode ? 'Refine your title or description. Your discussion stays with the note.' : 'Share something you built, broke, or finally figured out.'}</p>
      </header>

      <div className={styles.layout}>
        <form className={styles.surface} onSubmit={handleSubmit} noValidate aria-describedby={errors.form ? 'form-error' : undefined}>
          {errors.form && (
            <div id="form-error" className={styles.formError}>
              <Notice tone="error">{errors.form}</Notice>
            </div>
          )}

          <div className="field">
            <div className="field-row">
              <label htmlFor="note-title" className="field-label">
                Title
              </label>
              <span className="counter" data-over={title.trim().length > TITLE_MAX} aria-hidden="true">
                {title.trim().length}/{TITLE_MAX}
              </span>
            </div>
            <input
              id="note-title"
              ref={titleRef}
              className={`input ${styles.titleInput}`}
              value={title}
              onChange={(event) => updateTitle(event.target.value)}
              placeholder="What did you build or learn?"
              aria-invalid={Boolean(errors.title) || undefined}
              aria-describedby={errors.title ? 'title-error' : undefined}
              disabled={saving}
              autoComplete="off"
              required
            />
            {errors.title && (
              <p id="title-error" className="field-error">
                <AlertIcon />
                {errors.title}
              </p>
            )}
          </div>

          <div className="field">
            <div className="field-row">
              <label htmlFor="note-description" className="field-label">
                Description
              </label>
              <span className="counter" data-over={description.trim().length > DESCRIPTION_MAX} aria-hidden="true">
                {description.trim().length.toLocaleString('en-US')}/{DESCRIPTION_MAX.toLocaleString('en-US')}
              </span>
            </div>
            <p id="description-hint" className="field-hint">
              Explain the problem, what you tried, and what worked. Leave a blank line to start a new paragraph.
            </p>
            <textarea
              id="note-description"
              ref={descriptionRef}
              className={`textarea ${styles.ruled}`}
              rows={14}
              value={description}
              onChange={(event) => updateDescription(event.target.value)}
              aria-invalid={Boolean(errors.description) || undefined}
              aria-describedby={`description-hint${errors.description ? ' description-error' : ''}`}
              disabled={saving}
              required
            />
            {errors.description && (
              <p id="description-error" className="field-error">
                <AlertIcon />
                {errors.description}
              </p>
            )}
          </div>

          <div className={styles.actions}>
            <p className={styles.saving} role="status" aria-live="polite">
              {saving ? editMode ? 'Saving your changes…' : 'Publishing your note…' : ''}
            </p>
            <button type="button" className="btn btn-secondary" onClick={() => navigate(editMode ? `/posts/${postId}` : '/')} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving || (editMode && !dirty)} aria-busy={saving || undefined}>
              {saving ? editMode ? 'Saving…' : 'Publishing…' : editMode ? 'Save changes' : 'Publish note'}
            </button>
          </div>
        </form>

        <Preview title={title} description={description} user={user} original={editing.post} />
      </div>

      <ConfirmDialog
        open={blocker.state === 'blocked'}
        title={editMode ? 'Leave without saving?' : 'Leave without publishing?'}
        confirmLabel="Discard and leave"
        cancelLabel="Keep writing"
        onConfirm={() => blocker.proceed?.()}
        onCancel={() => blocker.reset?.()}
      >
        <p>{editMode ? 'Your changes have not been saved. If you leave this page, your changes will be lost.' : 'Your note has not been published. If you leave this page, the title and description you wrote will be lost.'}</p>
      </ConfirmDialog>
    </div>
  );
}
