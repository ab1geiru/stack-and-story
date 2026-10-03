import { useRef } from 'react';
import { SearchIcon, CloseIcon } from './Icons.jsx';
import styles from './JournalSearch.module.css';

export function JournalSearch({ query, onQueryChange, disabled }) {
  const inputRef = useRef(null);
  function clearSearch() {
    onQueryChange('');
    inputRef.current?.focus();
  }
  return (
    <form role="search" className={styles.search} onSubmit={(event) => event.preventDefault()}>
      <h2 className="visually-hidden">Find a note</h2>
      <label htmlFor="journal-search" className="field-label">Search notes</label>
      <div className={styles.searchBox}>
        <SearchIcon className={styles.searchIcon} />
        <input
          id="journal-search"
          ref={inputRef}
          type="search"
          className={`input ${styles.searchInput}`}
          placeholder="Lambda, CORS, budgets…"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          aria-describedby="journal-search-hint"
          disabled={disabled}
          autoComplete="off"
        />
        {query && (
          <button type="button" className={styles.clear} onClick={clearSearch} aria-label="Clear search">
            <CloseIcon width={16} height={16} />
          </button>
        )}
      </div>
      <p id="journal-search-hint" className="field-hint">Matches words in titles and descriptions.</p>
    </form>
  );
}
