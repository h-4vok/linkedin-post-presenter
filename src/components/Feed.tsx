import { PostCard } from './PostCard';
import styles from './Feed.module.css';
import { AuthorPreferenceStatus, LinkedInPost } from '../types/linkedin';

interface FeedProps {
  posts: LinkedInPost[];
  totalPosts: number;
  getAuthorPreferenceStatus: (author: string | null | undefined) => AuthorPreferenceStatus;
  onAuthorPreferenceChange: (author: string, status: AuthorPreferenceStatus) => void;
}

export function Feed({
  posts,
  totalPosts,
  getAuthorPreferenceStatus,
  onAuthorPreferenceChange,
}: FeedProps) {
  if (posts.length === 0) {
    return (
      <section className={styles.emptyState}>
        <p className={styles.emptyEyebrow}>No matches</p>
        <h2 className={styles.emptyTitle}>No posts match the current filters.</h2>
        <p className={styles.emptyDescription}>
          Try broadening the global search or disable the interest-only filter to inspect the full
          dataset of {totalPosts} posts.
        </p>
      </section>
    );
  }

  return (
    <section className={styles.feed}>
      {posts.map((post) => (
        <PostCard
          key={`${post.link}-${post.extracted_at}`}
          post={post}
          authorPreferenceStatus={getAuthorPreferenceStatus(post.author)}
          onAuthorPreferenceChange={onAuthorPreferenceChange}
        />
      ))}
    </section>
  );
}
