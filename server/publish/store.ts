import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { MatrixTask } from '../scheduler/types';
import { PublishContentItem, PublishContentStatus, PublishContentType, PublishRecord } from './types';

const PUBLISH_DIR = '/Users/jason/Nova/XHS-mcp/data/publish';
const CONTENT_POOL_FILE = path.join(PUBLISH_DIR, 'content-pool.json');
const RECORDS_FILE = path.join(PUBLISH_DIR, 'publish-records.jsonl');
const LOG_FILE = path.join(PUBLISH_DIR, 'publish-log.jsonl');
const DEFAULT_ASSETS_DIR = path.join(PUBLISH_DIR, 'assets');
const VIDEO_EXTENSIONS = new Set(['.mp4', '.mov', '.m4v', '.webm']);

function now() {
  return new Date().toISOString();
}

function ensureStore() {
  fs.mkdirSync(PUBLISH_DIR, { recursive: true });
  fs.mkdirSync(DEFAULT_ASSETS_DIR, { recursive: true });
  if (!fs.existsSync(CONTENT_POOL_FILE)) fs.writeFileSync(CONTENT_POOL_FILE, '[]');
  if (!fs.existsSync(RECORDS_FILE)) fs.writeFileSync(RECORDS_FILE, '');
  if (!fs.existsSync(LOG_FILE)) fs.writeFileSync(LOG_FILE, '');
}

function stableId(input: string) {
  return crypto.createHash('sha1').update(input).digest('hex').slice(0, 16);
}

function compactText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function safeAccountId(accountId: string) {
  return compactText(accountId).replace(/[^a-zA-Z0-9_-]+/g, '_') || 'xhs_default';
}

export function getDefaultPublishDirs(accountId: string) {
  const id = safeAccountId(accountId);
  return {
    source_dir: path.join(DEFAULT_ASSETS_DIR, 'accounts', id, 'video-inbox'),
    archive_dir: path.join(DEFAULT_ASSETS_DIR, 'accounts', id, 'published'),
  };
}

function uniquePath(targetPath: string) {
  if (!fs.existsSync(targetPath)) return targetPath;
  const parsed = path.parse(targetPath);
  for (let i = 1; i < 1000; i += 1) {
    const candidate = path.join(parsed.dir, `${parsed.name}-${i}${parsed.ext}`);
    if (!fs.existsSync(candidate)) return candidate;
  }
  return path.join(parsed.dir, `${parsed.name}-${Date.now()}${parsed.ext}`);
}

