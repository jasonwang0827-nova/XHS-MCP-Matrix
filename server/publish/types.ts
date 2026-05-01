export type PublishContentType = 'note' | 'video';
export type PublishContentStatus = 'pending' | 'partial' | 'completed' | 'failed' | 'skipped';

export type PublishContentItem = {
  content_id: string;
  type: PublishContentType;
  title: string;
  content: string;
  tags: string[];
  image_paths?: string[];
  video_path?: string | null;
  cover_path?: string | null;
  source_dir?: string | null;
  caption_path?: string | null;
  archive_dir?: string | null;
  target_accounts: string[];
  client_id?: string | null;
  growth_profile_id?: string | null;
  schedule_at?: string | null;
  submit?: boolean;
  approval_required?: boolean;
  approved?: boolean;
  daily_limit: number;
  min_interval_hours: number;
  max_retry: number;
  check_comments_after_minutes?: number | null;
  status: PublishContentStatus;
  published_accounts: string[];
  failed_accounts: string[];
  retry_count_by_account: Record<string, number>;
  last_error_by_account: Record<string, string>;
  published_at_by_account: Record<string, string>;
  queued_at_by_account: Record<string, string>;
  created_at: string;
  updated_at: string;
};

export type PublishRecord = {
  ts: string;
  account_id: string;
  content_id?: string;
  type: PublishContentType;
  title?: string;
  status: string;
  submitted: boolean;
  result?: unknown;
  error?: string | null;
};
