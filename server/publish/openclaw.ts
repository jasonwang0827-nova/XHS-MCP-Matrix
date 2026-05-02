import { enqueueTask } from '../scheduler/store';
import { runTaskById } from '../scheduler/runner';
import { generatePublishTaskFromContentPool, scanVideoFolderToContentPool } from './store';

export type OpenClawPublishInput = {
  account_id: string;
  source_dir?: string | null;
  archive_dir?: string | null;
  submit?: boolean;
  approved?: boolean;
  approval_required?: boolean;
  require_caption?: boolean;
  daily_limit?: number;
  min_interval_hours?: number;
  max_retry?: number;
  schedule_at?: string | null;
  scan_limit?: number;
  max_publish_count?: number;
  check_comments_after_minutes?: number | null;
  execute?: boolean;
};

export async function runOpenClawOneClickPublish(input: OpenClawPublishInput) {
  if (!input.account_id) throw new Error('account_id is required');

  const scan = scanVideoFolderToContentPool({
    account_id: input.account_id,
    source_dir: input.source_dir,
    archive_dir: input.archive_dir,
    submit: Boolean(input.submit),
    approved: input.approved ?? true,
    approval_required: input.approval_required ?? false,
    require_caption: input.require_caption ?? true,
    daily_limit: input.daily_limit ?? 1,
    min_interval_hours: input.min_interval_hours ?? 6,
    max_retry: input.max_retry ?? 2,
    schedule_at: input.schedule_at || null,
    limit: input.scan_limit,
    check_comments_after_minutes: input.check_comments_after_minutes ?? 60,
  });

  const maxPublishCount = Math.max(1, input.max_publish_count || 1);
  const execute = input.execute ?? true;
  const generatedTasks = [];
  const executedTasks = [];

  for (let i = 0; i < maxPublishCount; i += 1) {
    const task = generatePublishTaskFromContentPool();
    if (!task) break;
    enqueueTask(task);
    generatedTasks.push(task);
    if (!execute) continue;
    const result = await runTaskById(task.task_id);
    executedTasks.push(result);
  }

  return {
    ok: true,
    mode: execute ? 'scan_generate_execute' : 'scan_generate_only',
    account_id: input.account_id,
    source_dir: scan.source_dir,
    archive_dir: scan.archive_dir,
    imported_count: scan.count,
    skipped: scan.skipped,
    generated_count: generatedTasks.length,
    executed_count: executedTasks.length,
    generated_tasks: generatedTasks,
    executed_tasks: executedTasks,
  };
}
