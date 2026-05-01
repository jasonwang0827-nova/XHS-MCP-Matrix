import { checkContentSafety } from './business/safety';

async function main() {
  const [, , clientId, title = '', content = '', tagsJson = '[]'] = process.argv;
  if (!clientId) {
    console.error('Usage: npm run dev:safety-check -- <client_id> [title] [content] [tags_json]');
    process.exit(1);
  }
  const tags = JSON.parse(tagsJson);
  const result = checkContentSafety({ client_id: clientId, title, content, tags });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
