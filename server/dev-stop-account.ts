import { accountTools } from './accounts/tools';

async function main() {
  const account_id = process.argv[2];
  const result = await accountTools.stop_xhs_account({ account_id });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
