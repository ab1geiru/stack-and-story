import styles from './CloudPath.module.css';

/**
 * A route sketched on graph paper: a laptop, three waypoints, and a cloud.
 * It stands for the journal's idea that small local builds travel outward and get shared.
 */
export function CloudPath() {
  return (
    <svg className={styles.art} viewBox="0 0 360 170" aria-hidden="true" focusable="false">
      <defs>
        <pattern id="ss-grid" width="12" height="12" patternUnits="userSpaceOnUse">
          <path d="M12 0H0V12" fill="none" stroke="var(--border)" strokeWidth="0.8" />
        </pattern>
      </defs>
      <rect x="0.5" y="0.5" width="359" height="169" rx="6" fill="url(#ss-grid)" stroke="var(--border)" />

      {/* laptop */}
      <g stroke="var(--ink)" strokeWidth="1.6" fill="var(--cloud)" strokeLinejoin="round">
        <rect x="26" y="104" width="44" height="28" rx="2" />
        <path d="M18 136h60l-4 6H22z" />
      </g>
      <path d="M34 114h14M34 120h22M34 126h10" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" />

      {/* the route */}
      <path
        className={styles.route}
        d="M78 118 C 110 118, 112 84, 140 84 S 176 112, 204 104 S 236 66, 262 64"
        fill="none"
        stroke="var(--ink)"
        strokeWidth="1.6"
        strokeDasharray="4 5"
        strokeLinecap="round"
      />

      {/* waypoints */}
      <g fill="var(--paper)" stroke="var(--accent)" strokeWidth="1.8">
        <circle cx="140" cy="84" r="6" />
        <circle cx="204" cy="104" r="6" />
      </g>
      <g className={styles.labels}>
        <text x="122" y="70">commit</text>
        <text x="188" y="128">review</text>
        <text x="28" y="96">local</text>
      </g>

      {/* cloud */}
      <path
        d="M268 78h58a14 14 0 000-28 20 20 0 00-37-8 15 15 0 00-25 9 13.5 13.5 0 004 27z"
        fill="var(--cloud)"
        stroke="var(--ink)"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="262" cy="64" r="5" fill="var(--violet)" />
      <text className={styles.labels} x="282" y="98">
        shared
      </text>
    </svg>
  );
}
