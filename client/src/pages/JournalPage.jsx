import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { api } from '../lib/api.js';
import { useFlash } from '../lib/useFlash.js';
import { useDocumentTitle } from '../lib/useDocumentTitle.js';
import { plural } from '../lib/format.js';
import { CloudPath } from '../components/CloudPath.jsx';
import { FeaturedPost, EntryPost } from '../components/PostPreview.jsx';
import { JournalSidebar } from '../components/JournalSidebar.jsx';
import { JournalSearch } from '../components/JournalSearch.jsx';
import { Notice } from '../components/Notice.jsx';
import { SkeletonLine } from '../components/Skeleton.jsx';
import { PenIcon } from '../components/Icons.jsx';
import styles from './JournalPage.module.css';

const FLASH_MESSAGES = {
  deleted: 'Your note and its discussion have been deleted.',
  'signed-out': 'You are signed out. Sign in again whenever you want to write or comment.',
};

function matches(post, query) {
  const needle = query.toLocaleLowerCase();
  return post.title.toLocaleLowerCase().includes(needle) || post.description.toLocaleLowerCase().includes(needle);
}

function LoadingSheet() {
  return (
    <div className={styles.loading} aria-hidden="true">
      <div className={styles.loadingFeatured}>
        <SkeletonLine width="5rem" height="0.8rem" />
        <SkeletonLine width="80%" height="2.2rem" />
        <SkeletonLine width="60%" height="2.2rem" />
        <SkeletonLine width="100%" />
        <SkeletonLine width="92%" />
      </div>
      <div className={styles.grid}>
        {[0, 1, 2, 3].map((key) => (
          <div key={key} className={styles.loadingEntry}>
            <SkeletonLine width="3.5rem" height="0.75rem" />
            <SkeletonLine width="85%" height="1.4rem" />
            <SkeletonLine width="100%" />
            <SkeletonLine width="70%" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function JournalPage() {
  useDocumentTitle('Journal');
  const [state, setState] = useState({ status: 'loading', posts: [], stats: null, error: '' });
  const [searchParams, setSearchParams] = useSearchParams();
  const [flash, dismissFlash] = useFlash();
  const query = searchParams.get('q') ?? '';
  const trimmed = query.trim();

  const load = useCallback(async () => {
    setState((current) => ({ ...current, status: 'loading', error: '' }));
    try {
      const data = await api.listPosts();
      setState({ status: 'ready', posts: data.posts, stats: data.stats, error: '' });
    } catch (error) {
      setState({ status: 'error', posts: [], stats: null, error: error.message });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setQuery = useCallback(
    (value) => setSearchParams(value ? { q: value } : {}, { replace: true, preventScrollReset: true }),
    [setSearchParams],
  );

  const results = useMemo(
    () => (trimmed ? state.posts.filter((post) => matches(post, trimmed)) : state.posts),
    [state.posts, trimmed],
  );

  const [newest, ...earlier] = state.posts;
  const resultsLabel = results.length
    ? `${plural(results.length, 'note')} matching “${trimmed}”`
    : `No notes match “${trimmed}”`;

  let content;
  if (state.status === 'loading') {
    content = (
      <>
        <p className="visually-hidden" role="status">
          Loading the journal…
        </p>
        <LoadingSheet />
      </>
    );
  } else if (state.status === 'error') {
    content = (
      <div className={styles.padded}>
        <Notice
          tone="error"
          action={
            <button type="button" className="btn btn-secondary" onClick={load}>
              Try again
            </button>
          }
        >
          <strong>The journal did not load.</strong> {state.error}
        </Notice>
      </div>
    );
  } else if (state.posts.length === 0) {
    content = (
      <div className={styles.empty}>
        <h2 className={styles.emptyTitle}>Every build starts with a first note</h2>
        <p>Nothing has been published yet. Share what you are building, or a problem you just solved.</p>
        <Link to="/write" className="btn btn-primary">
          <PenIcon />
          Write the first note
        </Link>
      </div>
    );
  } else if (trimmed) {
    content = (
      <div className={styles.padded}>
        <div className={styles.resultsHeader}>
          <h2 className={styles.sectionTitle}>{resultsLabel}</h2>
          <button type="button" className="btn btn-quiet" onClick={() => setQuery('')}>
            Clear search
          </button>
        </div>
        {results.length ? (
          <div className={styles.grid}>
            {results.map((post) => (
              <EntryPost key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <p className={styles.noResults}>Try a shorter word, or clear the search to see every note.</p>
        )}
      </div>
    );
  } else {
    content = (
      <>
        <FeaturedPost post={newest} />
        {earlier.length > 0 && (
          <div className={styles.padded}>
            <div className={styles.collectionHeader}>
              <h2 className={styles.sectionTitle}>Earlier notes</h2>
              <span className="mono-label">{plural(earlier.length, 'note')}</span>
            </div>
            <div className={styles.grid}>
              {earlier.map((post) => (
                <EntryPost key={post.id} post={post} />
              ))}
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className={styles.page}>
      <section className={styles.intro} aria-labelledby="journal-heading">
        <div className={styles.introText}>
          <p className={styles.eyebrow}>A builder&rsquo;s journal</p>
          <h1 id="journal-heading" className={styles.headline}>
            <span className={styles.line}>Small builds.</span>{' '}
            <span className={styles.line}>Shared discoveries.</span>
          </h1>
          <p className={styles.lede}>
            Student developers from the AWS Learning Club at UST write down what they built, what broke, and how they
            fixed it, so the next builder starts a little further ahead.
          </p>
        </div>
        <div className={styles.introArt}>
          <CloudPath />
        </div>
      </section>

      {flash && FLASH_MESSAGES[flash] && (
        <div className={styles.flash}>
          <Notice onDismiss={dismissFlash}>{FLASH_MESSAGES[flash]}</Notice>
        </div>
      )}

      <p className="visually-hidden" role="status" aria-live="polite">
        {trimmed && state.status === 'ready' ? resultsLabel : ''}
      </p>

      <div className={styles.toolbar}>
        <div className={styles.toolbarHeading}>
          <h2 className={styles.journalTitle}>From the journal</h2>
          <p className={styles.toolbarHint}>Small wins, useful fixes, and lessons worth keeping.</p>
        </div>
        <JournalSearch
          query={query}
          onQueryChange={setQuery}
          disabled={state.status !== 'ready' || state.posts.length === 0}
        />
      </div>

      <div className={styles.layout}>
        <section className={styles.sheet} aria-label="Journal entries" aria-busy={state.status === 'loading'}>
          {content}
        </section>
        <JournalSidebar
          stats={state.stats}
          latest={state.posts[0]?.createdAt}
        />
      </div>
    </div>
  );
}
