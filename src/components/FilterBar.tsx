import { Search } from 'lucide-react';
import styles from './FilterBar.module.css';

export type AppView = 'feed' | 'preferences';

interface FilterBarProps {
  currentView: AppView;
  fileName: string;
  fileSummary: string | null;
  resultCount: number;
  searchQuery: string;
  showInterestedOnly: boolean;
  showBlacklistedAuthors: boolean;
  hasFeedControls: boolean;
  onSearchQueryChange: (value: string) => void;
  onInterestedOnlyChange: (value: boolean) => void;
  onShowBlacklistedAuthorsChange: (value: boolean) => void;
}

export function FilterBar({
  currentView,
  fileName,
  fileSummary,
  resultCount,
  searchQuery,
  showInterestedOnly,
  showBlacklistedAuthors,
  hasFeedControls,
  onSearchQueryChange,
  onInterestedOnlyChange,
  onShowBlacklistedAuthorsChange,
}: FilterBarProps) {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.identity}>
          <p className={styles.fileName}>{fileName}</p>
          <p className={styles.meta}>
            {fileSummary ?? 'No JSON loaded'} <span className={styles.dot}>-</span> {resultCount}{' '}
            visible
          </p>
        </div>
        <nav className={styles.nav} aria-label="Main view">
          <a
            className={`${styles.navLink} ${currentView === 'feed' ? styles.navLinkActive : ''}`}
            href="#/feed"
          >
            Feed
          </a>
          <a
            className={`${styles.navLink} ${
              currentView === 'preferences' ? styles.navLinkActive : ''
            }`}
            href="#/preferences"
          >
            Preferencias
          </a>
        </nav>
        {hasFeedControls ? (
          <div className={styles.controls}>
            <label className={styles.searchField}>
              <Search size={18} className={styles.searchIcon} />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => onSearchQueryChange(event.target.value)}
                placeholder="Search across the full JSON payload"
                aria-label="Search all post properties"
              />
            </label>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={showInterestedOnly}
                onChange={(event) => onInterestedOnlyChange(event.target.checked)}
              />
              <span className={styles.toggleTrack}>
                <span className={styles.toggleThumb} />
              </span>
              <span className={styles.toggleLabel}>Solo posts de interes</span>
            </label>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={showBlacklistedAuthors}
                onChange={(event) => onShowBlacklistedAuthorsChange(event.target.checked)}
              />
              <span className={styles.toggleTrack}>
                <span className={styles.toggleThumb} />
              </span>
              <span className={styles.toggleLabel}>Mostrar blacklist</span>
            </label>
          </div>
        ) : null}
      </div>
    </header>
  );
}
