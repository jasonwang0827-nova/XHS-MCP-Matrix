import { createReplySuggestion } from './business/reply-draft';

async function main() {
  const [, , clientId, userComment, intent = 'neutral', context = ''] = process.argv;
  if (!clientId || !userComment) {
    console.error('Usage: npm run dev:reply-suggestion -- <client_id> <user_comment> [intent] [context]');
    process.exit(1);
  }
  const result = createReplySuggestion({
    client_id: clientId,
    user_comment: userComment,
    intent: intent as any,
    context,
  });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
