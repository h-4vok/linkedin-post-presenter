export type InterestStatus = 'interested' | 'not_interested' | (string & {});
export type AuthorWeight = 'high' | 'medium' | 'low';
export type LinkedInPostType = 'organic' | (string & {});
export type AuthorPreferenceStatus = 'favorite' | 'blacklisted' | 'neutral';
export type NetworkProximity = '1st' | '2nd' | '3rd' | null;

export interface InterestValidation {
  attempts: number;
  error: string | null;
  source: string;
  status: InterestStatus;
  validated_at: string;
}

export interface LinkedInPost {
  link: string;
  author: string;
  author_profile_url: string;
  ranking?: number | null;
  reposted_by: string | null;
  post_text: string;
  posted_time: string;
  is_repost: boolean;
  type: LinkedInPostType;
  extracted_at: string;
  interest_validation: InterestValidation;
  author_role?: string | null;
  author_followers?: number | null;
  author_weight?: AuthorWeight | null;
  author_network_proximity?: NetworkProximity;
}

export type LinkedInDataset = LinkedInPost[];

export interface IndexedLinkedInPost {
  post: LinkedInPost;
  searchIndex: string;
}

export interface LoadedFileMeta {
  name: string;
  size: number;
  totalPosts: number;
}

export interface AuthorPreferenceEntry {
  key: string;
  displayName: string;
  updatedAt: string;
}

export interface AuthorPreferencesState {
  version: 1;
  favorites: AuthorPreferenceEntry[];
  blacklist: AuthorPreferenceEntry[];
}

export interface ProximityStats {
  firstDegreeCount: number;
  nonFirstDegreeCount: number;
  unknownProximityCount: number;
}
