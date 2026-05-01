import fs from 'fs';
import path from 'path';
import { listGrowthProfiles } from './store';
import { runDailyGrowthPlan } from './planner';

const STATE_FILE = '/Users/jason/Nova/XHS-mcp/data/growth/daily-run-state.json';

type DailyRunState = Record<string, string>;

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function minutesOfDay(value?: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value || '09:30');
  if (!match) return 9 * 60 + 30;
  return Math.min(23, Number(match[1])) * 60 + Math.min(59, Number(match[2]));
}

function currentMinutesOfDay() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function readState(): DailyRunState {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  if (!fs.existsSync(STATE_FILE)) fs.writeFileSync(STATE_FILE, '{}');
  return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) as DailyRunState;
}

function writeState(state: DailyRunState) {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

async function tick() {
  const today = todayKey();
  const state = readState();

  for (const profile of listGrowthProfiles()) {
    if (!profile.enabled) continue;
    if (!profile.auto_follow_enabled && !profile.auto_like_enabled) continue;
    if (state[profile.profile_id] === today) continue;
    if (currentMinutesOfDay() < minutesOfDay(profile.daily_run_time)) continue;

    await runDailyGrowthPlan({ profile_id: profile.profile_id, dry_run: false });
    state[profile.profile_id] = today;
    writeState(state);
  }
}

export function startGrowthDailyLoop() {
  void tick().catch((error) => console.error('[growth-daily-loop] tick failed:', error));
  const timer = setInterval(() => {
    void tick().catch((error) => console.error('[growth-daily-loop] tick failed:', error));
  }, 60_000);
  timer.unref?.();
  return timer;
}
