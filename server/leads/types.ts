export type LeadLevel = 'A' | 'B' | 'C' | 'negative';

export type LeadResult = {
  matched_keywords: string[];
  negative_keywords: string[];
  lead_score: number;
  lead_level: LeadLevel;
  need_follow_up: boolean;
  follow_up_suggestion: string;
};

export type LeadItem = {
  lead_id: string;
  source: 'note_search' | 'comment';
  platform: 'xiaohongshu';
  account_id: string;
  client_id?: string | null;
  growth_profile_id?: string | null;
  keyword?: string;
  note_id: string;
  title: string;
  author_name: string;
  author_id: string;
  url: string;
  matched_accounts: string[];
  signature: string;
  lead_result: LeadResult;
  status: 'new' | 'reviewing' | 'done' | 'ignored';
  raw_item?: unknown;
  created_at: string;
  updated_at: string;
};

export type LeadsFile = {
  version: 'v1';
  updated_at: string;
  items: LeadItem[];
};
