import { ExternalLink, Sparkles } from 'lucide-react';
import styles from './PostCard.module.css';
import { LinkedInPost } from '../types/linkedin';
import { formatFollowers, isInterested, normalizeDisplayText } from '../utils/linkedin';

interface PostCardProps {
  post: LinkedInPost;
}

const WEIGHT_LABELS: Record<LinkedInPost['author_weight'], string> = {
  high: 'High signal',
  medium: 'Medium signal',
  low: 'Low signal',
};

export function PostCard({ post }: PostCardProps) {
  const interested = isInterested(post);
  const normalizedText = normalizeDisplayText(post.post_text);
  const followerLabel = formatFollowers(post.author_followers);
  const repostLabel = post.reposted_by
    ? `Reposted by ${post.reposted_by}`
    : post.is_repost
      ? 'Repost'
      : null;

  return (
    <article className={styles.card}>
      <header className={styles.header}>
        <div className={styles.identity}>
          <div className={styles.titleRow}>
            <h2 className={styles.author}>{post.author}</h2>
            <span className={`${styles.weightBadge} ${styles[`weight-${post.author_weight}`]}`}>
              {WEIGHT_LABELS[post.author_weight]}
            </span>
            {interested ? (
              <span className={styles.interestBadge}>
                <Sparkles size={14} />
                Interested
              </span>
            ) : null}
          </div>
          <div className={styles.meta}>
            <span>{post.posted_time}</span>
            {repostLabel ? <span>{repostLabel}</span> : null}
            {post.author_role ? <span>{post.author_role}</span> : null}
            {followerLabel ? <span>{followerLabel} followers</span> : null}
          </div>
        </div>
      </header>

      <div className={styles.body}>
        <p className={styles.content}>{normalizedText}</p>
      </div>

      <footer className={styles.footer}>
        <a
          className={styles.primaryAction}
          href={post.link}
          target="_blank"
          rel="noopener noreferrer"
        >
          Ir al post
          <ExternalLink size={16} />
        </a>
      </footer>
    </article>
  );
}
