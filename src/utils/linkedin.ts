import { IndexedLinkedInPost, LinkedInDataset, LinkedInPost } from '../types/linkedin';

const REQUIRED_TOP_LEVEL_FIELDS: Array<keyof LinkedInPost> = [
  'link',
  'author',
  'author_profile_url',
  'post_text',
  'posted_time',
  'is_repost',
  'type',
  'extracted_at',
  'interest_validation',
  'author_weight',
];

const MOJIBAKE_MARKERS = ['â€™', 'â€œ', 'â€', 'ðŸ', 'Ã', 'Â', 'â€“', 'â€”'];

const textDecoder = new TextDecoder('utf-8');

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const hasRequiredFields = (value: Record<string, unknown>): boolean =>
  REQUIRED_TOP_LEVEL_FIELDS.every((field) => field in value);

export function parseLinkedInJson(fileText: string): LinkedInDataset {
  let parsed: unknown;

  try {
    parsed = JSON.parse(fileText);
  } catch {
    throw new Error('The uploaded file is not valid JSON.');
  }

  if (!Array.isArray(parsed)) {
    throw new Error('The uploaded JSON must be an array of LinkedIn posts.');
  }

  if (parsed.length === 0) {
    return [];
  }

  parsed.forEach((item, index) => {
    if (!isRecord(item) || !hasRequiredFields(item)) {
      throw new Error(`Post #${index + 1} does not match the expected LinkedIn schema.`);
    }

    if (!isRecord(item.interest_validation)) {
      throw new Error(`Post #${index + 1} has an invalid interest_validation payload.`);
    }
  });

  return parsed as LinkedInDataset;
}

export function flattenSearchableValues(input: unknown): string {
  if (input === null || input === undefined) {
    return '';
  }

  if (typeof input === 'string' || typeof input === 'number' || typeof input === 'boolean') {
    return String(input);
  }

  if (Array.isArray(input)) {
    return input.map(flattenSearchableValues).filter(Boolean).join(' ');
  }

  if (isRecord(input)) {
    return Object.values(input).map(flattenSearchableValues).filter(Boolean).join(' ');
  }

  return '';
}

function mojibakeScore(value: string): number {
  return MOJIBAKE_MARKERS.reduce((score, marker) => {
    const matches = value.match(new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'));
    return score + (matches?.length ?? 0);
  }, 0);
}

function tryUtf8Repair(value: string): string {
  const bytes = Uint8Array.from(value, (char) => char.charCodeAt(0) & 0xff);
  return textDecoder.decode(bytes);
}

export function normalizeDisplayText(value: string): string {
  if (!value || !MOJIBAKE_MARKERS.some((marker) => value.includes(marker))) {
    return value;
  }

  try {
    const repaired = tryUtf8Repair(value);
    return mojibakeScore(repaired) < mojibakeScore(value) ? repaired : value;
  } catch {
    return value;
  }
}

export function isInterested(post: LinkedInPost): boolean {
  return post.interest_validation.status === 'interested';
}

export function indexPosts(posts: LinkedInDataset): IndexedLinkedInPost[] {
  return posts.map((post) => ({
    post,
    searchIndex: flattenSearchableValues(post).toLocaleLowerCase(),
  }));
}

export function filterPosts(
  indexedPosts: IndexedLinkedInPost[],
  searchQuery: string,
  showInterestedOnly: boolean,
): LinkedInPost[] {
  const normalizedQuery = searchQuery.trim().toLocaleLowerCase();

  return indexedPosts
    .filter(({ post, searchIndex }) => {
      if (showInterestedOnly && !isInterested(post)) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return searchIndex.includes(normalizedQuery);
    })
    .map(({ post }) => post);
}

export function formatFileSize(sizeInBytes: number): string {
  if (sizeInBytes < 1024) {
    return `${sizeInBytes} B`;
  }

  if (sizeInBytes < 1024 * 1024) {
    return `${(sizeInBytes / 1024).toFixed(1)} KB`;
  }

  return `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function formatFollowers(value: number | null): string | null {
  if (value === null) {
    return null;
  }

  return new Intl.NumberFormat('en', {
    notation: value >= 1000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(value);
}
