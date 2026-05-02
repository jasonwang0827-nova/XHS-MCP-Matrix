import { startAccount } from '../accounts/runtime';
import { findAccount } from '../accounts/store';
import { toolRegistry } from '../tool-registry';
import { FeedDetailRequest, FeedDetailResponse, NormalizedFeedDetail } from './types';

const DETAIL_TIMEOUT_MS = 45000;
const MIN_DETAIL_TIMEOUT_MS = 8000;
const MAX_DETAIL_TIMEOUT_MS = 120000;

function compactText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function asNumber(value: unknown) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function asIsoTime(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  const ms = parsed > 10_000_000_000 ? parsed : parsed * 1000;
  return new Date(ms).toISOString();
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: NodeJS.Timeout | null = null;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function parseToolText(result: any) {
  const text = result?.result?.content?.[0]?.text;
  if (!text) throw new Error('empty feed detail response');
  return JSON.parse(text);
}

function normalizeDetail(parsed: any): NormalizedFeedDetail {
  const note = parsed?.data?.note || parsed?.note || {};
  const user = note?.user || {};
  const interact = note?.interactInfo || {};
  const imageUrls = Array.isArray(note?.imageList)
    ? note.imageList
        .map((image: any) => compactText(image?.urlDefault) || compactText(image?.urlPre) || compactText(image?.url))
        .filter(Boolean)
    : [];

  const commentsContainer =
    parsed?.data?.comments ||
    parsed?.data?.commentList ||
    parsed?.comments ||
    [];
  const commentsSource = Array.isArray(commentsContainer)
    ? commentsContainer
    : (Array.isArray(commentsContainer?.list) ? commentsContainer.list : []);
  const comments = Array.isArray(commentsSource)
    ? commentsSource.flatMap((comment: any) => {
        const commentUser = comment?.user || comment?.userInfo || comment?.targetComment?.user || {};
        const parent = {
          comment_id: compactText(comment?.id || comment?.commentId),
          content: compactText(comment?.content || comment?.text),
          author_name: compactText(commentUser?.nickname || commentUser?.nickName),
          author_id: compactText(commentUser?.userId),
          liked_count: asNumber(comment?.likeCount || comment?.likedCount),
          created_at: asIsoTime(comment?.createTime || comment?.time),
          level: 1,
        };
        const repliesSource = Array.isArray(comment?.subComments) ? comment.subComments : [];
        const replies = repliesSource.map((reply: any) => {
          const replyUser = reply?.user || reply?.userInfo || {};
          return {
            comment_id: compactText(reply?.id || reply?.commentId),
            content: compactText(reply?.content || reply?.text),
            author_name: compactText(replyUser?.nickname || replyUser?.nickName),
            author_id: compactText(replyUser?.userId),
            liked_count: asNumber(reply?.likeCount || reply?.likedCount),
            created_at: asIsoTime(reply?.createTime || reply?.time),
            parent_comment_id: parent.comment_id,
            level: 2,
          };
        });
        return [parent, ...replies];
      })
    : [];

  return {
    note_id: compactText(note?.noteId || parsed?.feed_id),
    title: compactText(note?.title),
    description: compactText(note?.desc || note?.description),
    type: compactText(note?.type),
    author_name: compactText(user?.nickname || user?.nickName),
    author_id: compactText(user?.userId),
    liked_count: asNumber(interact?.likedCount),
    comment_count: asNumber(interact?.commentCount),
    collected_count: asNumber(interact?.collectedCount),
    shared_count: asNumber(interact?.sharedCount),
    ip_location: compactText(note?.ipLocation),
    created_at: asIsoTime(note?.time),
    image_urls: imageUrls,
    video_url: compactText(note?.video?.media?.stream?.h264?.[0]?.masterUrl) || undefined,
    comments,
    raw: parsed,
  };
}

export async function getFeedDetail(request: FeedDetailRequest): Promise<FeedDetailResponse> {
  const accountId = compactText(request.account_id);
  const feedId = compactText(request.feed_id || request.note_id);
  const xsecToken = compactText(request.xsec_token);
  if (!accountId) throw new Error('account_id is required');
  if (!feedId) throw new Error('feed_id is required');
  if (!xsecToken) throw new Error('xsec_token is required');

  await startAccount(accountId);
  const account = findAccount(accountId);
  const timeoutMs = Math.max(
    MIN_DETAIL_TIMEOUT_MS,
    Math.min(MAX_DETAIL_TIMEOUT_MS, Number(request.detail_timeout_ms || DETAIL_TIMEOUT_MS)),
  );
  const toolResult = await withTimeout(
    toolRegistry.get_feed_detail({
      account_id: accountId,
      feed_id: feedId,
      xsec_token: xsecToken,
      load_all_comments: request.load_all_comments,
      limit: request.limit,
      click_more_replies: request.click_more_replies,
      reply_limit: request.reply_limit,
      scroll_speed: request.scroll_speed,
    }),
    timeoutMs,
    `get_feed_detail ${feedId}`,
  );

  if (!toolResult.success) {
    const text = toolResult?.result?.content?.[0]?.text;
    throw new Error(text || 'get_feed_detail failed');
  }

  return {
    ok: true,
    account_id: accountId,
    mcp_url: account?.mcp_url,
    detail: normalizeDetail(parseToolText(toolResult)),
  };
}
