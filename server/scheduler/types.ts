export type MatrixTaskStatus = 'pending' | 'needs_approval' | 'running' | 'success' | 'failed' | 'cancelled' | 'skipped';

export type MatrixTaskType =
  | 'check_login_status'
  | 'get_login_qrcode'
  | 'delete_cookies'
  | 'publish_content'
  | 'publish_with_video'
  | 'list_feeds'
  | 'search_feeds'
  | 'get_feed_detail'
  | 'user_profile'
  | 'like_feed'
  | 'favorite_feed'
  | 'post_comment'
  | 'post_comment_to_feed'
  | 'reply_comment'
  | 'reply_comment_in_feed'
  | 'safety_check_content'
  | 'create_reply_suggestion'
  | 'create_client_search_plan'
  | 'growth_follow_candidate';

export type MatrixTask = {
  task_id: string;
  client_id?: string | null;
  account_id: string;
  type: MatrixTaskType;
  status: MatrixTaskStatus;
  payload: Record<string, any>;
  created_at: string;
  updated_at: string;
  run_at?: string | null;
  result?: any;
  error?: string | null;
  account_state?: any;
};
