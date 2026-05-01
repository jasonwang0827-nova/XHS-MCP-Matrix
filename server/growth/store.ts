import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { GrowthCandidate, GrowthLikeCandidate, GrowthProfile } from './types';

const GROWTH_DIR = '/Users/jason/Nova/XHS-mcp/data/growth';
const PROFILES_FILE = path.join(GROWTH_DIR, 'profiles.json');
const CANDIDATES_FILE = path.join(GROWTH_DIR, 'candidates.json');
const LIKE_CANDIDATES_FILE = path.join(GROWTH_DIR, 'like-candidates.json');

function now() {
  return new Date().toISOString();
}

function ensureStore() {
  fs.mkdirSync(GROWTH_DIR, { recursive: true });
  if (!fs.existsSync(PROFILES_FILE)) fs.writeFileSync(PROFILES_FILE, JSON.stringify(defaultProfiles(), null, 2));
  if (!fs.existsSync(CANDIDATES_FILE)) fs.writeFileSync(CANDIDATES_FILE, '[]');
  if (!fs.existsSync(LIKE_CANDIDATES_FILE)) fs.writeFileSync(LIKE_CANDIDATES_FILE, '[]');
}

function defaultProfiles(): GrowthProfile[] {
  const timestamp = now();
  return [
    {
      profile_id: 'study_immigration_leads',
      name: '留学移民潜在人群',
      account_ids: ['xhs_default', 'xhs_test_01'],
      persona_description: '正在了解加拿大/美国留学、签证、移民、选校、海外生活的人，包含学生和家长。',
      rules_source: '/Users/jason/Nova/XHS-mcp/data/growth/rules/study_immigration_leads.md',
      seed_keywords: ['加拿大留学', '美国留学', '签证经验', '移民加拿大', '选校规划'],
      daily_follow_min: 3,
      daily_follow_max: 5,
      daily_run_time: '09:30',
      daily_like_limit: 10,
      enabled: true,
      auto_follow_enabled: false,
      auto_like_enabled: false,
      created_at: timestamp,
      updated_at: timestamp,
    },
  ];
}

function readJson<T>(file: string): T {
  ensureStore();
  return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
}

function writeJson(file: string, value: unknown) {
  ensureStore();
  fs.writeFileSync(file, JSON.stringify(value, null, 2));
}

export function listGrowthProfiles() {
  return readJson<Array<GrowthProfile & { daily_follow_limit?: number }>>(PROFILES_FILE).map(normalizeGrowthProfile);
}

export function getGrowthProfile(profileId: string) {
  const profile = listGrowthProfiles().find((candidate) => candidate.profile_id === profileId);
  return profile ? normalizeGrowthProfile(profile) : null;
}

function normalizeGrowthProfile(profile: GrowthProfile & { daily_follow_limit?: number }): GrowthProfile {
  return {
    ...profile,
    rules_source: profile.rules_source || path.join(GROWTH_DIR, 'rules', `${profile.profile_id}.md`),
    daily_follow_min: profile.daily_follow_min ?? Math.min(3, profile.daily_follow_limit ?? 5),
    daily_follow_max: profile.daily_follow_max ?? profile.daily_follow_limit ?? 5,
    daily_run_time: profile.daily_run_time || '09:30',
  };
}

