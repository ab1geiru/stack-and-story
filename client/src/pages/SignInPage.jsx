import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router';
import { useAuth } from '../lib/auth.jsx';
import { useDocumentTitle } from '../lib/useDocumentTitle.js';
import { DEMO_ACCOUNTS } from '../lib/demoAccounts.js';
import { safeNext } from '../lib/authRedirect.js';
import { Avatar } from '../components/Avatar.jsx';
import { Notice } from '../components/Notice.jsx';
import { StackGlyph } from '../components/Wordmark.jsx';
import { AlertIcon } from '../components/Icons.jsx';
import { PasswordInput } from '../components/PasswordInput.jsx';
import styles from './AuthPage.module.css';

export function SignInPage() {
  useDocumentTitle('Sign in');
  const { user, status, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const next = safeNext(searchParams.get('next'));
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const usernameRef = useRef(null);
  const passwordRef = useRef(null);
  const formRef = useRef(null);
  const signedInHere = useRef(false);

  useEffect(() => {
    if (status === 'ready' && !user) usernameRef.current?.focus();
  }, [status, user]);

  if (status === 'ready' && user && !signedInHere.current) {
    return <Navigate to={next} replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;
    const found = {};
    if (!username.trim()) found.username = 'Enter a username.';
    if (!password) found.password = 'Enter a password.';
    if (Object.keys(found).length) {
      setErrors(found);
      (found.username ? usernameRef : passwordRef).current?.focus();
      return;
    }
    setSubmitting(true);
    setErrors({});
    try {
      signedInHere.current = true;
      await signIn(username.trim(), password);
      navigate(next, { replace: true });
    } catch (error) {
      signedInHere.current = false;
      setErrors({ ...(error.fields ?? {}), form: error.message });
      setSubmitting(false);
      passwordRef.current?.select();
    }
  }

  function fillAccount(account) {
    setUsername(account.username);
    setPassword(account.password);
    setErrors({});
    formRef.current?.querySelector('button[type="submit"]')?.focus();
  }

  const reason = location.state?.reason === 'write' || next === '/write';

  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        <section className={styles.card} aria-labelledby="signin-heading">
          <StackGlyph size={40} />
          <h1 id="signin-heading" className={styles.heading}>
            Sign in to the journal
          </h1>
          <p className={styles.lede}>
            {reason
              ? 'Sign in to write a note. You will return to the writing page afterwards.'
              : 'Sign in to write notes, join discussions, and manage your own notes and comments.'}
          </p>

          <form ref={formRef} className={styles.form} onSubmit={handleSubmit} noValidate>
            {errors.form && <Notice tone="error">{errors.form}</Notice>}

            <div className="field">
              <label htmlFor="username" className="field-label">
                Username
              </label>
              <input
                id="username"
                ref={usernameRef}
                className="input"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck="false"
                aria-invalid={Boolean(errors.username) || undefined}
                aria-describedby={errors.username ? 'username-error' : undefined}
                disabled={submitting}
              />
              {errors.username && (
                <p id="username-error" className="field-error">
                  <AlertIcon />
                  {errors.username}
                </p>
              )}
            </div>

            <div className="field">
              <label htmlFor="password" className="field-label">
                Password
              </label>
              <PasswordInput
                  id="password"
                  inputRef={passwordRef}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  aria-invalid={Boolean(errors.password) || undefined}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  disabled={submitting}
              />
              {errors.password && (
                <p id="password-error" className="field-error">
                  <AlertIcon />
                  {errors.password}
                </p>
              )}
            </div>

            <button type="submit" className={`btn btn-primary ${styles.submit}`} disabled={submitting} aria-busy={submitting || undefined}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className={styles.switch}>
            New to the journal?{' '}
            <Link to={`/signup?next=${encodeURIComponent(next)}`}>Create an account</Link>
          </p>

          <p className={styles.back}>
            <Link to="/">Keep reading without signing in</Link>
          </p>
        </section>

        <section className={styles.demo} aria-labelledby="demo-heading">
          <h2 id="demo-heading" className={styles.demoHeading}>
            Local demonstration accounts
          </h2>
          <p className={styles.demoIntro}>
            These two accounts exist only in this project&rsquo;s local SQLite database, so an evaluator can test post
            ownership and editing permissions. You can also create your own account.
          </p>
          <ul className={styles.accounts}>
            {DEMO_ACCOUNTS.map((account) => (
              <li key={account.username} className={styles.account}>
                <div className={styles.accountHead}>
                  <Avatar person={account} />
                  <div>
                    <p className={styles.accountName}>{account.displayName}</p>
                    <p className={styles.accountNote}>{account.note}</p>
                  </div>
                </div>
                <dl className={styles.credentials}>
                  <div>
                    <dt>Username</dt>
                    <dd>
                      <code>{account.username}</code>
                    </dd>
                  </div>
                  <div>
                    <dt>Password</dt>
                    <dd>
                      <code>{account.password}</code>
                    </dd>
                  </div>
                </dl>
                <button type="button" className="btn btn-secondary" onClick={() => fillAccount(account)}>
                  Use {account.displayName.split(' ')[0]}&rsquo;s account
                </button>
              </li>
            ))}
          </ul>
          <p className={styles.tip}>
            Tip: use ⋮ to manage your own replies. A note&rsquo;s author can also delete other replies, but cannot edit them.
          </p>
        </section>
      </div>
    </div>
  );
}
