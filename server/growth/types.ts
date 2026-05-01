export type GrowthProfile = {
  profile_id: string;
  name: string;
  account_ids: string[];
  persona_description: string;
  rules_source?: string;
  seed_keywords: string[];
  daily_follow_min: number;
  daily_follow_max: number;
  daily_run_time?: string;
  daily_like_limit: number;
  enabled: boolean;
  auto_follow_enabled: boolean;
  auto_like_enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type GrowthCandidateStatus =
  | 'discovered'
  | 'planned_to_follow'
  | 'followed'
  | 'rejected';

export type GrowthCandidate = {
  candidate_id: string;
  profile_id: string;
  user_id: string;
  nickname: string;
  matched_keywords: string[];
  score: number;
  status: GrowthCandidateStatus;
  source_note_ids: string[];
  source_account_ids: string[];
  latest_note?: {
    note_id: string;
    title: string;
    url: string;
    xsec_token?: string;
  };
  planned_follow_at?: string;
  followed_at?: string;
  last_seen_note_ids: string[];
  discovered_at: string;
  updated_at: string;
};

export type GrowthLikeCandidate = {
  like_candidate_id: string;
  profile_id: string;
  account_id: string;
  user_id: string;
  nickname: string;
  note_id: string;
  title: string;
  url: string;
  xsec_token?: string;
  status: 'needs_approval' | 'approved' | 'done' | 'skipped';
  reason: string;
  created_at: string;
  updated_at: string;
};

export type GrowthRunResult = {
  ok: boolean;
  dry_run: boolean;
  profile: GrowthProfile;
  searched_keywords: string[];
  searched_accounts: string[];
  follow_candidates: GrowthCandidate[];
  like_candidates: GrowthLikeCandidate[];
  summary: {
    discovered_authors: number;
    planned_follows: number;
    like_candidates: number;
    follow_tasks_created: number;
    like_actions_created: number;
  };
  report_file?: string;
};
