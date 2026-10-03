import { useState } from 'react';
import styles from './Avatar.module.css';
import { initials as makeInitials } from '../lib/format.js';

/** A saved picture, with initials as the fallback for missing or unreadable images. */
export function Avatar({ person, size = 'md' }) {
  const [failedUrl, setFailedUrl] = useState(null);
  const tone = person?.id % 2 === 0 ? 'violet' : 'ink';
  const picture = person?.avatarUrl;
  return (
    <span className={styles.avatar} data-size={size} data-tone={tone} aria-hidden="true">
      {picture && picture !== failedUrl ? (
        <img src={picture} alt="" onError={() => setFailedUrl(picture)} />
      ) : (
        person?.initials ?? makeInitials(person?.displayName)
      )}
    </span>
  );
}
