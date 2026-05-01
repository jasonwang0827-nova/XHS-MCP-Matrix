import { readPublishRecords } from './publish/store';

const limit = Number(process.argv[2] || 20);
const accountId = process.argv[3] || null;
console.log(JSON.stringify(readPublishRecords(limit, accountId), null, 2));
