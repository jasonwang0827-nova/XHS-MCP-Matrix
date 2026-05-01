import { toolRegistry } from './tool-registry';

async function main() {
  const result = await toolRegistry.check_login_status({});
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
