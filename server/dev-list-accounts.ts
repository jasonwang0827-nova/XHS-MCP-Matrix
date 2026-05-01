import { accountTools } from './accounts/tools';

async function main() {
  const result = await accountTools.list_xhs_accounts();
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
