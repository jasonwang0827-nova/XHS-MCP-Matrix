import { createTask } from './scheduler/store';
import { MatrixTaskType } from './scheduler/types';

function usage() {
  console.error('Usage: npm run dev:enqueue-task -- <task_type> <account_id> [payload_json] [run_at_iso]');
  console.error('payload_json may include client_id, e.g. {"client_id":"client_b_private_care","content":"..."}');
  process.exit(1);
}

async function main() {
  const [, , type, accountId, payloadJson = '{}', runAt] = process.argv;
  if (!type || !accountId) usage();

  const payload = JSON.parse(payloadJson);
  const task = createTask({
    type: type as MatrixTaskType,
    account_id: accountId,
    client_id: payload.client_id || null,
    payload,
    run_at: runAt || null,
  });

  console.log(JSON.stringify({ ok: true, task }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
