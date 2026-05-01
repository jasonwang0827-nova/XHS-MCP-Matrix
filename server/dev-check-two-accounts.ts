import { accountTools } from './accounts/tools';

async function check(account_id: string) {
  const startedAt = Date.now();
  try {
    const result = await accountTools.check_xhs_account_login({ account_id });
    const text = result?.result?.content?.[0]?.text || '';
    return {
      account_id,
      elapsed_ms: Date.now() - startedAt,
      ok: true,
      success: result.success,
      text,
    };
  } catch (error: any) {
    return {
      account_id,
      elapsed_ms: Date.now() - startedAt,
      ok: false,
      error: error?.message || String(error),
    };
  }
}

async function main() {
  const accounts = process.argv.slice(2);
  const accountIds = accounts.length ? accounts : ['xhs_default', 'xhs_test_01'];
  const results = [];
  for (const accountId of accountIds) {
    results.push(await check(accountId));
  }
  console.log(JSON.stringify({ results }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
