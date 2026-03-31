import { useEffect, useMemo, useState } from 'react';
import { Feed } from './components/Feed';
import { FileUpload } from './components/FileUpload';
import { FilterBar } from './components/FilterBar';
import styles from './App.module.css';
import { LoadedFileMeta, LinkedInDataset } from './types/linkedin';
import { filterPosts, formatFileSize, indexPosts, parseLinkedInJson } from './utils/linkedin';

const SESSION_STORAGE_KEY = 'linkedin-post-presenter:tab-state';

interface PersistedAppState {
  posts: LinkedInDataset | null;
  searchQuery: string;
  showInterestedOnly: boolean;
  fileMeta: LoadedFileMeta | null;
}

function readPersistedState(): PersistedAppState | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const rawValue = window.sessionStorage.getItem(SESSION_STORAGE_KEY);

    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue) as Partial<PersistedAppState>;

    return {
      posts: Array.isArray(parsed.posts) ? parsed.posts : null,
      searchQuery: typeof parsed.searchQuery === 'string' ? parsed.searchQuery : '',
      showInterestedOnly:
        typeof parsed.showInterestedOnly === 'boolean' ? parsed.showInterestedOnly : true,
      fileMeta:
        parsed.fileMeta &&
        typeof parsed.fileMeta === 'object' &&
        typeof parsed.fileMeta.name === 'string' &&
        typeof parsed.fileMeta.size === 'number' &&
        typeof parsed.fileMeta.totalPosts === 'number'
          ? parsed.fileMeta
          : null,
    };
  } catch {
    return null;
  }
}

function App() {
  const persistedState = readPersistedState();
  const [posts, setPosts] = useState<LinkedInDataset | null>(persistedState?.posts ?? null);
  const [searchQuery, setSearchQuery] = useState(persistedState?.searchQuery ?? '');
  const [showInterestedOnly, setShowInterestedOnly] = useState(
    persistedState?.showInterestedOnly ?? true,
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fileMeta, setFileMeta] = useState<LoadedFileMeta | null>(persistedState?.fileMeta ?? null);

  const indexedPosts = useMemo(() => (posts ? indexPosts(posts) : []), [posts]);
  const filteredPosts = useMemo(
    () => filterPosts(indexedPosts, searchQuery, showInterestedOnly),
    [indexedPosts, searchQuery, showInterestedOnly],
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const stateToPersist: PersistedAppState = {
        posts,
        searchQuery,
        showInterestedOnly,
        fileMeta,
      };

      window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(stateToPersist));
    } catch {
      // Ignore storage failures; the app should still work in memory.
    }
  }, [posts, searchQuery, showInterestedOnly, fileMeta]);

  const handleFileLoad = async (file: File) => {
    try {
      const fileText = await file.text();
      const parsedPosts = parseLinkedInJson(fileText);

      setPosts(parsedPosts);
      setSearchQuery('');
      setShowInterestedOnly(true);
      setLoadError(null);
      setFileMeta({
        name: file.name,
        size: file.size,
        totalPosts: parsedPosts.length,
      });
    } catch (error) {
      setPosts(null);
      setFileMeta(null);
      setLoadError(error instanceof Error ? error.message : 'The selected file could not be loaded.');
    }
  };

  if (!posts) {
    return (
      <main className={styles.shell}>
        <FileUpload error={loadError} onFileLoad={handleFileLoad} />
      </main>
    );
  }

  return (
    <div className={styles.page}>
      <FilterBar
        fileName={fileMeta?.name ?? 'JSON dataset'}
        fileSummary={
          fileMeta ? `${fileMeta.totalPosts} posts · ${formatFileSize(fileMeta.size)}` : null
        }
        resultCount={filteredPosts.length}
        searchQuery={searchQuery}
        showInterestedOnly={showInterestedOnly}
        onSearchQueryChange={setSearchQuery}
        onInterestedOnlyChange={setShowInterestedOnly}
      />
      <main className={styles.feedRegion}>
        <Feed posts={filteredPosts} totalPosts={posts.length} />
      </main>
    </div>
  );
}

export default App;
