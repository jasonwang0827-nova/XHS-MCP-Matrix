import fs from 'fs';
import path from 'path';
import { MatrixTask, MatrixTaskStatus, MatrixTaskType } from './types';

const TASK_DIR = path.resolve('./data/jobs');
const TASK_FILE = path.join(TASK_DIR, 'tasks.json');

function ensureStore() {
  fs.mkdirSync(TASK_DIR, { recursive: true });
  if (!fs.existsSync(TASK_FILE)) fs.writeFileSync(TASK_FILE, '[]');
}

export function readTasks(): MatrixTask[] {
  ensureStore();
  return JSON.parse(fs.readFileSync(TASK_FILE, 'utf8'));
}

export function writeTasks(tasks: MatrixTask[]) {
  ensureStore();
  fs.writeFileSync(TASK_FILE, JSON.stringify(tasks, null, 2));
}

export function enqueueTask(task: MatrixTask) {
  const tasks = readTasks();
  tasks.push(task);
  writeTasks(tasks);
  return task;
}

export function createTask(input: {
  client_id?: string | null;
  account_id: string;
  type: MatrixTaskType;
  payload?: Record<string, any>;
  run_at?: string | null;
  status?: MatrixTaskStatus;
}) {
  const now = new Date().toISOString();
  return enqueueTask({
    task_id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    client_id: input.client_id || input.payload?.client_id || null,
    account_id: input.account_id,
    type: input.type,
    status: input.status || 'pending',
    payload: input.payload || {},
    created_at: now,
    updated_at: now,
    run_at: input.run_at ?? now,
  });
}

export function updateTask(taskId: string, patch: Partial<MatrixTask>) {
  const tasks = readTasks();
  const idx = tasks.findIndex((task) => task.task_id === taskId);
  if (idx === -1) return null;
  tasks[idx] = { ...tasks[idx], ...patch };
  writeTasks(tasks);
  return tasks[idx];
}

export function cancelTask(taskId: string) {
  return updateTask(taskId, { status: 'cancelled' });
}

export function isTaskDue(task: MatrixTask, now = new Date()) {
  if (!task.run_at) return true;
  const ts = new Date(task.run_at).getTime();
  if (Number.isNaN(ts)) return false;
  return ts <= now.getTime();
}

export function queryTasks(filter: {
  account_id?: string;
  type?: MatrixTaskType;
  status?: MatrixTaskStatus;
  created_at_gte?: string;
  created_at_lte?: string;
  updated_at_gte?: string;
  updated_at_lte?: string;
  run_at_gte?: string;
  run_at_lte?: string;
} = {}) {
  return readTasks().filter((task) => {
    if (filter.account_id && task.account_id !== filter.account_id) return false;
    if (filter.type && task.type !== filter.type) return false;
    if (filter.status && task.status !== filter.status) return false;
    if (filter.created_at_gte && task.created_at < filter.created_at_gte) return false;
    if (filter.created_at_lte && task.created_at > filter.created_at_lte) return false;
    if (filter.updated_at_gte && task.updated_at < filter.updated_at_gte) return false;
    if (filter.updated_at_lte && task.updated_at > filter.updated_at_lte) return false;
    if (filter.run_at_gte && (!task.run_at || task.run_at < filter.run_at_gte)) return false;
    if (filter.run_at_lte && (!task.run_at || task.run_at > filter.run_at_lte)) return false;
    return true;
  });
}