export function saveGrowthProfile(input: Partial<GrowthProfile> & { profile_id: string }) {
  const profiles = listGrowthProfiles();
  const idx = profiles.findIndex((profile) => profile.profile_id === input.profile_id);
  const timestamp = now();
  const existing = idx >= 0 ? profiles[idx] : null;
  const profile: GrowthProfile = {
    profile_id: input.profile_id,
    name: input.name || existing?.name || input.profile_id,
    account_ids: input.account_ids || existing?.account_ids || ['xhs_default'],
    persona_description: input.persona_description || existing?.persona_description || '',
    rules_source: input.rules_source || existing?.rules_source,
    seed_keywords: input.seed_keywords || existing?.seed_keywords || [],
    daily_follow_min: input.daily_follow_min ?? existing?.daily_follow_min ?? 3,
    daily_follow_max: input.daily_follow_max ?? existing?.daily_follow_max ?? 5,
    daily_run_time: input.daily_run_time ?? existing?.daily_run_time ?? '09:30',
    daily_like_limit: input.daily_like_limit ?? existing?.daily_like_limit ?? 10,
    enabled: input.enabled ?? existing?.enabled ?? true,
    auto_follow_enabled: input.auto_follow_enabled ?? existing?.auto_follow_enabled ?? false,
    auto_like_enabled: input.auto_like_enabled ?? existing?.auto_like_enabled ?? false,
    created_at: existing?.created_at || timestamp,
    updated_at: timestamp,
  };
  if (idx >= 0) profiles[idx] = profile;
  else profiles.push(profile);
  writeJson(PROFILES_FILE, profiles);
  return profile;
}

export function listGrowthCandidates(profileId?: string) {
  const items = readJson<GrowthCandidate[]>(CANDIDATES_FILE);
  return profileId ? items.filter((item) => item.profile_id === profileId) : items;
}

export function upsertGrowthCandidates(candidates: GrowthCandidate[]) {
  const items = readJson<GrowthCandidate[]>(CANDIDATES_FILE);
  const byKey = new Map(items.map((item) => [`${item.profile_id}:${item.user_id}`, item]));
  let inserted = 0;
  let updated = 0;

  for (const candidate of candidates) {
    const key = `${candidate.profile_id}:${candidate.user_id}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.nickname = candidate.nickname || existing.nickname;
      existing.matched_keywords = Array.from(new Set([...existing.matched_keywords, ...candidate.matched_keywords]));
      existing.source_note_ids = Array.from(new Set([...existing.source_note_ids, ...candidate.source_note_ids]));
      existing.source_account_ids = Array.from(new Set([...existing.source_account_ids, ...candidate.source_account_ids]));
      existing.score = Math.max(existing.score, candidate.score);
      existing.latest_note = candidate.latest_note || existing.latest_note;
      existing.planned_follow_at = candidate.planned_follow_at || existing.planned_follow_at;
      existing.followed_at = candidate.followed_at || existing.followed_at;
      existing.last_seen_note_ids = Array.from(new Set([...(existing.last_seen_note_ids || []), ...(candidate.last_seen_note_ids || [])]));
      if (existing.status === 'discovered') existing.status = candidate.status;
      existing.updated_at = now();
      updated += 1;
    } else {
      items.push(candidate);
      byKey.set(key, candidate);
      inserted += 1;
    }
  }

  writeJson(CANDIDATES_FILE, items);
  return { inserted, updated, total: items.length, items };
}

export function listLikeCandidates(profileId?: string) {
  const items = readJson<GrowthLikeCandidate[]>(LIKE_CANDIDATES_FILE);
  return profileId ? items.filter((item) => item.profile_id === profileId) : items;
}

export function upsertLikeCandidates(candidates: GrowthLikeCandidate[]) {
  const items = readJson<GrowthLikeCandidate[]>(LIKE_CANDIDATES_FILE);
  const byKey = new Map(items.map((item) => [`${item.profile_id}:${item.account_id}:${item.note_id}`, item]));
  let inserted = 0;
  let updated = 0;

  for (const candidate of candidates) {
    const key = `${candidate.profile_id}:${candidate.account_id}:${candidate.note_id}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.reason = candidate.reason || existing.reason;
      existing.xsec_token = candidate.xsec_token || existing.xsec_token;
      existing.updated_at = now();
      updated += 1;
    } else {
      items.push(candidate);
      byKey.set(key, candidate);
      inserted += 1;
    }
  }

  writeJson(LIKE_CANDIDATES_FILE, items);
  return { inserted, updated, total: items.length, items };
}

export function makeStableId(prefix: string, value: string) {
  return `${prefix}_${crypto.createHash('sha1').update(value).digest('hex').slice(0, 16)}`;
}
