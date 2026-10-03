import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { useAuth } from '../lib/auth.jsx';
import { safeNext } from '../lib/authRedirect.js';
import { useDocumentTitle } from '../lib/useDocumentTitle.js';
import { Notice } from '../components/Notice.jsx';
import { PasswordInput } from '../components/PasswordInput.jsx';
import { PicturePicker } from '../components/PicturePicker.jsx';
import { StackGlyph } from '../components/Wordmark.jsx';
import { AlertIcon } from '../components/Icons.jsx';
import styles from './AuthPage.module.css';

const FIELDS = [
  { name: 'displayName', label: 'Your name', autoComplete: 'name', maxLength: 60 },
  {
    name: 'username', label: 'Username', autoComplete: 'username', maxLength: 24,
    hint: '3–24 letters, numbers, or underscores. Case does not matter.',
  },
  {
    name: 'password', label: 'Password', autoComplete: 'new-password', maxLength: 128,
    hint: 'Use at least 8 characters. Spaces are allowed.',
  },
  { name: 'confirmPassword', label: 'Confirm password', autoComplete: 'new-password', maxLength: 128 },
];

function validate(values) {
  const errors = {};
  const name = values.displayName.trim().replace(/\s+/g, ' ');
  if (name.length < 2 || name.length > 60) errors.displayName = 'Use a name between 2 and 60 characters.';
  if (!/^[a-z0-9_]{3,24}$/i.test(values.username.trim()))
    errors.username = 'Use 3–24 letters, numbers, or underscores.';
  if (!values.password.trim() || values.password.length < 8 || values.password.length > 128)
    errors.password = 'Use a password between 8 and 128 characters.';
  if (!values.password || values.confirmPassword !== values.password)
    errors.confirmPassword = 'The passwords must match.';
  return errors;
}

export function SignUpPage() {
  useDocumentTitle('Create an account');
  const { user, status, signUp } = useAuth();
  const [searchParams] = useSearchParams();
  const next = safeNext(searchParams.get('next'));
  const navigate = useNavigate();
  const [values, setValues] = useState({ displayName: '', username: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [picture, setPicture] = useState(null);
  const [pictureBusy, setPictureBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const inputs = useRef({});
  const registeredHere = useRef(false);

  useEffect(() => {
    if (status === 'ready' && !user) inputs.current.displayName?.focus();
  }, [status, user]);

  if (status === 'ready' && user && !registeredHere.current) return <Navigate to={next} replace />;

  function update(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({
      ...current, [name]: undefined, form: undefined,
      ...(name === 'password' ? { confirmPassword: undefined } : {}),
    }));
  }

  function focusError(found) {
    const first = FIELDS.find((field) => found[field.name]);
    inputs.current[first?.name ?? (found.profilePicture ? 'profilePicture' : 'username')]?.focus();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting || pictureBusy) return;
    const found = validate(values);
    if (errors.profilePicture) found.profilePicture = errors.profilePicture;
    if (Object.keys(found).length) {
      setErrors({ ...found, form: 'Please fix the highlighted fields.' });
      focusError(found);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      registeredHere.current = true;
      await signUp({ ...values, profilePicture: picture });
      navigate(next, { replace: true, state: { registered: true } });
    } catch (error) {
      registeredHere.current = false;
      const found = { ...(error.fields ?? {}), form: error.message };
      setErrors(found);
      setSubmitting(false);
      focusError(found);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        <section className={styles.card} aria-labelledby="signup-heading">
          <StackGlyph size={40} />
          <h1 id="signup-heading" className={styles.heading}>Create your journal account</h1>
          <p className={styles.lede}>A place for your small builds and lessons learned. Start with a few details.</p>

          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            {errors.form && <Notice tone="error">{errors.form}</Notice>}
            {FIELDS.map(({ name, label, hint, ...attributes }) => {
              const isPassword = name === 'password' || name === 'confirmPassword';
              const inputProps = {
                ...attributes, id: name, name, value: values[name], required: true,
                onChange: (event) => update(name, event.target.value), disabled: submitting,
                'aria-invalid': Boolean(errors[name]) || undefined,
                'aria-describedby': [hint && `${name}-hint`, errors[name] && `${name}-error`].filter(Boolean).join(' ') || undefined,
              };
              const inputRef = (input) => { inputs.current[name] = input; };
              return (
                <div className="field" key={name}>
                  <label htmlFor={name} className="field-label">{label}</label>
                  {isPassword ? (
                    <PasswordInput
                      {...inputProps} inputRef={inputRef}
                      toggleLabel={name === 'confirmPassword' ? 'Show password confirmation' : 'Show password'}
                    />
                  ) : (
                    <input
                      {...inputProps} ref={inputRef} className="input"
                      autoCapitalize={name === 'username' ? 'none' : 'words'} spellCheck="false"
                    />
                  )}
                  {hint && <p id={`${name}-hint`} className="field-hint">{hint}</p>}
                  {errors[name] && <p id={`${name}-error`} className="field-error"><AlertIcon />{errors[name]}</p>}
                </div>
              );
            })}
            <PicturePicker
              person={{ displayName: values.displayName }} value={picture} onChange={setPicture}
              error={errors.profilePicture} disabled={submitting} onBusyChange={setPictureBusy}
              buttonRef={(button) => { inputs.current.profilePicture = button; }}
              onError={(message) => setErrors((current) => ({ ...current, profilePicture: message || undefined, form: undefined }))}
            />
            <button type="submit" className={`btn btn-primary ${styles.submit}`} disabled={submitting || pictureBusy} aria-busy={submitting || undefined}>
              {submitting ? 'Creating your account…' : 'Create account'}
            </button>
          </form>

          <p className={styles.switch}>
            Already have an account?{' '}
            <Link to={`/signin?next=${encodeURIComponent(next)}`}>Sign in</Link>
          </p>
          <p className={styles.back}><Link to="/">Keep reading without an account</Link></p>
        </section>

        <aside className={styles.demo} aria-labelledby="welcome-heading">
          <p className="mono-label">Your next entry starts here</p>
          <h2 id="welcome-heading" className={styles.demoHeading}>Build something. Share the story.</h2>
          <p className={styles.demoIntro}>
            Write a note about a project, join another builder&rsquo;s discussion, and refine your own notes and comments as you learn.
          </p>
          <p className={styles.tip}>
            You&rsquo;ll be signed in after creating your account. Your name appears beside your notes and comments.
          </p>
        </aside>
      </div>
    </div>
  );
}
