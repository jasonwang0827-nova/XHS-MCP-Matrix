import { scanVideoFolderToContentPool } from './publish/store';

function parseArgs(argv: string[]) {
  const args: Record<string, string> = {};
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith('--')) continue;
    args[key.slice(2)] = argv[i + 1] || '';
    i += 1;
  }
  return args;
}

const args = parseArgs(process.argv);
const accountId = args.account || args.account_id || 'xhs_default';

const result = scanVideoFolderToContentPool({
  account_id: accountId,
  source_dir: args.source_dir,
  archive_dir: args.archive_dir,
  submit: args.submit === 'true',
  approved: args.approved !== 'false',
  approval_required: args.approval_required === 'true',
  daily_limit: args.daily_limit ? Number(args.daily_limit) : 1,
  min_interval_hours: args.min_interval_hours ? Number(args.min_interval_hours) : 6,
  max_retry: args.max_retry ? Number(args.max_retry) : 2,
  limit: args.limit ? Number(args.limit) : undefined,
  check_comments_after_minutes: args.check_comments_after_minutes ? Number(args.check_comments_after_minutes) : 60,
});

console.log(JSON.stringify({ ok: true, ...result }, null, 2));
