import { useCallback, useEffect, useMemo, useState } from 'react';
import { AuthorPreferencesView } from './components/AuthorPreferencesView';
import { Feed } from './components/Feed';
import { FileUpload } from './components/FileUpload';
import { AppView, FilterBar } from './components/FilterBar';
import styles from './App.module.css';
import {
  AuthorPreferenceStatus,
  LoadedFileMeta,
  LinkedInDataset,
} from './types/linkedin';
import {
  filterPosts,
  formatFileSize,
  getAuthorPreferenceStatus,
  getUniqueAuthors,
  indexPosts,
  parseLinkedInJson,
  readAuthorPreferences,
  setAuthorPreference,
  writeAuthorPreferences,
} from './utils/linkedin';

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

function readCurrentView(): AppView {
  if (typeof window === 'undefined') {
    return 'feed';
  }

  return window.location.hash === '#/preferences' ? 'preferences' : 'feed';
}

function App() {
  const persistedState = readPersistedState();
  const [currentView, setCurrentView] = useState<AppView>(() => readCurrentView());
  const [posts, setPosts] = useState<LinkedInDataset | null>(persistedState?.posts ?? null);
  const [searchQuery, setSearchQuery] = useState(persistedState?.searchQuery ?? '');
  const [showInterestedOnly, setShowInterestedOnly] = useState(
    persistedState?.showInterestedOnly ?? true,
  );
  const [showBlacklistedAuthors, setShowBlacklistedAuthors] = useState(false);
  const [authorPreferences, setAuthorPreferences] = useState(() => readAuthorPreferences());
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fileMeta, setFileMeta] = useState<LoadedFileMeta | null>(persistedState?.fileMeta ?? null);

  const indexedPosts = useMemo(() => (posts ? indexPosts(posts) : []), [posts]);
  const filteredPosts = useMemo(
    () =>
      filterPosts(
        indexedPosts,
        searchQuery,
        showInterestedOnly,
        authorPreferences,
        showBlacklistedAuthors,
      ),
    [indexedPosts, searchQuery, showInterestedOnly, authorPreferences, showBlacklistedAuthors],
  );
  const detectedAuthors = useMemo(() => (posts ? getUniqueAuthors(posts) : []), [posts]);
  const getPreferenceStatus = useCallback(
    (author: string | null | undefined) => getAuthorPreferenceStatus(authorPreferences, author),
    [authorPreferences],
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handleHashChange = () => setCurrentView(readCurrentView());

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

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

  useEffect(() => {
    writeAuthorPreferences(authorPreferences);
  }, [authorPreferences]);

  const handleFileLoad = async (file: File) => {
    try {
      const fileText = await file.text();
      const parsedPosts = parseLinkedInJson(fileText);

      setPosts(parsedPosts);
      setSearchQuery('');
      setShowInterestedOnly(true);
      setShowBlacklistedAuthors(false);
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

  const handleAuthorPreferenceChange = useCallback(
    (author: string, status: AuthorPreferenceStatus) => {
      setAuthorPreferences((currentPreferences) =>
        setAuthorPreference(currentPreferences, author, status),
      );
    },
    [],
  );

  if (!posts && currentView === 'feed') {
    return (
      <main className={styles.shell}>
        <FileUpload error={loadError} onFileLoad={handleFileLoad} />
      </main>
    );
  }

  return (
    <div className={styles.page}>
      <FilterBar
        currentView={currentView}
        fileName={fileMeta?.name ?? 'JSON dataset'}
        fileSummary={
          fileMeta ? `${fileMeta.totalPosts} posts - ${formatFileSize(fileMeta.size)}` : null
        }
        resultCount={currentView === 'feed' ? filteredPosts.length : 0}
        searchQuery={searchQuery}
        showInterestedOnly={showInterestedOnly}
        showBlacklistedAuthors={showBlacklistedAuthors}
        hasFeedControls={currentView === 'feed' && Boolean(posts)}
        onSearchQueryChange={setSearchQuery}
        onInterestedOnlyChange={setShowInterestedOnly}
        onShowBlacklistedAuthorsChange={setShowBlacklistedAuthors}
      />
      <main className={styles.feedRegion}>
        {currentView === 'preferences' ? (
          <AuthorPreferencesView
            preferences={authorPreferences}
            detectedAuthors={detectedAuthors}
            onAuthorPreferenceChange={handleAuthorPreferenceChange}
          />
        ) : (
          <Feed
            posts={filteredPosts}
            totalPosts={posts?.length ?? 0}
            getAuthorPreferenceStatus={getPreferenceStatus}
            onAuthorPreferenceChange={handleAuthorPreferenceChange}
          />
        )}
      </main>
    </div>
  );
}

export default App;
