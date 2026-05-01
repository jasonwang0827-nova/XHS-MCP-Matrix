import { toolRegistry } from '../tool-registry';
import { getClientProfile } from '../business/client-profiles';
import { checkContentSafety } from '../business/safety';
import { createReplySuggestion } from '../business/reply-draft';
import { getAccountState, markAccountFailure } from './account-state';
import { enqueueTask, isTaskDue, readTasks, writeTasks } from './store';
import { MatrixTask } from './types';
import { createPostPublishMonitorTask, generatePublishTaskFromContentPool, markPublishTaskResult } from '../publish/store';

function taskPriority(task: MatrixTask) {
  if (task.type === 'check_login_status') return 10;
  if (task.type === 'list_feeds') return 20;
  if (task.type === 'search_feeds') return 30;
  if (task.type === 'get_feed_detail') return 40;
  if (task.type === 'user_profile') return 50;
  if (task.type === 'like_feed' || task.type === 'favorite_feed') return 80;
  if (task.type === 'post_comment' || task.type === 'post_comment_to_feed') return 90;
  if (task.type === 'reply_comment' || task.type === 'reply_comment_in_feed') return 95;
  if (task.type === 'publish_content' || task.type === 'publish_with_video') return 100;
  return 999;
}

function selectNextPendingTask(tasks: MatrixTask[]) {
  const pending = tasks.filter((task) => task.status === 'pending' && isTaskDue(task));
  if (!pending.length) return null;

  const runningAccounts = new Set(tasks.filter((task) => task.status === 'running').map((task) => task.account_id));
  const eligible = pending.filter((task) => !runningAccounts.has(task.account_id));
  if (!eligible.length) return null;

  const notPaused = eligible.filter((task) => !getAccountState(task.account_id).paused);
  const pool = notPaused.length ? notPaused : eligible;

  pool.sort((a, b) => {
    const priority = taskPriority(a) - taskPriority(b);
    if (priority !== 0) return priority;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  return pool[0] || null;
}

async function executeTask(task: MatrixTask) {
  if (task.type === 'growth_follow_candidate') {
    return {
      success: true,
      status: 'approval_required',
      skipped_send: true,
      note: '当前上游 MCP 没有 follow_user 工具，此任务只记录关注候选，不自动关注。',
      candidate: task.payload?.candidate,
    };
  }

  if (
    task.type === 'like_feed' ||
    task.type === 'favorite_feed' ||
    task.type === 'post_comment' ||
    task.type === 'post_comment_to_feed' ||
    task.type === 'reply_comment' ||
    task.type === 'reply_comment_in_feed'
  ) {
    return {
      success: false,
      status: 'disabled_interaction',
      skipped_send: true,
      note: '平台互动动作已禁用。当前系统只做只读搜索、评论线索采集和报表导出。',
    };
  }

  if ((task.type === 'publish_content' || task.type === 'publish_with_video') && task.payload?.approval_required && task.payload?.approved !== true) {
    return {
      success: true,
      status: 'approval_required',
      skipped_send: true,
      note: '发布属于高风险动作，默认只生成待批准任务，不自动发布。',
      content_id: task.payload?.content_id,
    };
  }

  const policyResult = applyBusinessPolicy(task);
  if (policyResult) return policyResult;

  const tool = (toolRegistry as any)[task.type];
  if (!tool) throw new Error(`unsupported task type: ${task.type}`);
  return tool({ ...(task.payload || {}), account_id: task.account_id });
}

function applyBusinessPolicy(task: MatrixTask) {
  const clientId = task.client_id || task.payload?.client_id;
  const profile = getClientProfile(clientId);
  if (!profile) return null;

  if (task.type === 'publish_content' || task.type === 'publish_with_video') {
    const safety = checkContentSafety({
      client_id: profile.client_id,
      title: task.payload?.title,
      content: task.payload?.content,
      tags: task.payload?.tags,
    });
    if (!safety.ok) {
      return {
        success: false,
        status: 'blocked_by_content_safety',
        client_id: profile.client_id,
        safety,
      };
    }
  }

  const isCommentTask =
    task.type === 'post_comment' ||
    task.type === 'post_comment_to_feed' ||
    task.type === 'reply_comment' ||
    task.type === 'reply_comment_in_feed';

  if (isCommentTask && profile.comment_mode === 'draft_only_by_default' && task.payload?.auto_send !== true) {
    return {
      success: true,
      status: 'reply_draft_created',
      client_id: profile.client_id,
      skipped_send: true,
      suggestion: createReplySuggestion({
        client_id: profile.client_id,
        user_comment: task.payload?.source_comment || task.payload?.content || '',
        intent: task.payload?.intent,
        context: task.payload?.context,
      }),
    };
  }

  if (isCommentTask) {
    const safety = checkContentSafety({
      client_id: profile.client_id,
      comment: task.payload?.content,
    });
    if (!safety.ok) {
      return {
        success: false,
        status: 'blocked_by_comment_safety',
        client_id: profile.client_id,
        safety,
      };
    }
  }

  return null;
}

function isBusinessFailure(result: any) {
  return result?.success === false || result?.result?.isError === true;
}

function markPausedFailure(task: MatrixTask, tasks: MatrixTask[]) {
  task.status = 'failed';
  task.error = 'account_paused';
  task.account_state = getAccountState(task.account_id);
  task.updated_at = new Date().toISOString();
  writeTasks(tasks);
  return { ok: false, task, message: 'account_paused' };
}

export async function runNextTask() {
  const tasks = readTasks();
  const task = selectNextPendingTask(tasks);
  if (!task) {
    const generated = generatePublishTaskFromContentPool();
    if (!generated) return { ok: true, message: 'no_runnable_tasks' };
    enqueueTask(generated);
    return { ok: true, message: 'publish_task_generated', task: generated };
  }

  if (getAccountState(task.account_id).paused) return markPausedFailure(task, tasks);

  task.status = 'running';
  task.updated_at = new Date().toISOString();
  writeTasks(tasks);

  try {
    const result = await executeTask(task);
    task.result = result;
    task.updated_at = new Date().toISOString();

    if (isBusinessFailure(result)) {
      task.status = 'failed';
      task.error = result?.result?.content?.[0]?.text || 'business_failed';
      task.account_state = markAccountFailure(task.account_id, task.error || 'business_failed');
      if (task.type === 'publish_content' || task.type === 'publish_with_video') {
        markPublishTaskResult(task, result, false, task.error);
      }
      writeTasks(tasks);
      return { ok: false, task };
    }

    task.status = 'success';
    if (task.type === 'publish_content' || task.type === 'publish_with_video') {
      markPublishTaskResult(task, result, true, null);
      const monitorTask = createPostPublishMonitorTask(task, result);
      if (monitorTask) enqueueTask(monitorTask);
    }
    writeTasks(tasks);
    return { ok: true, task, strategy: 'serial-per-account + due-only + priority + FIFO' };
  } catch (error: any) {
    task.status = 'failed';
    task.error = error?.message || String(error);
    task.account_state = markAccountFailure(task.account_id, task.error || 'task_error');
    if (task.type === 'publish_content' || task.type === 'publish_with_video') {
      markPublishTaskResult(task, null, false, task.error);
    }
    task.updated_at = new Date().toISOString();
    writeTasks(tasks);
    return { ok: false, task };
  }
}

export async function runTaskById(taskId: string) {
  const tasks = readTasks();
  const task = tasks.find((candidate) => candidate.task_id === taskId);
  if (!task) return { ok: false, message: 'task_not_found', task_id: taskId };
  if (task.status !== 'pending') return { ok: false, message: 'task_not_pending', task_id: taskId, status: task.status };
  if (!isTaskDue(task)) return { ok: false, message: 'task_not_due', task_id: taskId, run_at: task.run_at };
  if (getAccountState(task.account_id).paused) return markPausedFailure(task, tasks);
  if (tasks.some((candidate) => candidate.status === 'running' && candidate.account_id === task.account_id)) {
    return { ok: false, message: 'account_busy', task_id: taskId, account_id: task.account_id };
  }

  task.status = 'running';
  task.updated_at = new Date().toISOString();
  writeTasks(tasks);

  try {
    const result = await executeTask(task);
    task.result = result;
    task.updated_at = new Date().toISOString();
    if (isBusinessFailure(result)) {
      task.status = 'failed';
      task.error = result?.result?.content?.[0]?.text || 'business_failed';
      task.account_state = markAccountFailure(task.account_id, task.error || 'business_failed');
      if (task.type === 'publish_content' || task.type === 'publish_with_video') {
        markPublishTaskResult(task, result, false, task.error);
      }
      writeTasks(tasks);
      return { ok: false, task };
    }
    task.status = 'success';
    if (task.type === 'publish_content' || task.type === 'publish_with_video') {
      markPublishTaskResult(task, result, true, null);
      const monitorTask = createPostPublishMonitorTask(task, result);
      if (monitorTask) enqueueTask(monitorTask);
    }
    writeTasks(tasks);
    return { ok: true, task };
  } catch (error: any) {
    task.status = 'failed';
    task.error = error?.message || String(error);
    task.account_state = markAccountFailure(task.account_id, task.error || 'task_error');
    if (task.type === 'publish_content' || task.type === 'publish_with_video') {
      markPublishTaskResult(task, null, false, task.error);
    }
    task.updated_at = new Date().toISOString();
    writeTasks(tasks);
    return { ok: false, task };
  }
}
