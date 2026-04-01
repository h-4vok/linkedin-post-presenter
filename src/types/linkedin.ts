export type InterestStatus = 'interested' | 'not_interested' | (string & {});
export type AuthorWeight = 'high' | 'medium' | 'low';
export type LinkedInPostType = 'organic' | (string & {});

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
