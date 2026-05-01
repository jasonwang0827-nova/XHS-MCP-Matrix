import fs from 'fs';
import { upsertPublishContent } from './publish/store';

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

function split(value?: string) {
  return String(value || '').split(/[，,、\n]+/).map((item) => item.trim()).filter(Boolean);
}

const args = parseArgs(process.argv);
let input: any = {};

if (args.file) {
  input = JSON.parse(fs.readFileSync(args.file, 'utf8'));
} else {
  input = {
    type: args.type || (args.video_path ? 'video' : 'note'),
    title: args.title || '',
    content: args.content || '',
    tags: split(args.tags),
    image_paths: split(args.image_paths),
    video_path: args.video_path || null,
    target_accounts: split(args.accounts || args.target_accounts),
    schedule_at: args.schedule_at || null,
    submit: args.submit === 'true',
    approved: args.approved === 'true',
    approval_required: args.approval_required !== 'false',
    daily_limit: args.daily_limit ? Number(args.daily_limit) : 1,
    min_interval_hours: args.min_interval_hours ? Number(args.min_interval_hours) : 6,
  };
}

const item = upsertPublishContent(input);
console.log(JSON.stringify({ ok: true, item }, null, 2));
