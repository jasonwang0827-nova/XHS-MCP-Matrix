import { runDailyGrowthPlan } from './growth/planner';

function parseArgs(argv: string[]) {
  const opts = {
    profile_id: 'study_immigration_leads',
    dry_run: true,
    limit_per_keyword: 3,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case '--profile_id':
        opts.profile_id = String(argv[++i] || '').trim();
        break;
      case '--dry_run':
        opts.dry_run = String(argv[++i] || 'true').toLowerCase() !== 'false';
        break;
      case '--limit_per_keyword':
        opts.limit_per_keyword = Math.max(1, Math.floor(Number(argv[++i] || 3)));
        break;
      default:
        if (arg.startsWith('--')) throw new Error(`Unknown argument: ${arg}`);
        break;
    }
  }

  return opts;
}

async function main() {
  const result = await runDailyGrowthPlan(parseArgs(process.argv.slice(2)));
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error?.message || String(error) }, null, 2));
  process.exit(1);
});
