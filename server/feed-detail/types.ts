export type FeedDetailRequest = {
  account_id: string;
  feed_id?: string;
  note_id?: string;
  xsec_token?: string;
  load_all_comments?: boolean;
  limit?: number;
  click_more_replies?: boolean;
  reply_limit?: number;
  scroll_speed?: 'slow' | 'normal' | 'fast' | string;
  detail_timeout_ms?: number;
};

export type NormalizedFeedDetail = {
  note_id: string;
  title: string;
  description: string;
  type: string;
  author_name: string;
  author_id: string;
  liked_count: number | null;
  comment_count: number | null;
  collected_count: number | null;
  shared_count: number | null;
  ip_location: string;
  created_at: string | null;
  image_urls: string[];
  video_url?: string;
  comments: Array<{
    comment_id: string;
    content: string;
    author_name: string;
    author_id: string;
    liked_count: number | null;
    created_at: string | null;
    parent_comment_id?: string;
    level?: number;
  }>;
  raw: unknown;
};

export type FeedDetailResponse = {
  ok: boolean;
  account_id: string;
  mcp_url?: string;
  detail: NormalizedFeedDetail;
};
