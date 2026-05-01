import http from 'http';
import { loadConfig } from './config';
import { toolNames, toolRegistry } from './tool-registry';
import { renderAdminPage } from './admin-page';
import { renderSearchPage } from './search-page';
import { renderLeadsPage } from './leads-page';
import { renderGrowthPage } from './growth-page';
import { renderPublishPage } from './publish-page';
import { createAccount, ensureDefaultAccount } from './accounts/store';
import { checkAccountLogin, getAccountLoginQrCode, listAccountRuntimes, startAccount, stopAccount } from './accounts/runtime';
import { runSearch, saveSearchResponse } from './search/service';
import { getFeedDetail } from './feed-detail/service';
import { listLeads } from './leads/store';
import { generateDiscoveryReport } from './interaction/discovery';
import { generateCommentLeadReport } from './interaction/comment-discovery';
import { listGrowthCandidates, listGrowthProfiles, listLikeCandidates, saveGrowthProfile } from './growth/store';
import { runDailyGrowthPlan } from './growth/planner';
import { approvePublishContent, generatePublishTaskFromContentPool, readPublishContentPool, readPublishRecords, scanVideoFolderToContentPool, upsertPublishContent } from './publish/store';
import { runOpenClawOneClickPublish } from './publish/openclaw';
import { enqueueTask, queryTasks, updateTask } from './scheduler/store';
import { createCommentReplyDraft, replyToComment } from './comment-actions/service';
import { generateLeadProfileSummary } from './lead-summary/service';

