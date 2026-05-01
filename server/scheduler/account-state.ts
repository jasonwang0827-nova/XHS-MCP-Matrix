import fs from 'fs';
import path from 'path';

const STATE_DIR = path.resolve('./data/jobs');
const STATE_FILE = path.join(STATE_DIR, 'account-states.json');

function ensureStore() {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  if (!fs.existsSync(STATE_FILE)) fs.writeFileSync(STATE_FILE, '{}');
}

export function readAccountStates(): Record<string, any> {
  ensureStore();
  return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
}

export function writeAccountStates(states: Record<string, any>) {
  ensureStore();
  fs.writeFileSync(STATE_FILE, JSON.stringify(states, null, 2));
}

export function getAccountState(accountId: string) {
  const states = readAccountStates();
  return states[accountId] || {
    account_id: accountId,
    platform: 'xiaohongshu',
    risk_state: 'healthy',
    paused: false,
    failure_count: 0,
  };
}

export function markAccountFailure(accountId: string, reason: string) {
  const states = readAccountStates();
  const current = getAccountState(accountId);
  current.failure_count = (current.failure_count || 0) + 1;
  current.last_failure_reason = reason;
  current.updated_at = new Date().toISOString();
  if (current.failure_count >= 3) {
    current.risk_state = 'paused';
    current.paused = true;
  }
  states[accountId] = current;
  writeAccountStates(states);
  return current;
}

export function clearAccountPause(accountId: string) {
  const states = readAccountStates();
  const current = getAccountState(accountId);
  current.risk_state = 'healthy';
  current.paused = false;
  current.failure_count = 0;
  current.updated_at = new Date().toISOString();
  states[accountId] = current;
  writeAccountStates(states);
  return current;
}
