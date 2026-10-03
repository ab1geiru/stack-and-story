import { useId, useRef, useState } from 'react';
import { prepareProfilePicture } from '../lib/profilePicture.js';
import { Avatar } from './Avatar.jsx';
import { AlertIcon } from './Icons.jsx';
import styles from './PicturePicker.module.css';

export function PicturePicker({ person, value, onChange, onError, error, disabled, onBusyChange, buttonRef }) {
  const id = useId();
  const inputRef = useRef(null);
  const [processing, setProcessing] = useState(false);

  async function selectPicture(event) {
    const file = event.target.files?.[0];
    event.target.value = ''; // Selecting the same file again should still work.
    if (!file) return;
    setProcessing(true);
    onBusyChange(true);
    onError('');
    try {
      onChange(await prepareProfilePicture(file));
    } catch (err) {
      onError(err.message);
    } finally {
      setProcessing(false);
      onBusyChange(false);
    }
  }

  return (
    <div className={styles.picker} role="group" aria-labelledby={`${id}-label`}>
      <p id={`${id}-label`} className="field-label">Profile picture <span className={styles.optional}>(optional)</span></p>
      <div className={styles.row}>
        <Avatar person={{ ...person, avatarUrl: value }} size="profile" />
        <div className={styles.controls}>
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={selectPicture} disabled={disabled || processing} />
          <button
            type="button" ref={buttonRef} className="btn btn-secondary" onClick={() => inputRef.current?.click()}
            disabled={disabled || processing} aria-busy={processing || undefined}
            aria-describedby={`${id}-hint${error ? ` ${id}-error` : ''}`}
          >
            {processing ? 'Preparing picture…' : value ? 'Change picture' : 'Choose picture'}
          </button>
          {(value || error) && (
            <button type="button" className="btn btn-quiet" disabled={disabled || processing} onClick={() => { onChange(null); onError(''); }}>
              {value ? 'Remove picture' : 'Clear selection'}
            </button>
          )}
        </div>
      </div>
      <p id={`${id}-hint`} className="field-hint">JPG, PNG, or WebP, up to 2 MB. Your initials appear when there is no picture.</p>
      {error && <p id={`${id}-error`} className="field-error" role="alert"><AlertIcon />{error}</p>}
    </div>
  );
}
