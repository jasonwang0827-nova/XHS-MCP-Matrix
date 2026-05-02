import { getUpstreamClientForAccount } from '../upstream/mcp-client';

export type ToolHandler = (args?: Record<string, any>) => Promise<any>;

const upstreamNameByLocalName: Record<string, string> = {
  check_login_status: 'check_login_status',
  get_login_qrcode: 'get_login_qrcode',
  delete_cookies: 'delete_cookies',
  publish_content: 'publish_content',
  publish_with_video: 'publish_with_video',
  list_feeds: 'list_feeds',
  search_feeds: 'search_feeds',
  get_feed_detail: 'get_feed_detail',
  user_profile: 'user_profile',
  like_feed: 'like_feed',
  favorite_feed: 'favorite_feed',
  post_comment: 'post_comment_to_feed',
  post_comment_to_feed: 'post_comment_to_feed',
  reply_comment: 'reply_comment_in_feed',
  reply_comment_in_feed: 'reply_comment_in_feed',
};

const disabledInteractionTools = new Set([
  'like_feed',
  'favorite_feed',
  'post_comment',
  'post_comment_to_feed',
  'reply_comment',
  'reply_comment_in_feed',
]);

function normalizeArgs(args?: Record<string, any>, localName?: string) {
  const normalized = { ...(args || {}) };
  delete normalized.account_id;

  // Map matrix task payload to upstream MCP expected fields
  if (localName === 'publish_with_video') {
    const mapped: Record<string, any> = {};
    if (normalized.video_path) mapped.video = normalized.video_path;
    if (normalized.video) mapped.video = normalized.video;
    if (normalized.title) mapped.title = normalized.title;
    if (normalized.content) mapped.content = normalized.content;
    if (normalized.schedule_at) mapped.schedule_at = normalized.schedule_at;
    if (normalized.tags) mapped.tags = normalized.tags;
    if (normalized.visibility) mapped.visibility = normalized.visibility;
    if (normalized.products) mapped.products = normalized.products;
    return mapped;
  }
  if (localName === 'publish_content') {
    const mapped: Record<string, any> = {};
    if (normalized.title) mapped.title = normalized.title;
    if (normalized.content) mapped.content = normalized.content;
    if (normalized.image_paths) mapped.images = normalized.image_paths;
    if (normalized.images) mapped.images = normalized.images;
    if (normalized.tags) mapped.tags = normalized.tags;
    if (normalized.schedule_at) mapped.schedule_at = normalized.schedule_at;
    return mapped;
  }
  if (localName === 'get_feed_detail') {
    const mapped: Record<string, any> = {};
    if (normalized.feed_id || normalized.note_id) mapped.feed_id = normalized.feed_id || normalized.note_id;
    if (normalized.xsec_token) mapped.xsec_token = normalized.xsec_token;
    if (normalized.load_all_comments !== undefined) mapped.load_all_comments = normalized.load_all_comments;
    if (normalized.limit !== undefined) mapped.limit = normalized.limit;
    if (normalized.click_more_replies !== undefined) mapped.click_more_replies = normalized.click_more_replies;
    if (normalized.reply_limit !== undefined) mapped.reply_limit = normalized.reply_limit;
    if (normalized.scroll_speed) mapped.scroll_speed = normalized.scroll_speed;
    return mapped;
  }
  if (localName === 'like_feed' || localName === 'favorite_feed') {
    const mapped: Record<string, any> = {};
    if (normalized.feed_id || normalized.note_id) mapped.feed_id = normalized.feed_id || normalized.note_id;
    if (normalized.xsec_token) mapped.xsec_token = normalized.xsec_token;
    if (normalized.unlike !== undefined) mapped.unlike = normalized.unlike;
    if (normalized.unfavorite !== undefined) mapped.unfavorite = normalized.unfavorite;
    return mapped;
  }
  if (localName === 'post_comment' || localName === 'post_comment_to_feed') {
    const mapped: Record<string, any> = {};
    if (normalized.feed_id || normalized.note_id) mapped.feed_id = normalized.feed_id || normalized.note_id;
    if (normalized.xsec_token) mapped.xsec_token = normalized.xsec_token;
    if (normalized.content) mapped.content = normalized.content;
    return mapped;
  }
  if (localName === 'reply_comment' || localName === 'reply_comment_in_feed') {
    const mapped: Record<string, any> = {};
    if (normalized.feed_id || normalized.note_id) mapped.feed_id = normalized.feed_id || normalized.note_id;
    if (normalized.xsec_token) mapped.xsec_token = normalized.xsec_token;
    if (normalized.comment_id) mapped.comment_id = normalized.comment_id;
    if (normalized.user_id || normalized.author_id) mapped.user_id = normalized.user_id || normalized.author_id;
    if (normalized.content) mapped.content = normalized.content;
    return mapped;
  }

  return normalized;
}

function createTool(localName: string): ToolHandler {
  return async (args = {}) => {
    if (disabledInteractionTools.has(localName)) {
      return {
        account_id: args.account_id || 'default',
        upstream_tool: upstreamNameByLocalName[localName],
        success: false,
        disabled: true,
        message: '平台互动动作已禁用。当前系统只做只读搜索、评论线索采集和报表导出。',
      };
    }
    const upstreamName = upstreamNameByLocalName[localName];
    if (!upstreamName) throw new Error(`unknown local tool: ${localName}`);
    const result = await getUpstreamClientForAccount(args.account_id).callTool(upstreamName, normalizeArgs(args, localName));
    return {
      account_id: args.account_id || 'default',
      upstream_tool: upstreamName,
      result,
      success: !result?.isError,
    };
  };
}

export const xhsToolNames = Object.keys(upstreamNameByLocalName);

export const xhsTools = Object.fromEntries(
  xhsToolNames.map((name) => [name, createTool(name)]),
) as Record<string, ToolHandler>;
