import { runSchedulerLoop } from './scheduler/loop';

async function main() {
  const intervalMs = process.env.INTERVAL_MS ? Number(process.env.INTERVAL_MS) : undefined;
  const idleBackoffMs = process.env.IDLE_BACKOFF_MS ? Number(process.env.IDLE_BACKOFF_MS) : undefined;
  await runSchedulerLoop({ intervalMs, idleBackoffMs });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
