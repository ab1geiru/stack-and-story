import { AlertIcon, CheckIcon, CloseIcon } from './Icons.jsx';
import styles from './Notice.module.css';

/** Inline status message. Errors use role="alert"; confirmations use a polite status role. */
export function Notice({ tone = 'info', children, action, onDismiss }) {
  const role = tone === 'error' ? 'alert' : 'status';
  return (
    <div className={styles.notice} data-tone={tone} role={role}>
      <span className={styles.icon}>{tone === 'error' ? <AlertIcon /> : <CheckIcon />}</span>
      <div className={styles.content}>{children}</div>
      {action}
      {onDismiss && (
        <button type="button" className={styles.dismiss} onClick={onDismiss} aria-label="Dismiss message">
          <CloseIcon />
        </button>
      )}
    </div>
  );
}
