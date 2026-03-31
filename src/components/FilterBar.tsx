import { Search } from 'lucide-react';
import styles from './FilterBar.module.css';

interface FilterBarProps {
  fileName: string;
  fileSummary: string | null;
  resultCount: number;
  searchQuery: string;
  showInterestedOnly: boolean;
  onSearchQueryChange: (value: string) => void;
  onInterestedOnlyChange: (value: boolean) => void;
}

export function FilterBar({
  fileName,
  fileSummary,
  resultCount,
  searchQuery,
  showInterestedOnly,
  onSearchQueryChange,
  onInterestedOnlyChange,
}: FilterBarProps) {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.identity}>
          <p className={styles.fileName}>{fileName}</p>
          <p className={styles.meta}>
            {fileSummary ?? 'Loaded dataset'} <span className={styles.dot}>•</span> {resultCount}{' '}
            visible
          </p>
        </div>
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
            <span className={styles.toggleLabel}>Solo posts de interés</span>
          </label>
        </div>
      </div>
    </header>
  );
}