async function readJsonBody(req: http.IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

export function createServer() {
  const config = loadConfig();
  ensureDefaultAccount();

  return {
    async start() {
      const server = http.createServer(async (req, res) => {
        const url = new URL(req.url || '/', `http://${req.headers.host || '127.0.0.1'}`);

        if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/admin')) {
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.end(renderAdminPage());
          return;
        }

        if (req.method === 'GET' && url.pathname === '/search') {
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.end(renderSearchPage());
          return;
        }

        if (req.method === 'GET' && url.pathname === '/leads') {
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.end(renderLeadsPage());
          return;
        }

        if (req.method === 'GET' && url.pathname === '/growth') {
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.end(renderGrowthPage());
          return;
        }

        if (req.method === 'GET' && url.pathname === '/publish') {
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.end(renderPublishPage());
          return;
        }

        res.setHeader('Content-Type', 'application/json; charset=utf-8');

        if (req.method === 'GET' && url.pathname === '/health') {
          res.end(JSON.stringify({
            ok: true,
            service: 'xhs-mcp-matrix',
            upstream: config.upstream.url,
            admin: `http://${config.server.host}:${config.server.port}/admin`,
            tools: toolNames,
          }));
          return;
        }

        if (req.method === 'GET' && url.pathname === '/api/accounts') {
          res.end(JSON.stringify({ accounts: await listAccountRuntimes() }));
          return;
        }

        if (req.method === 'POST' && url.pathname === '/api/search') {
          try {
            const body = await readJsonBody(req);
            const result = await runSearch(body);
            res.end(JSON.stringify(result));
          } catch (error: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ ok: false, error: error?.message || String(error) }));
          }
          return;
        }

        if (req.method === 'POST' && url.pathname === '/api/search/save') {
          try {
            const body = await readJsonBody(req);
            const savedFile = saveSearchResponse(body);
            res.end(JSON.stringify({ ok: true, saved_file: savedFile }));
          } catch (error: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ ok: false, error: error?.message || String(error) }));
          }
          return;
        }

        if (req.method === 'POST' && url.pathname === '/api/feed-detail') {
          try {
            const body = await readJsonBody(req);
            const result = await getFeedDetail(body);
            res.end(JSON.stringify(result));
          } catch (error: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ ok: false, error: error?.message || String(error) }));
          }
          return;
        }

        if (req.method === 'POST' && url.pathname === '/api/search/discovery-report') {
          try {
            const body = await readJsonBody(req);
            const report = generateDiscoveryReport(body);
            res.end(JSON.stringify(report));
          } catch (error: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ ok: false, error: error?.message || String(error) }));
          }
          return;
        }

        if (req.method === 'POST' && url.pathname === '/api/search/comment-leads') {
          try {
            const body = await readJsonBody(req);
            const report = await generateCommentLeadReport(body);
            res.end(JSON.stringify(report));
          } catch (error: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ ok: false, error: error?.message || String(error) }));
          }
          return;
        }

        if (req.method === 'POST' && url.pathname === '/api/comments/reply-draft') {
          try {
            const body = await readJsonBody(req);
            res.end(JSON.stringify(createCommentReplyDraft(body)));
          } catch (error: any) {
            res.statusCode = 400;
            res.end(JSON.stringify({ ok: false, error: error?.message || String(error) }));
          }
          return;
        }

        if (req.method === 'POST' && url.pathname === '/api/comments/reply') {
          try {
            const body = await readJsonBody(req);
            const result = await replyToComment(body);
            res.statusCode = result.ok ? 200 : 400;
            res.end(JSON.stringify(result));
          } catch (error: any) {
            res.statusCode = 400;
            res.end(JSON.stringify({ ok: false, error: error?.message || String(error) }));
          }
          return;
        }

        if (req.method === 'POST' && url.pathname === '/api/leads/profile-summary') {
          try {
            const body = await readJsonBody(req);
            const report = await generateLeadProfileSummary(body);
            res.end(JSON.stringify(report));
          } catch (error: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ ok: false, error: error?.message || String(error) }));
          }
          return;
        }

        if (req.method === 'GET' && url.pathname === '/api/leads') {
          res.end(JSON.stringify({
            ok: true,
            profiles: listGrowthProfiles(),
            leads: listLeads({
              growth_profile_id: url.searchParams.get('growth_profile_id'),
              account_id: url.searchParams.get('account_id'),
            }),
          }));
          return;
        }

        if (req.method === 'GET' && url.pathname === '/api/growth') {
          res.end(JSON.stringify({
            ok: true,
            profiles: listGrowthProfiles(),
            candidates: listGrowthCandidates(),
            like_candidates: listLikeCandidates(),
          }));
          return;
        }

        if (req.method === 'GET' && url.pathname === '/api/publish/content-pool') {
          res.end(JSON.stringify({ ok: true, items: readPublishContentPool() }));
          return;
        }

        if (req.method === 'POST' && url.pathname === '/api/publish/content-pool') {
          try {
            const body = await readJsonBody(req);
            const item = upsertPublishContent(body);
            res.end(JSON.stringify({ ok: true, item }));
          } catch (error: any) {
            res.statusCode = 400;
            res.end(JSON.stringify({ ok: false, error: error?.message || String(error) }));
          }
          return;
        }

        if (req.method === 'POST' && url.pathname === '/api/publish/scan-video-folder') {
          try {
            const body = await readJsonBody(req);
            const result = scanVideoFolderToContentPool(body);
            res.end(JSON.stringify({ ok: true, ...result }));
          } catch (error: any) {
            res.statusCode = 400;
            res.end(JSON.stringify({ ok: false, error: error?.message || String(error) }));
          }
          return;
        }

        if (req.method === 'POST' && url.pathname === '/api/openclaw/publish-video') {
          try {
            const body = await readJsonBody(req);
            const result = await runOpenClawOneClickPublish(body);
            res.end(JSON.stringify(result));
          } catch (error: any) {
            res.statusCode = 400;
            res.end(JSON.stringify({ ok: false, error: error?.message || String(error) }));
          }
          return;
        }

        const publishContentApproveMatch = url.pathname.match(/^\/api\/publish\/content-pool\/([^/]+)\/approve$/);
        if (req.method === 'POST' && publishContentApproveMatch) {
          const item = approvePublishContent(decodeURIComponent(publishContentApproveMatch[1]));
          if (!item) {
            res.statusCode = 404;
            res.end(JSON.stringify({ ok: false, error: 'content_not_found' }));
            return;
          }
          res.end(JSON.stringify({ ok: true, item }));
          return;
        }

        if (req.method === 'POST' && url.pathname === '/api/publish/generate-task') {
          const task = generatePublishTaskFromContentPool();
          if (task) enqueueTask(task);
          res.end(JSON.stringify({ ok: true, task }));
          return;
        }

        if (req.method === 'GET' && url.pathname === '/api/publish/tasks') {
          const accountId = url.searchParams.get('account_id') || undefined;
          const tasks = queryTasks({ account_id: accountId }).filter((task) =>
            task.type === 'publish_content' || task.type === 'publish_with_video'
          );
          res.end(JSON.stringify({ ok: true, tasks }));
          return;
        }

        const publishTaskApproveMatch = url.pathname.match(/^\/api\/publish\/tasks\/([^/]+)\/approve$/);
        if (req.method === 'POST' && publishTaskApproveMatch) {
          const taskId = decodeURIComponent(publishTaskApproveMatch[1]);
          const tasks = queryTasks();
          const task = tasks.find((candidate) => candidate.task_id === taskId);
          if (!task || (task.type !== 'publish_content' && task.type !== 'publish_with_video')) {
            res.statusCode = 404;
            res.end(JSON.stringify({ ok: false, error: 'publish_task_not_found' }));
            return;
          }
          const updated = updateTask(taskId, {
            status: 'pending',
            payload: { ...task.payload, approval_required: true, approved: true },
            updated_at: new Date().toISOString(),
          });
          res.end(JSON.stringify({ ok: true, task: updated }));
          return;
        }

        if (req.method === 'GET' && url.pathname === '/api/publish/records') {
          res.end(JSON.stringify({
            ok: true,
            ...readPublishRecords(Number(url.searchParams.get('limit') || 50), url.searchParams.get('account_id')),
          }));
          return;
        }

        if (req.method === 'POST' && url.pathname === '/api/growth/profiles') {
          try {
            const body = await readJsonBody(req);
            const profile = saveGrowthProfile(body);
            res.end(JSON.stringify({ ok: true, profile }));
          } catch (error: any) {
            res.statusCode = 400;
            res.end(JSON.stringify({ ok: false, error: error?.message || String(error) }));
          }
          return;
        }

        if (req.method === 'POST' && url.pathname === '/api/growth/run-daily') {
          try {
            const body = await readJsonBody(req);
            const result = await runDailyGrowthPlan(body);
            res.end(JSON.stringify(result));
          } catch (error: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ ok: false, error: error?.message || String(error) }));
          }
          return;
        }

        if (req.method === 'POST' && url.pathname === '/api/accounts') {
          try {
            const body = await readJsonBody(req);
            const account = createAccount(body);
            res.end(JSON.stringify({ ok: true, account }));
          } catch (error: any) {
            res.statusCode = 400;
            res.end(JSON.stringify({ ok: false, error: error?.message || String(error) }));
          }
          return;
        }

        const accountActionMatch = url.pathname.match(/^\/api\/accounts\/([^/]+)\/(start|stop|login-status|login-qrcode)$/);
        if (req.method === 'POST' && accountActionMatch) {
          const [, accountId, action] = accountActionMatch;
          try {
            const result =
              action === 'start' ? await startAccount(accountId) :
              action === 'stop' ? await stopAccount(accountId) :
              action === 'login-status' ? await checkAccountLogin(accountId) :
              await getAccountLoginQrCode(accountId);
            res.end(JSON.stringify(result));
          } catch (error: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ ok: false, error: error?.message || String(error) }));
          }
          return;
        }

        if (req.method === 'GET' && url.pathname === '/tools') {
          res.end(JSON.stringify({ tools: toolNames }));
          return;
        }

        if (req.method === 'POST' && url.pathname === '/tools/call') {
          const body = await readJsonBody(req);
          const name = body.name;
          const args = body.arguments || {};
          const tool = (toolRegistry as any)[name];
          if (!tool) {
            res.statusCode = 404;
            res.end(JSON.stringify({ ok: false, error: `unknown tool: ${name}` }));
            return;
          }

          try {
            const result = await tool(args);
            res.end(JSON.stringify({ ok: true, name, result }));
          } catch (error: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ ok: false, name, error: error?.message || String(error) }));
          }
          return;
        }

        res.statusCode = 404;
        res.end(JSON.stringify({ ok: false, error: 'not_found' }));
      });

      await new Promise<void>((resolve) => {
        server.listen(config.server.port, config.server.host, () => {
          console.log(`[xhs-mcp-matrix] listening on http://${config.server.host}:${config.server.port}`);
          console.log(`[xhs-mcp-matrix] upstream ${config.upstream.url}`);
          resolve();
        });
      });
    },
  };
}
