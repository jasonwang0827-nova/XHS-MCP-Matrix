import { accountTools } from './accounts/tools';

async function main() {
  const [, , account_id, display_name, port] = process.argv;
  if (!account_id) {
    throw new Error('usage: npm run dev:create-account -- <account_id> [display_name] [port]');
  }
  const result = await accountTools.create_xhs_account({
    account_id,
    display_name,
    port: port ? Number(port) : undefined,
  });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
