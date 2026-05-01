import fs from 'fs';
import path from 'path';
import { SearchResultItem } from '../search/types';
import { runSearch } from '../search/service';
import { createTask } from '../scheduler/store';
import { GrowthCandidate, GrowthLikeCandidate, GrowthRunResult } from './types';
import {
  getGrowthProfile,
  listGrowthCandidates,
  makeStableId,
  upsertGrowthCandidates,
  upsertLikeCandidates,
} from './store';

const REPORT_DIR = '/Users/jason/Nova/XHS-mcp/data/reports/growth';

function now() {
  return new Date().toISOString();
}

function compactText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

function readRulesText(rulesSource?: string) {
  if (!rulesSource || !fs.existsSync(rulesSource)) return '';
  return fs.readFileSync(rulesSource, 'utf8');
}

function dailyFollowTarget(profile: { daily_follow_min?: number; daily_follow_max?: number }) {
  const min = Math.max(1, profile.daily_follow_min ?? 3);
  const max = Math.max(min, profile.daily_follow_max ?? 5);
  return min + Math.floor(Math.random() * (max - min + 1));
}

function matchKeywords(item: SearchResultItem, keywords: string[]) {
  const text = [item.title, item.author_name, item.keyword].map(compactText).join('\n');
  return keywords.filter((keyword) => keyword && text.includes(keyword));
}

function scoreItem(item: SearchResultItem, matchedKeywords: string[]) {
  return matchedKeywords.length * 5 +
    Math.min(item.liked_count || 0, 500) / 100 +
    Math.min(item.comment_count || 0, 200) / 50 +
    Math.min(item.collected_count || 0, 500) / 100;
}

function candidatesFromResults(profileId: string, results: SearchResultItem[], keywords: string[]) {
  const byAuthor = new Map<string, GrowthCandidate>();
  for (const item of results) {
    if (!item.author_id) continue;
    const matched = unique(matchKeywords(item, keywords));
    if (!matched.length) continue;

    const existing = byAuthor.get(item.author_id);
    const score = scoreItem(item, matched);
    if (existing) {
      existing.matched_keywords = unique([...existing.matched_keywords, ...matched]);
      existing.source_note_ids = unique([...existing.source_note_ids, item.note_id]);
      existing.source_account_ids = unique([...existing.source_account_ids, item.source_account_id]);
      existing.score = Math.max(existing.score, score);
      if (!existing.latest_note || score >= existing.score) {
        existing.latest_note = {
          note_id: item.note_id,
          title: item.title || '无标题',
          url: item.url,
          xsec_token: item.xsec_token,
        };
      }
      existing.updated_at = now();
      continue;
    }

    const timestamp = now();
    byAuthor.set(item.author_id, {
      candidate_id: makeStableId('candidate', `${profileId}:${item.author_id}`),
      profile_id: profileId,
      user_id: item.author_id,
      nickname: item.author_name || '未知',
      matched_keywords: matched,
      score,
      status: 'planned_to_follow',
      source_note_ids: [item.note_id],
      source_account_ids: [item.source_account_id],
      latest_note: {
        note_id: item.note_id,
        title: item.title || '无标题',
        url: item.url,
        xsec_token: item.xsec_token,
      },
      planned_follow_at: timestamp,
      last_seen_note_ids: [item.note_id],
      discovered_at: timestamp,
      updated_at: timestamp,
    });
  }
  return Array.from(byAuthor.values()).sort((a, b) => b.score - a.score);
}

function likeCandidatesFromFollowed(profileId: string, accountIds: string[], discovered: GrowthCandidate[], limit: number) {
  const followed = listGrowthCandidates(profileId)
    .filter((candidate) => candidate.status === 'followed');
  const followedIds = new Set(followed.map((candidate) => candidate.user_id));
  const seenNoteIdsByUser = new Map(followed.map((candidate) => [
    candidate.user_id,
    new Set(candidate.last_seen_note_ids || []),
  ]));
  const candidates = discovered.filter((candidate) => {
    if (!followedIds.has(candidate.user_id) || !candidate.latest_note) return false;
    return !seenNoteIdsByUser.get(candidate.user_id)?.has(candidate.latest_note.note_id);
  });
  const likeCandidates: GrowthLikeCandidate[] = [];

  for (const candidate of candidates.slice(0, limit)) {
    for (const accountId of accountIds) {
      if (!candidate.latest_note) continue;
      likeCandidates.push({
        like_candidate_id: makeStableId('like', `${profileId}:${accountId}:${candidate.latest_note.note_id}`),
        profile_id: profileId,
        account_id: accountId,
        user_id: candidate.user_id,
        nickname: candidate.nickname,
        note_id: candidate.latest_note.note_id,
        title: candidate.latest_note.title,
        url: candidate.latest_note.url,
        xsec_token: candidate.latest_note.xsec_token,
        status: 'needs_approval',
        reason: '来自已关注作者，且没有出现在关注前基线里的新笔记。',
        created_at: now(),
        updated_at: now(),
      });
    }
  }

  return likeCandidates;
}

