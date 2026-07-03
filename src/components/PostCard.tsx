import { Ban, Copy, ExternalLink, RotateCcw, Sparkles, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import styles from './PostCard.module.css';
import { AuthorPreferenceStatus, AuthorWeight, LinkedInPost } from '../types/linkedin';
import {
  buildPostClipboardText,
  formatFollowers,
  formatPostTextForDisplay,
  getNetworkProximityLabel,
  isInterested,
  normalizeAuthorName,
} from '../utils/linkedin';

interface PostCardProps {
  post: LinkedInPost;
  authorPreferenceStatus: AuthorPreferenceStatus;
  onAuthorPreferenceChange: (author: string, status: AuthorPreferenceStatus) => void;
}

const WEIGHT_LABELS: Record<AuthorWeight, string> = {
  high: 'High signal',
  medium: 'Medium signal',
  low: 'Low signal',
};

const AUTHOR_STATUS_LABELS: Record<AuthorPreferenceStatus, string> = {
  favorite: 'Favorito',
  blacklisted: 'Blacklisted',
  neutral: 'Neutral',
};

function getRankingLabel(ranking: number | null | undefined): string | null {
  if (ranking === null || ranking === undefined) {
    return null;
  }

  return ranking === 1 ? 'AI priority #1' : `AI priority #${ranking}`;
}

export function PostCard({
  post,
  authorPreferenceStatus,
  onAuthorPreferenceChange,
}: PostCardProps) {
  const [copyState, setCopyState] = useState<'idle' | 'success' | 'error'>('idle');
  const interested = isInterested(post);
  const normalizedText = formatPostTextForDisplay(post.post_text);
  const followerLabel = formatFollowers(post.author_followers ?? null);
  const authorWeight = post.author_weight ?? 'medium';
  const networkProximity = getNetworkProximityLabel(post);
  const rankingLabel = getRankingLabel(post.ranking);
  const hasAuthorPreferenceActions = normalizeAuthorName(post.author) !== null;
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
            {hasAuthorPreferenceActions ? (
              <span
                className={`${styles.authorStatus} ${
                  styles[`authorStatus-${authorPreferenceStatus}`]
                }`}
              >
                {AUTHOR_STATUS_LABELS[authorPreferenceStatus]}
              </span>
            ) : null}
            <span className={`${styles.weightBadge} ${styles[`weight-${authorWeight}`]}`}>
              {WEIGHT_LABELS[authorWeight]}
            </span>
            {networkProximity ? (
              <span
                className={`${styles.proximityBadge} ${
                  styles[`proximity-${networkProximity}`]
                }`}
              >
                {networkProximity}
              </span>
            ) : null}
            {rankingLabel ? <span className={styles.rankingBadge}>{rankingLabel}</span> : null}
            {interested ? (
              <span className={styles.interestBadge}>
                <Sparkles size={14} />
                Interested
              </span>
            ) : null}
          </div>
          {hasAuthorPreferenceActions ? (
            <div className={styles.authorActions} aria-label={`Author preference for ${post.author}`}>
              <button
                className={`${styles.authorAction} ${
                  authorPreferenceStatus === 'favorite' ? styles.authorActionActive : ''
                }`}
                type="button"
                onClick={() => onAuthorPreferenceChange(post.author, 'favorite')}
                aria-label={`Mark ${post.author} as favorite`}
                title="Mark as favorite"
              >
                <Star size={15} />
              </button>
              <button
                className={`${styles.authorAction} ${
                  authorPreferenceStatus === 'blacklisted' ? styles.authorActionDanger : ''
                }`}
                type="button"
                onClick={() => onAuthorPreferenceChange(post.author, 'blacklisted')}
                aria-label={`Add ${post.author} to blacklist`}
                title="Add to blacklist"
              >
                <Ban size={15} />
              </button>
              <button
                className={styles.authorAction}
                type="button"
                onClick={() => onAuthorPreferenceChange(post.author, 'neutral')}
                aria-label={`Reset ${post.author} to neutral`}
                title="Reset to neutral"
              >
                <RotateCcw size={15} />
              </button>
            </div>
          ) : null}
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
