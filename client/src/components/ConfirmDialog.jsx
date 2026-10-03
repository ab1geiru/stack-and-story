import { useEffect, useId, useRef } from 'react';
import styles from './ConfirmDialog.module.css';

/**
 * Accessible confirmation built on the native <dialog> element:
 * showModal() traps focus, Escape cancels, and focus returns to the trigger when it closes.
 * The safe action receives focus first.
 */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel = 'Cancel',
  busyLabel,
  busy = false,
  error = '',
  tone = 'danger',
  onConfirm,
  onCancel,
}) {
  const dialogRef = useRef(null);
  const cancelRef = useRef(null);
  const titleId = useId();
  const bodyId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      cancelRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  function handleCancelEvent(event) {
    // Escape key: keep React in charge of the open state.
    event.preventDefault();
    if (!busy) onCancel();
  }

  function handleBackdropClick(event) {
    if (event.target === dialogRef.current && !busy) onCancel();
  }

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      onCancel={handleCancelEvent}
      onClick={handleBackdropClick}
    >
      <div className={styles.panel}>
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        <div id={bodyId} className={styles.body}>
          {children}
        </div>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <div className={styles.actions}>
          <button ref={cancelRef} type="button" className="btn btn-secondary" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn ${tone === 'danger' ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
            disabled={busy}
            aria-busy={busy || undefined}
          >
            {busy ? busyLabel ?? confirmLabel : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
