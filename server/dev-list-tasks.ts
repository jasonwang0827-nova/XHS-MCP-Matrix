import { queryTasks } from './scheduler/store';
import { MatrixTaskStatus, MatrixTaskType } from './scheduler/types';

async function main() {
  const [, , status, type, accountId] = process.argv;
  const tasks = queryTasks({
    status: status as MatrixTaskStatus | undefined,
    type: type as MatrixTaskType | undefined,
    account_id: accountId || undefined,
  });
  console.log(JSON.stringify({ ok: true, count: tasks.length, tasks }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