function findCaptionForVideo(videoPath: string) {
  const parsed = path.parse(videoPath);
  const candidates = ['.json', '.md', '.txt'].map((ext) => path.join(parsed.dir, `${parsed.name}${ext}`));
  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

function parseCaptionFile(captionPath: string | null) {
  if (!captionPath) return { title: '', content: '', tags: [] as string[] };
  const raw = fs.readFileSync(captionPath, 'utf8').trim();
  if (!raw) return { title: '', content: '', tags: [] as string[] };

  if (captionPath.endsWith('.json')) {
    const parsed = JSON.parse(raw);
    return {
      title: compactText(parsed.title),
      content: compactText(parsed.content || parsed.body || parsed.text),
      tags: Array.isArray(parsed.tags)
        ? parsed.tags.map(compactText).filter(Boolean)
        : String(parsed.tags || '').split(/[，,、#\n]+/).map((item) => item.trim()).filter(Boolean),
    };
  }

  const lines = raw.split(/\r?\n/);
  const titleLine = lines.find((line) => /^标题[:：]/.test(line)) || lines[0] || '';
  const tagLine = lines.find((line) => /^标签[:：]/.test(line));
  const title = titleLine.replace(/^标题[:：]/, '').trim();
  const content = lines
    .filter((line, idx) => idx !== 0 || /^标题[:：]/.test(line))
    .filter((line) => !/^标题[:：]/.test(line) && !/^标签[:：]/.test(line))
    .join('\n')
    .trim();
  const tags = (tagLine || '')
    .replace(/^标签[:：]/, '')
    .split(/[，,、#\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  return { title, content: content || raw, tags };
}

export function readPublishContentPool(): PublishContentItem[] {
  ensureStore();
  const items = JSON.parse(fs.readFileSync(CONTENT_POOL_FILE, 'utf8')) as Partial<PublishContentItem>[];
  return items.map(normalizePublishContent);
}

export function writePublishContentPool(items: PublishContentItem[]) {
  ensureStore();
  fs.writeFileSync(CONTENT_POOL_FILE, JSON.stringify(items, null, 2));
}

export function normalizePublishContent(input: Partial<PublishContentItem>): PublishContentItem {
  const timestamp = now();
  const type: PublishContentType = input.type || (input.video_path ? 'video' : 'note');
  const title = compactText(input.title);
  const content = compactText(input.content);
  const seed = [
    title,
    content,
    input.video_path || '',
    (input.image_paths || []).join(','),
    (input.target_accounts || []).join(','),
  ].join('|');

  const item: PublishContentItem = {
    content_id: input.content_id || `xhs_content_${stableId(seed || timestamp)}`,
    type,
    title,
    content,
    tags: (input.tags || []).map(compactText).filter(Boolean),
    image_paths: input.image_paths || [],
    video_path: input.video_path || null,
    cover_path: input.cover_path || null,
    source_dir: input.source_dir || null,
    caption_path: input.caption_path || null,
    archive_dir: input.archive_dir || null,
    target_accounts: (input.target_accounts || []).map(compactText).filter(Boolean),
    client_id: input.client_id || null,
    growth_profile_id: input.growth_profile_id || null,
    schedule_at: input.schedule_at || null,
    submit: Boolean(input.submit),
    approval_required: input.approval_required ?? true,
    approved: Boolean(input.approved),
    daily_limit: input.daily_limit ?? 1,
    min_interval_hours: input.min_interval_hours ?? 6,
    max_retry: input.max_retry ?? 2,
    check_comments_after_minutes: input.check_comments_after_minutes ?? null,
    status: input.status || 'pending',
    published_accounts: input.published_accounts || [],
    failed_accounts: input.failed_accounts || [],
    retry_count_by_account: input.retry_count_by_account || {},
    last_error_by_account: input.last_error_by_account || {},
    published_at_by_account: input.published_at_by_account || {},
    queued_at_by_account: input.queued_at_by_account || {},
    created_at: input.created_at || timestamp,
    updated_at: timestamp,
  };
  updatePublishContentStatus(item);
  return item;
}

export function upsertPublishContent(input: Partial<PublishContentItem>) {
  const items = readPublishContentPool();
  const item = normalizePublishContent(input);
  const idx = items.findIndex((candidate) => candidate.content_id === item.content_id);
  if (idx >= 0) items[idx] = { ...items[idx], ...item, created_at: items[idx].created_at, updated_at: now() };
  else items.push(item);
  writePublishContentPool(items);
  return item;
}

export function approvePublishContent(contentId: string) {
  const items = readPublishContentPool();
  const item = items.find((candidate) => candidate.content_id === contentId);
  if (!item) return null;
  item.approved = true;
  item.approval_required = true;
  item.updated_at = now();
  writePublishContentPool(items);
  return item;
}

export function updatePublishContentStatus(item: PublishContentItem) {
  const allPublished = item.target_accounts.length > 0 && item.target_accounts.every((account) => item.published_accounts.includes(account));
  const allFailed = item.target_accounts.length > 0 && item.target_accounts.every((account) =>
    !item.published_accounts.includes(account) && (item.retry_count_by_account[account] || 0) >= item.max_retry
  );

  if (allPublished) item.status = 'completed';
  else if (allFailed) item.status = 'failed';
  else if (item.published_accounts.length > 0 || item.failed_accounts.length > 0 || Object.keys(item.retry_count_by_account).length > 0) item.status = 'partial';
  else item.status = item.status === 'skipped' ? 'skipped' : 'pending';
  item.updated_at = now();
}

function accountPublishedToday(items: PublishContentItem[], accountId: string, today: string) {
  return items.filter((item) => item.published_at_by_account?.[accountId]?.startsWith(today)).length;
}

function latestPublishedAt(items: PublishContentItem[], accountId: string) {
  const dates = items
    .map((item) => item.published_at_by_account?.[accountId])
    .filter(Boolean)
    .map((value) => new Date(value as string))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => b.getTime() - a.getTime());
  return dates[0] || null;
}

export function generatePublishTaskFromContentPool(): MatrixTask | null {
  const items = readPublishContentPool();
  const current = new Date();
  const today = current.toISOString().slice(0, 10);

  for (const item of items) {
    updatePublishContentStatus(item);
    if (item.status !== 'pending' && item.status !== 'partial') continue;
    if (!item.target_accounts.length) continue;

    for (const accountId of item.target_accounts) {
      if (item.published_accounts.includes(accountId)) continue;
      if (item.queued_at_by_account?.[accountId]) continue;
      if ((item.retry_count_by_account[accountId] || 0) >= item.max_retry) continue;
      if (accountPublishedToday(items, accountId, today) >= item.daily_limit) continue;

      const latest = latestPublishedAt(items, accountId);
      const diffHours = latest ? (current.getTime() - latest.getTime()) / 3_600_000 : Infinity;
      if (diffHours < item.min_interval_hours) continue;

      item.queued_at_by_account = item.queued_at_by_account || {};
      item.queued_at_by_account[accountId] = now();
      writePublishContentPool(items);
      const task: MatrixTask = {
        task_id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        account_id: accountId,
        type: item.type === 'video' ? 'publish_with_video' : 'publish_content',
        status: item.approval_required && !item.approved ? 'needs_approval' : 'pending',
        payload: buildPublishPayload(item, accountId),
        client_id: item.client_id || null,
        created_at: now(),
        updated_at: now(),
        run_at: now(),
      };
      return task;
    }
  }

  writePublishContentPool(items);
  return null;
}

function buildPublishPayload(item: PublishContentItem, accountId: string) {
  return {
    account_id: accountId,
    content_id: item.content_id,
    title: item.title,
    content: item.content,
    tags: item.tags,
    image_paths: item.image_paths || [],
    video_path: item.video_path || undefined,
    cover_path: item.cover_path || undefined,
    source_dir: item.source_dir || undefined,
    caption_path: item.caption_path || undefined,
    archive_dir: item.archive_dir || undefined,
    schedule_at: item.schedule_at || undefined,
    check_comments_after_minutes: item.check_comments_after_minutes || undefined,
    submit: Boolean(item.submit),
    approval_required: item.approval_required,
    approved: item.approved,
  };
}

export function scanVideoFolderToContentPool(input: {
  account_id: string;
  source_dir?: string | null;
  archive_dir?: string | null;
  submit?: boolean;
  approved?: boolean;
  approval_required?: boolean;
  daily_limit?: number;
  min_interval_hours?: number;
  max_retry?: number;
  schedule_at?: string | null;
  limit?: number;
  check_comments_after_minutes?: number | null;
  require_caption?: boolean;
}) {
  ensureStore();
  const defaultDirs = getDefaultPublishDirs(input.account_id);
  const sourceDir = path.resolve(input.source_dir || defaultDirs.source_dir);
  const archiveDir = path.resolve(input.archive_dir || defaultDirs.archive_dir);
  fs.mkdirSync(sourceDir, { recursive: true });
  fs.mkdirSync(archiveDir, { recursive: true });

  const existing = readPublishContentPool();
  const existingVideos = new Set(existing.map((item) => item.video_path).filter(Boolean));
  const files = fs.readdirSync(sourceDir)
    .filter((file) => VIDEO_EXTENSIONS.has(path.extname(file).toLowerCase()))
    .sort();
  const limit = input.limit && input.limit > 0 ? input.limit : files.length;
  const items: PublishContentItem[] = [];
  const skipped: Array<{ video_path: string; reason: string }> = [];

  for (const file of files.slice(0, limit)) {
    const videoPath = path.join(sourceDir, file);
    if (existingVideos.has(videoPath)) continue;

    const captionPath = findCaptionForVideo(videoPath);
    if (input.require_caption && !captionPath) {
      skipped.push({ video_path: videoPath, reason: 'caption_not_found' });
      continue;
    }
    const caption = parseCaptionFile(captionPath);
    const title = caption.title || path.parse(file).name;
    const content = caption.content || title;
    const item = upsertPublishContent({
      type: 'video',
      title,
      content,
      tags: caption.tags,
      video_path: videoPath,
      source_dir: sourceDir,
      caption_path: captionPath,
      archive_dir: archiveDir,
      target_accounts: [input.account_id],
      schedule_at: input.schedule_at || null,
      submit: Boolean(input.submit),
      approval_required: input.approval_required ?? false,
      approved: input.approved ?? true,
      daily_limit: input.daily_limit ?? 1,
      min_interval_hours: input.min_interval_hours ?? 6,
      max_retry: input.max_retry ?? 2,
      check_comments_after_minutes: input.check_comments_after_minutes ?? 60,
    });
    existingVideos.add(videoPath);
    items.push(item);
  }

  return { source_dir: sourceDir, archive_dir: archiveDir, count: items.length, skipped, items };
}

function archivePublishedAssets(item: PublishContentItem) {
  if (!item.archive_dir || !item.video_path || !fs.existsSync(item.video_path)) return null;
  fs.mkdirSync(item.archive_dir, { recursive: true });
  const videoTarget = uniquePath(path.join(item.archive_dir, path.basename(item.video_path)));
  fs.renameSync(item.video_path, videoTarget);
  const moved: Record<string, string> = { video_path: videoTarget };

  if (item.caption_path && fs.existsSync(item.caption_path)) {
    const captionTarget = uniquePath(path.join(item.archive_dir, path.basename(item.caption_path)));
    fs.renameSync(item.caption_path, captionTarget);
    moved.caption_path = captionTarget;
    item.caption_path = captionTarget;
  }

  item.video_path = videoTarget;
  return moved;
}

function findNestedValue(input: any, keys: string[]): string | null {
  if (!input || typeof input !== 'object') return null;
  for (const key of keys) {
    const value = input[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  for (const value of Object.values(input)) {
    const found = findNestedValue(value, keys);
    if (found) return found;
  }
  return null;
}

export function createPostPublishMonitorTask(task: MatrixTask, result: any): MatrixTask | null {
  const noteId = findNestedValue(result, ['note_id', 'noteId', 'feed_id', 'feedId', 'id']);
  if (!noteId) return null;
  const minutes = Number(task.payload?.check_comments_after_minutes || 60);
  const runAt = new Date(Date.now() + Math.max(1, minutes) * 60_000).toISOString();
  const current = now();
  return {
    task_id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    account_id: task.account_id,
    type: 'get_feed_detail',
    status: 'pending',
    payload: {
      account_id: task.account_id,
      note_id: noteId,
      source_publish_task_id: task.task_id,
      source_content_id: task.payload?.content_id,
      purpose: 'post_publish_comment_check',
    },
    client_id: task.client_id || null,
    created_at: current,
    updated_at: current,
    run_at: runAt,
  };
}

export function markPublishTaskResult(task: MatrixTask, result: any, success: boolean, error?: string | null) {
  const contentId = task.payload?.content_id;
  if (!contentId) return;

  const items = readPublishContentPool();
  const item = items.find((candidate) => candidate.content_id === contentId);
  if (!item) return;

  const accountId = task.account_id;
  item.published_accounts = item.published_accounts || [];
  item.failed_accounts = item.failed_accounts || [];
  item.retry_count_by_account = item.retry_count_by_account || {};
  item.last_error_by_account = item.last_error_by_account || {};
  item.published_at_by_account = item.published_at_by_account || {};
  item.queued_at_by_account = item.queued_at_by_account || {};

  if (success) {
    const archived = archivePublishedAssets(item);
    if (!item.published_accounts.includes(accountId)) item.published_accounts.push(accountId);
    item.failed_accounts = item.failed_accounts.filter((candidate) => candidate !== accountId);
    item.published_at_by_account[accountId] = now();
    delete item.queued_at_by_account[accountId];
    delete item.last_error_by_account[accountId];
    if (archived) {
      result = { ...(result || {}), archived_assets: archived };
    }
  } else {
    if (!item.failed_accounts.includes(accountId)) item.failed_accounts.push(accountId);
    item.retry_count_by_account[accountId] = (item.retry_count_by_account[accountId] || 0) + 1;
    item.last_error_by_account[accountId] = error || result?.status || 'publish_failed';
    delete item.queued_at_by_account[accountId];
  }

  updatePublishContentStatus(item);
  writePublishContentPool(items);
  appendPublishRecord({
    ts: now(),
    account_id: accountId,
    content_id: item.content_id,
    type: item.type,
    title: item.title,
    submitted: Boolean(item.submit),
    status: success ? 'success' : 'failed',
    result,
    error: error || null,
  });
}

export function appendPublishRecord(record: PublishRecord) {
  ensureStore();
  fs.appendFileSync(RECORDS_FILE, JSON.stringify(record) + '\n');
  fs.appendFileSync(LOG_FILE, JSON.stringify({ ...record, log_type: 'publish_result' }) + '\n');
}

export function readPublishRecords(limit = 50, accountId?: string | null) {
  ensureStore();
  const lines = fs.readFileSync(RECORDS_FILE, 'utf8').split('\n').filter(Boolean);
  const items = lines.map((line) => {
    try { return JSON.parse(line) as PublishRecord; } catch { return { ts: '', account_id: '', type: 'note', status: 'parse_error', submitted: false, result: line } as PublishRecord; }
  }).filter((item) => !accountId || item.account_id === accountId);
  return {
    records_file: RECORDS_FILE,
    items: items.slice(-limit),
  };
}
