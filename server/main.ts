import { createServer } from './transport';
import { startGrowthDailyLoop } from './growth/daily-loop';

async function main() {
  const server = createServer();
  await server.start();
  startGrowthDailyLoop();
}

main().catch((err) => {
  console.error('[xhs-mcp-matrix] fatal error:', err);
  process.exit(1);
});
