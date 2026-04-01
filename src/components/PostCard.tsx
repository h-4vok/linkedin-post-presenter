import { Copy, ExternalLink, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import styles from './PostCard.module.css';
import { AuthorWeight, LinkedInPost } from '../types/linkedin';
import {
  buildPostClipboardText,
  formatFollowers,
  formatPostTextForDisplay,
  isInterested,
} from '../utils/linkedin';

interface PostCardProps {
  post: LinkedInPost;
}

const WEIGHT_LABELS: Record<AuthorWeight, string> = {
  high: 'High signal',
  medium: 'Medium signal',
  low: 'Low signal',
};

export function PostCard({ post }: PostCardProps) {
  const [copyState, setCopyState] = useState<'idle' | 'success' | 'error'>('idle');
  const interested = isInterested(post);
  const normalizedText = formatPostTextForDisplay(post.post_text);
  const followerLabel = formatFollowers(post.author_followers ?? null);
  const authorWeight = post.author_weight ?? 'medium';
  const repostLabel = post.reposted_by
    ? `Reposted by ${post.reposted_by}`
    : post.is_repost
      ? 'Repost'
      : null;

  useEffect(() => {
    if (copyState === 'idle') {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setCopyState('idle');
    }, 1800);

    return () => window.clearTimeout(timeoutId);
  }, [copyState]);

  const handleCopyClick = async () => {
    try {
      await navigator.clipboard.writeText(buildPostClipboardText(post));
      setCopyState('success');
    } catch {
      setCopyState('error');
    }
  };

  const copyLabel =
    copyState === 'success' ? 'Copied' : copyState === 'error' ? 'Clipboard blocked' : 'Copy context';

  return (
    <article className={styles.card}>
      <header className={styles.header}>
        <div className={styles.identity}>
          <div className={styles.titleRow}>
            <h2 className={styles.author}>{post.author}</h2>
            <span className={`${styles.weightBadge} ${styles[`weight-${authorWeight}`]}`}>
              {WEIGHT_LABELS[authorWeight]}
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
        <button
          className={`${styles.secondaryAction} ${
            copyState === 'success'
              ? styles.copySuccess
              : copyState === 'error'
                ? styles.copyError
                : ''
          }`}
          type="button"
          onClick={handleCopyClick}
        >
          <Copy size={16} />
          {copyLabel}
        </button>
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
