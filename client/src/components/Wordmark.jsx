import styles from './Wordmark.module.css';

/** Stack & Story mark: three offset journal pages stacked like deployment layers. */
export function StackGlyph({ size = 34 }) {
  return (
    <svg className={styles.glyph} width={size} height={size} viewBox="0 0 34 34" aria-hidden="true" focusable="false">
      <rect x="4" y="19.5" width="20" height="8" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <rect x="7" y="13" width="20" height="8" rx="1.5" fill="var(--paper)" stroke="currentColor" strokeWidth="1.6" />
      <rect x="10" y="6.5" width="20" height="8" rx="1.5" fill="var(--violet)" />
      <path d="M13.5 10.5h9" stroke="var(--cloud)" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function Wordmark({ compact = false }) {
  return (
    <span className={styles.wordmark}>
      <StackGlyph />
      <span className={styles.text}>
        <span className={styles.name}>
          Stack <span className={styles.amp}>&amp;</span> Story
        </span>
        {!compact && <span className={styles.tagline}>A Builder&rsquo;s Journal</span>}
      </span>
    </span>
  );
}
