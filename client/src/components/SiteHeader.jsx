import { useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../lib/auth.jsx';
import { safeNext } from '../lib/authRedirect.js';
import { Wordmark } from './Wordmark.jsx';
import { Avatar } from './Avatar.jsx';
import { ThemeToggle } from './ThemeToggle.jsx';
import { PenIcon, SignOutIcon } from './Icons.jsx';
import styles from './SiteHeader.module.css';

export function SiteHeader() {
  const { user, status, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState('');

  async function handleSignOut() {
    setSigningOut(true);
    setSignOutError('');
    try {
      await signOut();
      navigate('/', { state: { flash: 'signed-out' } });
    } catch (error) {
      setSignOutError(error.message);
    } finally {
      setSigningOut(false);
    }
  }

  const onSignInPage = location.pathname === '/signin';
  const onSignUpPage = location.pathname === '/signup';
  const next = onSignInPage || onSignUpPage
    ? safeNext(new URLSearchParams(location.search).get('next'))
    : `${location.pathname}${location.search}`;

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link to="/" className={styles.brand} aria-label="Stack & Story, a builder's journal. Go to the journal.">
          <Wordmark />
        </Link>

        <nav className={styles.nav} aria-label="Main">
          <NavLink to="/" end className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}>
            Journal
          </NavLink>
          <Link to="/write" className={`btn btn-primary ${styles.write}`}>
            <PenIcon />
            <span>
              Write<span className={styles.writeLong}> a note</span>
            </span>
          </Link>
        </nav>

        <div className={styles.tools}>
          <ThemeToggle />
          <div className={styles.account}>
            {status === 'loading' ? (
              <span className={styles.accountPlaceholder} aria-hidden="true" />
            ) : user ? (
              <>
                <Link to="/account" className={styles.user} aria-label="Account settings" title="Account settings">
                  <Avatar person={user} size="sm" />
                  <span className={styles.userText}>
                    <span className={styles.userName}>{user.displayName}</span>
                    <span className={styles.settingsLabel}>Account settings</span>
                  </span>
                </Link>
                <button
                  type="button"
                  className={`btn btn-quiet ${styles.signOut}`}
                  onClick={handleSignOut}
                  disabled={signingOut}
                  aria-label={signingOut ? 'Signing out…' : 'Sign out'}
                  title="Sign out"
                >
                  <SignOutIcon />
                  <span>{signingOut ? 'Signing out…' : 'Sign out'}</span>
                </button>
              </>
            ) : (
              <>
                {!onSignInPage && (
                  <Link to={`/signin?next=${encodeURIComponent(next)}`} className={`btn btn-secondary ${styles.signIn}`}>
                    Sign in
                  </Link>
                )}
                {!onSignUpPage && (
                  <Link to={`/signup?next=${encodeURIComponent(next)}`} className={`btn btn-quiet ${styles.signUp}`}>
                    Sign up
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      {signOutError && (
        <p className={styles.headerError} role="alert">
          {signOutError}
        </p>
      )}
    </header>
  );
}
