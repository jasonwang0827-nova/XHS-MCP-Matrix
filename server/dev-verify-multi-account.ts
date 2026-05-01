import { toolRegistry } from './tool-registry';

type FeedSummary = {
  id: string;
  title: string;
  author: string;
};

function parseFeeds(result: any): FeedSummary[] {
  const text = result?.result?.content?.[0]?.text;
  if (!text) return [];
  const parsed = JSON.parse(text);
  return (parsed.feeds || []).slice(0, 5).map((feed: any) => ({
    id: feed.id,
    title: feed.noteCard?.displayTitle || '',
    author: feed.noteCard?.user?.nickname || '',
  }));
}

async function verifyAccount(account_id: string, keyword: string) {
  const loginStarted = Date.now();
  const login = await toolRegistry.check_login_status({ account_id });
  const loginText = login?.result?.content?.[0]?.text || '';

  const searchStarted = Date.now();
  const search = await toolRegistry.search_feeds({ account_id, keyword });
  const feeds = parseFeeds(search);

  return {
    account_id,
    login_elapsed_ms: searchStarted - loginStarted,
    search_elapsed_ms: Date.now() - searchStarted,
    login_text: loginText,
    search_success: search.success,
    feed_count_sampled: feeds.length,
    feeds,
  };
}

async function main() {
  const keyword = process.argv[2] || '加拿大留学';
  const accountIds = process.argv.slice(3);
  const accounts = accountIds.length ? accountIds : ['xhs_default', 'xhs_test_01'];
  const results = [];

  for (const accountId of accounts) {
    try {
      results.push(await verifyAccount(accountId, keyword));
    } catch (error: any) {
      results.push({
        account_id: accountId,
        ok: false,
        error: error?.message || String(error),
      });
    }
  }

  console.log(JSON.stringify({ keyword, results }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
