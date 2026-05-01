import { runTaskById } from './scheduler/runner';

async function main() {
  const taskId = process.argv[2];
  if (!taskId) {
    console.error('Usage: npm run dev:run-task-by-id -- <task_id>');
    process.exit(1);
  }
  const result = await runTaskById(taskId);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
