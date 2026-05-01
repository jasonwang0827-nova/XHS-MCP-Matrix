import { runMatrixDiscovery } from './interaction/matrix-discovery';

type Options = {
  accounts: string[];
  keyword: string;
  client_id?: string | null;
  limit_per_account: number;
  only_new: boolean;
  dry_run: boolean;
};

function parseArgs(argv: string[]): Options {
  const opts: Options = {
    accounts: ['all'],
    keyword: '加拿大留学',
    client_id: null,
    limit_per_account: 5,
    only_new: true,
    dry_run: true,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case '--accounts':
        opts.accounts = String(argv[++i] || 'all').split(',').map((item) => item.trim()).filter(Boolean);
        break;
      case '--keyword':
        opts.keyword = String(argv[++i] || '').trim();
        break;
      case '--client_id':
        opts.client_id = String(argv[++i] || '').trim() || null;
        break;
      case '--limit_per_account':
        opts.limit_per_account = Math.max(1, Math.floor(Number(argv[++i] || 5)));
        break;
      case '--only_new':
        opts.only_new = String(argv[++i] || 'true').toLowerCase() !== 'false';
        break;
      case '--dry_run':
        opts.dry_run = String(argv[++i] || 'true').toLowerCase() !== 'false';
        break;
      default:
        if (arg.startsWith('--')) throw new Error(`Unknown argument: ${arg}`);
        break;
    }
  }

  if (!opts.keyword) throw new Error('Missing --keyword');
  return opts;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const result = await runMatrixDiscovery(options);
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error?.message || String(error) }, null, 2));
  process.exit(1);
});
