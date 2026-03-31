import { useMemo, useState } from 'react';
import { Feed } from './components/Feed';
import { FileUpload } from './components/FileUpload';
import { FilterBar } from './components/FilterBar';
import styles from './App.module.css';
import { LoadedFileMeta, LinkedInDataset } from './types/linkedin';
import { filterPosts, formatFileSize, indexPosts, parseLinkedInJson } from './utils/linkedin';

function App() {
  const [posts, setPosts] = useState<LinkedInDataset | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showInterestedOnly, setShowInterestedOnly] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fileMeta, setFileMeta] = useState<LoadedFileMeta | null>(null);

  const indexedPosts = useMemo(() => (posts ? indexPosts(posts) : []), [posts]);
  const filteredPosts = useMemo(
    () => filterPosts(indexedPosts, searchQuery, showInterestedOnly),
    [indexedPosts, searchQuery, showInterestedOnly],
  );

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
