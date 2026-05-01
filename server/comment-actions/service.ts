import { checkContentSafety } from '../business/safety';
import fs from 'fs';
import path from 'path';

const COMMENT_ACTION_LOG = '/Users/jason/Nova/XHS-mcp/data/comment-actions/replies.jsonl';

function appendReplyLog(entry: Record<string, unknown>) {
  fs.mkdirSync(path.dirname(COMMENT_ACTION_LOG), { recursive: true });
  fs.appendFileSync(COMMENT_ACTION_LOG, JSON.stringify({
    created_at: new Date().toISOString(),
    ...entry,
  }) + '\n');
}

function compactText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export function createCommentReplyDraft(input: {
  comment_content?: string;
  note_title?: string;
  matched_keywords?: string[];
  client_id?: string | null;
}) {
  const comment = compactText(input.comment_content);
  const title = compactText(input.note_title);
  const keywords = (input.matched_keywords || []).map(compactText).filter(Boolean);
  const keywordText = keywords.length ? `你提到的「${keywords.join('、')}」` : '你提到的问题';
  const context = title ? `我是在你评论的这篇笔记「${title}」下面看到的。` : '';
  const draft = `${keywordText}我看到了，${context}如果方便的话，可以再说一下你的具体情况，我帮你按实际需求梳理一下。`;
  const safety = checkContentSafety({
    client_id: input.client_id || null,
    comment: draft,
  });

  return {
    ok: true,
    draft,
    safety,
    auto_send_allowed: false,
    note: '默认只生成回复建议。真实回复需要人工确认后再发送。',
  };
}

export async function replyToComment(input: {
  account_id?: string;
  feed_id?: string;
  note_id?: string;
  xsec_token?: string;
  comment_id?: string;
  user_id?: string;
  author_id?: string;
  content?: string;
  client_id?: string | null;
  confirmed?: boolean;
}) {
  const accountId = compactText(input.account_id);
  const feedId = compactText(input.feed_id || input.note_id);
  const xsecToken = compactText(input.xsec_token);
  const commentId = compactText(input.comment_id);
  const userId = compactText(input.user_id || input.author_id);
  const content = compactText(input.content);

  appendReplyLog({
    status: 'disabled',
    account_id: accountId,
    feed_id: feedId,
    comment_id: commentId,
    user_id: userId,
    content,
    reason: 'comment reply disabled for low-risk read-only lead collection',
  });

  return {
    ok: false,
    disabled: true,
    message: '评论回复功能已禁用。当前系统只做搜索、评论线索采集和报表导出。',
  };
}
