export type SearchRequest = {
  keyword: string;
  account_ids: string[];
  growth_profile_id?: string | null;
  limit_per_account?: number;
  dedupe?: boolean;
};

export type SearchResultItem = {
  note_id: string;
  title: string;
  author_name: string;
  author_id: string;
  type: string;
  liked_count: number | null;
  comment_count: number | null;
  collected_count: number | null;
  shared_count: number | null;
  cover_url: string;
  url: string;
  keyword: string;
  source_account_id: string;
  matched_accounts: string[];
  xsec_token?: string;
};

export type SearchAccountResult = {
  account_id: string;
  ok: boolean;
  count: number;
  error?: string;
};

export type SearchResponse = {
  ok: boolean;
  growth_profile_id?: string | null;
  keyword: string;
  searched_accounts: SearchAccountResult[];
  total_raw: number;
  total_unique: number;
  results: SearchResultItem[];
  saved_file?: string;
};
