import { Link } from 'react-router';
import { useDocumentTitle } from '../lib/useDocumentTitle.js';
import styles from './NotFoundPage.module.css';

export function NotFoundPage() {
  useDocumentTitle('Page not found');
  return (
    <div className={styles.page}>
      <p className="mono-label">404</p>
      <h1 className={styles.heading}>This page is not in the journal</h1>
      <p className={styles.text}>Check the address, or head back to the latest notes.</p>
      <Link to="/" className="btn btn-primary">
        Go to the journal
      </Link>
    </div>
  );
}
