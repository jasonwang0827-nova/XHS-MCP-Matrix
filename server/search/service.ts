import fs from 'fs';
import path from 'path';
import { toolRegistry } from '../tool-registry';
import { startAccount } from '../accounts/runtime';
import { SearchRequest, SearchResponse, SearchResultItem } from './types';

const SEARCH_RESULTS_DIR = '/Users/jason/Nova/XHS-mcp/data/search-results';
const SEARCH_TIMEOUT_MS = 35000;
const MAX_LIMIT_PER_ACCOUNT = 50;

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

function asNumber(value: unknown) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function compactText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function parseFeed(feed: any, keyword: string, accountId: string): SearchResultItem | null {
  const noteId = compactText(feed?.id);
  if (!noteId) return null;

  const noteCard = feed?.noteCard || {};
  const user = noteCard?.user || {};
  const interact = noteCard?.interactInfo || {};
  const cover = noteCard?.cover || {};
  const coverUrl = compactText(cover.urlDefault) || compactText(cover.urlPre) || compactText(cover.url);

  return {
    note_id: noteId,
    title: compactText(noteCard.displayTitle),
    author_name: compactText(user.nickname || user.nickName),
    author_id: compactText(user.userId),
    type: compactText(noteCard.type || feed.modelType),
    liked_count: asNumber(interact.likedCount),
    comment_count: asNumber(interact.commentCount),
    collected_count: asNumber(interact.collectedCount),
    shared_count: asNumber(interact.sharedCount),
    cover_url: coverUrl,
    url: `https://www.xiaohongshu.com/explore/${noteId}`,
    keyword,
    source_account_id: accountId,
    matched_accounts: [accountId],
    xsec_token: compactText(feed?.xsecToken) || undefined,
  };
}

function parseSearchToolResult(result: any, keyword: string, accountId: string) {
  const text = result?.result?.content?.[0]?.text;
  if (!text) return [];
  const parsed = JSON.parse(text);
  return (parsed.feeds || [])
    .map((feed: any) => parseFeed(feed, keyword, accountId))
    .filter(Boolean) as SearchResultItem[];
}

async function searchAccountFeeds(accountId: string, keyword: string) {
  await startAccount(accountId);
  const loginResult = await withTimeout(
    toolRegistry.check_login_status({ account_id: accountId }),
    10000,
    `check_login_status ${accountId}`,
  );
  const loginText = loginResult?.result?.content?.[0]?.text || '';
  if (loginText.includes('未登录')) {
    throw new Error(`${accountId} 未登录，请到 /admin 获取二维码扫码登录`);
  }
  return withTimeout(
    toolRegistry.search_feeds({ account_id: accountId, keyword }),
    SEARCH_TIMEOUT_MS,
    `search_feeds ${accountId}`,
  );
}

function mergeResults(results: SearchResultItem[]) {
  const byNoteId = new Map<string, SearchResultItem>();
  for (const item of results) {
    const existing = byNoteId.get(item.note_id);
    if (!existing) {
      byNoteId.set(item.note_id, item);
      continue;
    }
    existing.matched_accounts = Array.from(new Set([
      ...existing.matched_accounts,
      item.source_account_id,
      ...item.matched_accounts,
    ]));
  }
  return Array.from(byNoteId.values());
}

export async function runSearch(request: SearchRequest): Promise<SearchResponse> {
  const keyword = compactText(request.keyword);
  if (!keyword) throw new Error('keyword is required');

  const accountIds = (request.account_ids || []).map(compactText).filter(Boolean);
  if (!accountIds.length) throw new Error('account_ids is required');

  const searchedAccounts = [];
  const rawResults: SearchResultItem[] = [];
  const limitPerAccount = request.limit_per_account
    ? Math.max(1, Math.min(MAX_LIMIT_PER_ACCOUNT, Number(request.limit_per_account)))
    : undefined;

  for (const accountId of accountIds) {
    try {
      let result;
      try {
        result = await searchAccountFeeds(accountId, keyword);
      } catch (firstError) {
        // The upstream binary can occasionally exit between account polling and a tool call.
        // Starting it again gives managed accounts one cheap recovery attempt.
        await startAccount(accountId);
        result = await searchAccountFeeds(accountId, keyword);
      }
      const items = parseSearchToolResult(result, keyword, accountId);
      const limited = limitPerAccount ? items.slice(0, limitPerAccount) : items;
      rawResults.push(...limited);
      searchedAccounts.push({ account_id: accountId, ok: true, count: limited.length });
    } catch (error: any) {
      searchedAccounts.push({
        account_id: accountId,
        ok: false,
        count: 0,
        error: error?.message || String(error),
      });
    }
  }

  const results = request.dedupe === false ? rawResults : mergeResults(rawResults);

  return {
    ok: searchedAccounts.some((account) => account.ok),
    growth_profile_id: request.growth_profile_id || null,
    keyword,
    searched_accounts: searchedAccounts,
    total_raw: rawResults.length,
    total_unique: results.length,
    results,
  };
}

export function saveSearchResponse(response: SearchResponse) {
  fs.mkdirSync(SEARCH_RESULTS_DIR, { recursive: true });
  const safeKeyword = response.keyword.replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]+/g, '_').slice(0, 40) || 'search';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(SEARCH_RESULTS_DIR, `${timestamp}_${safeKeyword}.json`);
  fs.writeFileSync(file, JSON.stringify(response, null, 2));
  return file;
}
