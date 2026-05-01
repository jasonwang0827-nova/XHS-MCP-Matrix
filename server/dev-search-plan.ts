import { createClientSearchPlan } from './business/search-plan';

async function main() {
  const [, , clientId, limit = '20'] = process.argv;
  if (!clientId) {
    console.error('Usage: npm run dev:search-plan -- <client_id> [limit_per_keyword]');
    process.exit(1);
  }
  const result = createClientSearchPlan({
    client_id: clientId,
    limit_per_keyword: Number(limit),
  });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
