import { enqueueTask } from './scheduler/store';
import { generatePublishTaskFromContentPool } from './publish/store';

const task = generatePublishTaskFromContentPool();
if (task) enqueueTask(task);
console.log(JSON.stringify({ ok: true, task }, null, 2));
