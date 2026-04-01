import { AuthorWeight, IndexedLinkedInPost, LinkedInDataset, LinkedInPost } from '../types/linkedin';

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
];

const MOJIBAKE_MARKERS = ['â€™', 'â€œ', 'â€', 'ðŸ', 'Ã', 'Â', 'â€“', 'â€”'];

const textDecoder = new TextDecoder('utf-8');

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const hasRequiredFields = (value: Record<string, unknown>): boolean =>
  REQUIRED_TOP_LEVEL_FIELDS.every((field) => field in value);

const AUTHOR_WEIGHT_VALUES: AuthorWeight[] = ['high', 'medium', 'low'];

function normalizeAuthorWeight(value: unknown): AuthorWeight {
  return typeof value === 'string' && AUTHOR_WEIGHT_VALUES.includes(value as AuthorWeight)
    ? (value as AuthorWeight)
    : 'medium';
}

function normalizeOptionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function normalizeOptionalNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizePost(item: Record<string, unknown>): LinkedInPost {
  return {
    link: String(item.link),
    author: String(item.author),
    author_profile_url: String(item.author_profile_url),
    reposted_by: normalizeOptionalString(item.reposted_by),
    post_text: String(item.post_text),
    posted_time: String(item.posted_time),
    is_repost: Boolean(item.is_repost),
    type: String(item.type),
    extracted_at: String(item.extracted_at),
    interest_validation: item.interest_validation as LinkedInPost['interest_validation'],
    author_role: normalizeOptionalString(item.author_role),
    author_followers: normalizeOptionalNumber(item.author_followers),
    author_weight: normalizeAuthorWeight(item.author_weight),
  };
}

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

  return parsed.map((item) => normalizePost(item as Record<string, unknown>));
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

function regroupSentencesIntoParagraphs(text: string): string {
  const sentences = text.split(/(?<=[.!?])\s+(?=(?:["“'([]?[A-Z0-9#]|https?:\/\/))/u).filter(Boolean);

  if (sentences.length <= 1) {
    return text;
  }

  const paragraphs: string[] = [];
  let currentParagraph = '';

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    const shouldBreakBefore =
      /^([•●▪◦-]\s|\d+\.\s|#|https?:\/\/)/u.test(trimmedSentence) ||
      (currentParagraph.length > 0 && currentParagraph.trim().endsWith(':'));

    if (shouldBreakBefore && currentParagraph) {
      paragraphs.push(currentParagraph.trim());
      currentParagraph = trimmedSentence;
      continue;
    }

    const candidate = currentParagraph ? `${currentParagraph} ${trimmedSentence}` : trimmedSentence;

    if (candidate.length > 260 && currentParagraph) {
      paragraphs.push(currentParagraph.trim());
      currentParagraph = trimmedSentence;
    } else {
      currentParagraph = candidate;
    }
  }

  if (currentParagraph) {
    paragraphs.push(currentParagraph.trim());
  }

  return paragraphs.join('\n\n');
}

export function formatPostTextForDisplay(value: string): string {
  const normalizedText = normalizeDisplayText(value)
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/([a-z])([A-Z][a-z]{2,})/g, '$1\n$2')
    .replace(/\s+(https?:\/\/)/g, '\n\n$1')
    .replace(/\s+([•●▪◦]\s+)/g, '\n$1')
    .replace(/\s+(\d+\.\s)/g, '\n$1')
    .replace(/\s+(#\w+)/g, '\n$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (normalizedText.includes('\n')) {
    return normalizedText;
  }

  if (normalizedText.length < 220) {
    return normalizedText;
  }

  return regroupSentencesIntoParagraphs(normalizedText);
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

export function buildPostClipboardText(post: LinkedInPost): string {
  const authorWeight = post.author_weight ?? 'medium';
  const lines = [
    `Author: ${post.author}`,
    post.author_followers != null ? `Followers: ${formatFollowers(post.author_followers)}` : null,
    post.author_role ? `Role: ${post.author_role}` : null,
    `Posted: ${post.posted_time}`,
    post.reposted_by ? `Reposted by: ${post.reposted_by}` : null,
    `Author weight: ${authorWeight}`,
    `Interest status: ${post.interest_validation.status}`,
    `Link: ${post.link}`,
    '',
    'Content:',
    formatPostTextForDisplay(post.post_text),
  ];

  return lines.filter((line): line is string => line !== null).join('\n');
}
