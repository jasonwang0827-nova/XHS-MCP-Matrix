import crypto from 'crypto';
import { getFeedDetail } from '../feed-detail/service';
import { upsertLeads } from '../leads/store';
import { LeadItem, LeadResult } from '../leads/types';
import { SearchResponse, SearchResultItem } from '../search/types';

export type CommentLeadRequest = {
  search_response: SearchResponse;
  keywords: string[];
  client_id?: string | null;
  growth_profile_id?: string | null;
  max_notes?: number;
  load_all_comments?: boolean;
  comments_limit?: number;
};

function compactText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function stableId(prefix: string, seed: string) {
  const hash = crypto.createHash('sha1').update(seed).digest('hex').slice(0, 16);
  return `${prefix}_${hash}`;
}

function makeLeadResult(comment: string, keywords: string[]): LeadResult {
  const matched = keywords.filter((keyword) => comment.includes(keyword));
  const score = matched.length * 20 + Math.min(comment.length, 80) / 10;
  return {
    matched_keywords: matched,
    negative_keywords: [],
    lead_score: score,
    lead_level: score >= 40 ? 'A' : score >= 20 ? 'B' : 'C',
    need_follow_up: matched.length > 0,
    follow_up_suggestion: matched.length
      ? `评论命中关键词「${matched.join('、')}」，建议查看评论人主页并生成回复建议。`
      : '',
  };
}

function toCommentLead(input: {
  item: SearchResultItem;
  comment: any;
  keywords: string[];
  clientId?: string | null;
  growthProfileId?: string | null;
}): LeadItem | null {
  const content = compactText(input.comment.content);
  const matched = input.keywords.filter((keyword) => content.includes(keyword));
  if (!matched.length) return null;

  const now = new Date().toISOString();
  const signature = `xhs_comment:${input.item.note_id}:${input.comment.comment_id || input.comment.author_id || content}`;
  return {
    lead_id: stableId('comment', signature),
    source: 'comment',
    platform: 'xiaohongshu',
    account_id: input.item.source_account_id,
    client_id: input.clientId || null,
    growth_profile_id: input.growthProfileId || input.item.keyword || null,
    keyword: input.item.keyword,
    note_id: input.item.note_id,
    title: input.item.title || '无标题',
    author_name: compactText(input.comment.author_name) || '未知评论人',
    author_id: compactText(input.comment.author_id),
    url: input.item.url,
    matched_accounts: input.item.matched_accounts || [input.item.source_account_id],
    signature,
    lead_result: makeLeadResult(content, input.keywords),
    status: 'new',
    raw_item: {
      note: input.item,
      comment: input.comment,
    },
    created_at: now,
    updated_at: now,
  };
}

export async function generateCommentLeadReport(request: CommentLeadRequest) {
  const response = request.search_response;
  if (!response?.results?.length) throw new Error('search_response.results is required');
  const keywords = (request.keywords || []).map(compactText).filter(Boolean);
  if (!keywords.length) throw new Error('keywords is required');

  const maxNotes = Math.max(1, Math.min(Number(request.max_notes || 10), 30));
  const scannedNotes = [];
  const errors = [];
  const leads: LeadItem[] = [];

  for (const item of response.results.slice(0, maxNotes)) {
    if (!item.note_id || !item.xsec_token) {
      errors.push({ note_id: item.note_id, title: item.title, error: 'missing_note_id_or_xsec_token' });
      continue;
    }

    try {
      const detail = await getFeedDetail({
        account_id: item.source_account_id,
        note_id: item.note_id,
        xsec_token: item.xsec_token,
        load_all_comments: Boolean(request.load_all_comments),
        limit: request.comments_limit,
      });
      const comments = detail.detail.comments || [];
      const matched = comments
        .map((comment) => toCommentLead({
          item,
          comment,
          keywords,
          clientId: request.client_id,
          growthProfileId: request.growth_profile_id || response.growth_profile_id || null,
        }))
        .filter(Boolean) as LeadItem[];
      leads.push(...matched);
      scannedNotes.push({
        note_id: item.note_id,
        title: item.title,
        comments_scanned: comments.length,
        matched_comments: matched.length,
      });
    } catch (error: any) {
      errors.push({ note_id: item.note_id, title: item.title, error: error?.message || String(error) });
    }
  }

  const upsert = upsertLeads(leads);
  return {
    ok: true,
    keywords,
    summary: {
      scanned_notes: scannedNotes.length,
      matched_comments: leads.length,
      inserted: upsert.inserted,
      updated: upsert.updated,
      errors: errors.length,
    },
    scanned_notes: scannedNotes,
    errors,
    leads,
    upsert,
  };
}
