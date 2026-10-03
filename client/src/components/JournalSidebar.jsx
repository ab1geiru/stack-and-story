import { Link } from 'react-router';
import { ArrowRightIcon } from './Icons.jsx';
import { formatDate } from '../lib/format.js';
import styles from './JournalSidebar.module.css';

export function JournalSidebar({ stats, latest }) {
  const rows = [
    ['Notes published', stats?.posts],
    ['Comments', stats?.comments],
    ['Builders contributing', stats?.contributors],
  ];

  return (
    <aside className={styles.sidebar} aria-label="Journal details">
      <section className={styles.section} aria-labelledby="about-heading">
        <h2 id="about-heading" className={styles.heading}>
          About the journal
        </h2>
        <p className={styles.about}>
          A shared notebook for the club&rsquo;s builders. Post a small win, a bug you finally understood, or a
          lesson from a project. Short notes are welcome, and honest ones help the most.
        </p>
        <Link to="/write" className={styles.writeLink}>
          Add your story <ArrowRightIcon width={16} height={16} />
        </Link>
      </section>

      <section className={styles.section} aria-labelledby="totals-heading">
        <h2 id="totals-heading" className={styles.heading}>
          Journal log
        </h2>
        <dl className={styles.ledger}>
          {rows.map(([label, value]) => (
            <div key={label} className={styles.ledgerRow}>
              <dt>{label}</dt>
              <dd>{value ?? '–'}</dd>
            </div>
          ))}
          <div className={styles.ledgerRow}>
            <dt>Latest entry</dt>
            <dd>{latest ? <time dateTime={latest}>{formatDate(latest)}</time> : '–'}</dd>
          </div>
        </dl>
      </section>
    </aside>
  );
}
