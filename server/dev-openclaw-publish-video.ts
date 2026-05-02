import { runOpenClawOneClickPublish } from './publish/openclaw';

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

function boolArg(value: string | undefined, fallback: boolean) {
  if (value === undefined) return fallback;
  return value === 'true';
}

async function main() {
  const args = parseArgs(process.argv);
  const result = await runOpenClawOneClickPublish({
    account_id: args.account || args.account_id || 'xhs_default',
    source_dir: args.source_dir,
    archive_dir: args.archive_dir,
    submit: boolArg(args.submit, false),
    approved: boolArg(args.approved, true),
    approval_required: boolArg(args.approval_required, false),
    require_caption: boolArg(args.require_caption, true),
    daily_limit: args.daily_limit ? Number(args.daily_limit) : 1,
    min_interval_hours: args.min_interval_hours ? Number(args.min_interval_hours) : 6,
    max_retry: args.max_retry ? Number(args.max_retry) : 2,
    schedule_at: args.schedule_at || null,
    scan_limit: args.scan_limit ? Number(args.scan_limit) : undefined,
    max_publish_count: args.max_publish_count ? Number(args.max_publish_count) : 1,
    check_comments_after_minutes: args.check_comments_after_minutes ? Number(args.check_comments_after_minutes) : 60,
    execute: boolArg(args.execute, true),
  });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
