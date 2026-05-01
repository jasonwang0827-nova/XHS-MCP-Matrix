import { runNextTask } from './scheduler/runner';

async function main() {
  const result = await runNextTask();
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
