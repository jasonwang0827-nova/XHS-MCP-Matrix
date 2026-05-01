import { runNextTask } from './runner';

export async function runSchedulerLoop(options: { intervalMs?: number; idleBackoffMs?: number } = {}) {
  const intervalMs = options.intervalMs ?? 5000;
  const idleBackoffMs = options.idleBackoffMs ?? 10000;

  let stopped = false;
  const stop = () => { stopped = true; };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);

  console.log(JSON.stringify({
    status: 'scheduler_loop_started',
    interval_ms: intervalMs,
    idle_backoff_ms: idleBackoffMs,
    started_at: new Date().toISOString(),
  }));

  while (!stopped) {
    try {
      const result = await runNextTask();
      console.log(JSON.stringify({
        ts: new Date().toISOString(),
        event: 'scheduler_tick',
        result,
      }));
      const sleepMs = result?.message === 'no_runnable_tasks' ? idleBackoffMs : intervalMs;
      await new Promise((resolve) => setTimeout(resolve, sleepMs));
    } catch (error: any) {
      console.error(JSON.stringify({
        ts: new Date().toISOString(),
        event: 'scheduler_error',
        error: error?.message || String(error),
      }));
      await new Promise((resolve) => setTimeout(resolve, idleBackoffMs));
    }
  }

  console.log(JSON.stringify({
    status: 'scheduler_loop_stopped',
    stopped_at: new Date().toISOString(),
  }));
}
