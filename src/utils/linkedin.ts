import {
  AuthorPreferenceEntry,
  AuthorPreferencesState,
  AuthorPreferenceStatus,
  AuthorWeight,
  IndexedLinkedInPost,
  LinkedInDataset,
  LinkedInPost,
} from '../types/linkedin';

const AUTHOR_PREFERENCES_STORAGE_KEY = 'linkedin-post-presenter:author-preferences:v1';

const EMPTY_AUTHOR_PREFERENCES: AuthorPreferencesState = {
  version: 1,
  favorites: [],
  blacklist: [],
};

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

export function normalizeAuthorName(author: string | null | undefined): string | null {
  if (typeof author !== 'string') {
    return null;
  }

  const normalized = author.trim().replace(/\s+/g, ' ');

  return normalized ? normalized.toLocaleLowerCase() : null;
}

function createAuthorPreferenceEntry(author: string): AuthorPreferenceEntry | null {
  const key = normalizeAuthorName(author);

  if (!key) {
    return null;
  }

  return {
    key,
    displayName: author.trim().replace(/\s+/g, ' '),
    updatedAt: new Date().toISOString(),
  };
}

function isAuthorPreferenceEntry(value: unknown): value is AuthorPreferenceEntry {
  return (
    isRecord(value) &&
    typeof value.key === 'string' &&
    typeof value.displayName === 'string' &&
    typeof value.updatedAt === 'string'
  );
}

function normalizePreferenceEntries(value: unknown): AuthorPreferenceEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const entries = new Map<string, AuthorPreferenceEntry>();

  value.forEach((item) => {
    if (!isAuthorPreferenceEntry(item)) {
      return;
    }

    const key = normalizeAuthorName(item.displayName) ?? normalizeAuthorName(item.key);

    if (!key) {
      return;
    }

    entries.set(key, {
      key,
      displayName: item.displayName.trim().replace(/\s+/g, ' '),
      updatedAt: item.updatedAt,
    });
  });

  return Array.from(entries.values());
}

function normalizeAuthorPreferencesState(value: unknown): AuthorPreferencesState {
  if (!isRecord(value)) {
    return { ...EMPTY_AUTHOR_PREFERENCES };
  }

  const favorites = normalizePreferenceEntries(value.favorites);
  const favoriteKeys = new Set(favorites.map((entry) => entry.key));
  const blacklist = normalizePreferenceEntries(value.blacklist).filter(
    (entry) => !favoriteKeys.has(entry.key),
  );

  return {
    version: 1,
    favorites,
    blacklist,
  };
}

export function readAuthorPreferences(): AuthorPreferencesState {
  if (typeof window === 'undefined') {
    return { ...EMPTY_AUTHOR_PREFERENCES };
  }

  try {
    const rawValue = window.localStorage.getItem(AUTHOR_PREFERENCES_STORAGE_KEY);

    if (!rawValue) {
      return { ...EMPTY_AUTHOR_PREFERENCES };
    }

    return normalizeAuthorPreferencesState(JSON.parse(rawValue));
  } catch {
    return { ...EMPTY_AUTHOR_PREFERENCES };
  }
}

export function writeAuthorPreferences(preferences: AuthorPreferencesState): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(
      AUTHOR_PREFERENCES_STORAGE_KEY,
      JSON.stringify(normalizeAuthorPreferencesState(preferences)),
    );
  } catch {
    // Ignore storage failures; in-memory preferences still keep the UI usable.
  }
}

export function getAuthorPreferenceStatus(
  preferences: AuthorPreferencesState,
  author: string | null | undefined,
): AuthorPreferenceStatus {
  const key = normalizeAuthorName(author);

  if (!key) {
    return 'neutral';
  }

  if (preferences.favorites.some((entry) => entry.key === key)) {
    return 'favorite';
  }

  if (preferences.blacklist.some((entry) => entry.key === key)) {
    return 'blacklisted';
  }

  return 'neutral';
}

export function setAuthorPreference(
  preferences: AuthorPreferencesState,
  author: string,
  status: AuthorPreferenceStatus,
): AuthorPreferencesState {
  const entry = createAuthorPreferenceEntry(author);

  if (!entry) {
    return preferences;
  }

  const withoutAuthor = {
    version: 1 as const,
    favorites: preferences.favorites.filter((item) => item.key !== entry.key),
    blacklist: preferences.blacklist.filter((item) => item.key !== entry.key),
  };

  if (status === 'favorite') {
    return {
      ...withoutAuthor,
      favorites: [...withoutAuthor.favorites, entry],
    };
  }

  if (status === 'blacklisted') {
    return {
      ...withoutAuthor,
      blacklist: [...withoutAuthor.blacklist, entry],
    };
  }

  return withoutAuthor;
}

export function getUniqueAuthors(posts: LinkedInDataset): AuthorPreferenceEntry[] {
  const authors = new Map<string, AuthorPreferenceEntry>();

  posts.forEach((post) => {
    const entry = createAuthorPreferenceEntry(post.author);

    if (entry && !authors.has(entry.key)) {
      authors.set(entry.key, entry);
    }
  });

  return Array.from(authors.values()).sort((left, right) =>
    left.displayName.localeCompare(right.displayName),
  );
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
  preferences: AuthorPreferencesState = EMPTY_AUTHOR_PREFERENCES,
  showBlacklistedAuthors = false,
): LinkedInPost[] {
  const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
  const visiblePosts = indexedPosts
    .filter(({ post, searchIndex }) => {
      if (normalizedQuery && !searchIndex.includes(normalizedQuery)) {
        return false;
      }

      const authorPreferenceStatus = getAuthorPreferenceStatus(preferences, post.author);

      if (authorPreferenceStatus === 'blacklisted' && !showBlacklistedAuthors) {
        return false;
      }

      if (
        showInterestedOnly &&
        authorPreferenceStatus !== 'favorite' &&
        !isInterested(post)
      ) {
        return false;
      }

      return true;
    })
    .map(({ post }) => post);

  const favoritePosts: LinkedInPost[] = [];
  const otherPosts: LinkedInPost[] = [];

  visiblePosts.forEach((post) => {
    if (getAuthorPreferenceStatus(preferences, post.author) === 'favorite') {
      favoritePosts.push(post);
    } else {
      otherPosts.push(post);
    }
  });

  return [...favoritePosts, ...otherPosts];
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
