import { useEffect, useRef, useState } from 'react';
import { Outlet, ScrollRestoration, useLocation, useNavigate } from 'react-router';
import { SiteHeader } from './SiteHeader.jsx';
import { Notice } from './Notice.jsx';
import styles from './AppLayout.module.css';

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [welcome, setWelcome] = useState(false);
  const mainRef = useRef(null);
  const previousPath = useRef(location.pathname);

  useEffect(() => {
    if (!location.state?.registered) return;
    setWelcome(true);
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null, preventScrollReset: true });
  }, [location.state, location.pathname, location.search, navigate]);

  // Move focus to the new page on client-side navigation so keyboard and screen reader users start at the top.
  // Comparing paths (rather than skipping the first render) keeps this correct under React StrictMode.
  useEffect(() => {
    if (previousPath.current === location.pathname) return;
    previousPath.current = location.pathname;
    mainRef.current?.focus({ preventScroll: true });
  }, [location.pathname]);

  return (
    <>
      <a href="#main-content" className={styles.skip}>
        Skip to content
      </a>
      <SiteHeader />
      <main id="main-content" ref={mainRef} tabIndex={-1} className={styles.main}>
        {welcome && (
          <div className={styles.welcome}>
            <Notice onDismiss={() => setWelcome(false)}>Your account is ready. You&rsquo;re signed in and can write your first note.</Notice>
          </div>
        )}
        <Outlet />
      </main>
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <p>
            <span className={styles.footerName}>Stack &amp; Story</span> is a builder&rsquo;s journal for the AWS
            Learning Club UST Development Committee.
          </p>
          <p className="mono-label">Running locally. Your notes are stored in SQLite on this machine.</p>
        </div>
      </footer>
      <ScrollRestoration />
    </>
  );
}
