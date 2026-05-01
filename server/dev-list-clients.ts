import { listClientProfiles } from './business/client-profiles';

async function main() {
  console.log(JSON.stringify({ ok: true, clients: listClientProfiles() }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
