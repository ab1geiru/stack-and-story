import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router';
import { useAuth } from '../lib/auth.jsx';
import { useDocumentTitle } from '../lib/useDocumentTitle.js';
import { Notice } from '../components/Notice.jsx';
import { PicturePicker } from '../components/PicturePicker.jsx';
import { ArrowLeftIcon } from '../components/Icons.jsx';
import styles from './AccountPage.module.css';

export function AccountPage() {
  useDocumentTitle('Account settings');
  const { user, status, saveProfilePicture } = useAuth();
  const [picture, setPicture] = useState(null);
  const [pictureBusy, setPictureBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setPicture(user?.avatarUrl ?? null);
  }, [user?.id, user?.avatarUrl]);

  if (status === 'loading') return <p className={styles.loading} role="status">Checking your sign-in…</p>;
  if (!user) return <Navigate to="/signin?next=/account" replace />;

  const changed = picture !== user.avatarUrl;

  function updatePicture(value) {
    setPicture(value);
    setSaved(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!changed || saving || pictureBusy || error) return;
    setSaving(true);
    setSaved(false);
    try {
      const updated = await saveProfilePicture(picture);
      setPicture(updated.avatarUrl);
      setSaved(true);
    } catch (err) {
      setError(err.status === 401 ? 'Your session ended. Sign in again to save your picture.' : err.fields?.profilePicture ?? err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.page}>
      <Link to="/" className={styles.back}><ArrowLeftIcon width={16} height={16} />Back to journal</Link>
      <section className={styles.card} aria-labelledby="account-heading">
        <header className={styles.intro}>
          <p className="mono-label">Your corner of the journal</p>
          <h1 id="account-heading">Account settings</h1>
          <p className={styles.lede}>Choose how you appear beside your notes and comments.</p>
        </header>
        <dl className={styles.details}>
          <div><dt>Name</dt><dd>{user.displayName}</dd></div>
          <div><dt>Username</dt><dd>@{user.username}</dd></div>
        </dl>
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {saved && <Notice onDismiss={() => setSaved(false)}>Profile picture saved.</Notice>}
          <PicturePicker
            person={user} value={picture} onChange={updatePicture} onError={(message) => { setError(message); setSaved(false); }}
            error={error} disabled={saving} onBusyChange={setPictureBusy}
          />
          <div className={styles.actions}>
            <p className="field-hint" role="status">{changed ? 'Save changes to update your picture.' : 'Your picture appears on all your notes and comments.'}</p>
            {changed && (
              <button type="button" className="btn btn-secondary" disabled={saving || pictureBusy} onClick={() => { setPicture(user.avatarUrl); setError(''); setSaved(false); }}>Cancel</button>
            )}
            <button type="submit" className="btn btn-primary" disabled={!changed || saving || pictureBusy || Boolean(error)} aria-busy={saving || undefined}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
