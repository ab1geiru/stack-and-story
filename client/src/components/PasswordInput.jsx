import { useState } from 'react';
import { EyeIcon } from './Icons.jsx';
import styles from './PasswordInput.module.css';

/** Shared by sign-in and registration; the native input still supports password managers. */
export function PasswordInput({ inputRef, toggleLabel = 'Show password', ...inputProps }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className={styles.box}>
      <input
        {...inputProps}
        ref={inputRef}
        className={`input ${styles.input}`}
        type={visible ? 'text' : 'password'}
      />
      <button
        type="button"
        className={styles.toggle}
        aria-label={toggleLabel}
        aria-pressed={visible}
        aria-controls={inputProps.id}
        title={visible ? toggleLabel.replace('Show', 'Hide') : toggleLabel}
        onClick={() => setVisible((value) => !value)}
        disabled={inputProps.disabled}
      >
        <EyeIcon />
      </button>
    </div>
  );
}