function writeReport(report: GrowthRunResult) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const file = path.join(REPORT_DIR, `${new Date().toISOString().slice(0, 10)}_${Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify(report, null, 2));
  return file;
}

export async function runDailyGrowthPlan(input: {
  profile_id: string;
  dry_run?: boolean;
  limit_per_keyword?: number;
}): Promise<GrowthRunResult> {
  const profile = getGrowthProfile(input.profile_id);
  if (!profile) throw new Error(`unknown growth profile: ${input.profile_id}`);
  if (!profile.enabled) throw new Error(`growth profile disabled: ${profile.profile_id}`);

  const searchedResults: SearchResultItem[] = [];
  const followTarget = dailyFollowTarget(profile);
  const limitPerKeyword = input.limit_per_keyword || Math.max(3, followTarget);
  const rulesText = readRulesText(profile.rules_source);

  for (const keyword of profile.seed_keywords) {
    const response = await runSearch({
      keyword,
      account_ids: profile.account_ids,
      limit_per_account: limitPerKeyword,
      dedupe: true,
    });
    searchedResults.push(...response.results);
  }

  const matchingKeywords = [
    ...profile.seed_keywords,
    ...profile.persona_description.split(/[，,、\s/]+/).filter(Boolean),
    ...rulesText.split(/[，,、\s/#：:\n-]+/).filter((word) => word.length >= 2 && word.length <= 12),
  ];

  const discoveredCandidates = candidatesFromResults(
    profile.profile_id,
    searchedResults,
    unique(matchingKeywords),
  );
  const followCandidates = discoveredCandidates.slice(0, followTarget);

  const likeCandidates = likeCandidatesFromFollowed(
    profile.profile_id,
    profile.account_ids,
    discoveredCandidates,
    profile.daily_like_limit,
  );

  let followTasksCreated = 0;
  let likeActionsCreated = 0;

  if (!input.dry_run) {
    upsertGrowthCandidates(followCandidates);
    upsertLikeCandidates(likeCandidates);

    for (const candidate of followCandidates) {
      createTask({
        account_id: profile.account_ids[0] || 'xhs_default',
        type: 'growth_follow_candidate',
        payload: {
          profile_id: profile.profile_id,
          candidate,
          approval_required: true,
          note: '今日计划关注。当前上游 MCP 没有 follow_user 工具，所以这里只能记录计划，暂不能真正自动关注。',
        },
        run_at: null,
        status: 'needs_approval',
      });
      followTasksCreated += 1;
    }

    for (const candidate of likeCandidates) {
      createTask({
        account_id: candidate.account_id,
        type: 'like_feed',
        payload: {
          feed_id: candidate.note_id,
          xsec_token: candidate.xsec_token,
          like: true,
          approval_required: true,
        },
        run_at: null,
        status: 'needs_approval',
      });
      likeActionsCreated += 1;
    }
  }

  const report: GrowthRunResult = {
    ok: true,
    dry_run: Boolean(input.dry_run),
    profile,
    searched_keywords: profile.seed_keywords,
    searched_accounts: profile.account_ids,
    follow_candidates: followCandidates,
    like_candidates: likeCandidates,
    summary: {
      discovered_authors: new Set(searchedResults.map((item) => item.author_id).filter(Boolean)).size,
      planned_follows: followCandidates.length,
      like_candidates: likeCandidates.length,
      follow_tasks_created: followTasksCreated,
      like_actions_created: likeActionsCreated,
    },
  };

  if (!input.dry_run) report.report_file = writeReport(report);
  return report;
}
