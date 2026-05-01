import { getUpstreamClient } from './upstream/mcp-client';

async function main() {
  const client = getUpstreamClient();
  const tools = await client.listTools();
  console.log(JSON.stringify({ ok: true, tools }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
