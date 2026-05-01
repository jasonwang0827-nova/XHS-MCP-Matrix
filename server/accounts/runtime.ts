import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import net from 'net';
import { loadConfig } from '../config';
import { UpstreamMcpClient } from '../upstream/mcp-client';
import { ensureDefaultAccount, findAccount, readAccounts } from './store';
import { XhsAccount, XhsAccountRuntime } from './types';

const processes = new Map<string, ChildProcess>();
const startedAt = new Map<string, string>();
const lastErrors = new Map<string, string>();
const ACCOUNT_AUTH_TIMEOUT_MS = 15000;
const ACCOUNT_START_TIMEOUT_MS = 10000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function isPortReachable(port: number, host = '127.0.0.1') {
  return new Promise<boolean>((resolve) => {
    const socket = net.createConnection({ port, host });
    const done = (reachable: boolean) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(reachable);
    };
    socket.setTimeout(500);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
  });
}

async function runtimeFor(account: XhsAccount): Promise<XhsAccountRuntime> {
  const child = processes.get(account.account_id);
  const managed = Boolean(child && !child.killed && child.exitCode === null);
  const reachable = managed || await isPortReachable(account.port);
  return {
    account_id: account.account_id,
    running: reachable,
    managed,
    reachable,
    pid: child?.pid,
    port: account.port,
    mcp_url: account.mcp_url,
    started_at: startedAt.get(account.account_id),
    last_error: lastErrors.get(account.account_id),
  };
}

async function waitForMcpReady(account: XhsAccount, timeoutMs = ACCOUNT_START_TIMEOUT_MS) {
  const started = Date.now();
  let lastError: unknown = null;
  while (Date.now() - started < timeoutMs) {
    try {
      const client = new UpstreamMcpClient(account.mcp_url, 1500);
      await client.ping();
      return;
    } catch (error) {
      lastError = error;
      await sleep(350);
    }
  }
  throw new Error(`account ${account.account_id} did not become ready: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

export function listAccountRuntimes() {
  ensureDefaultAccount();
  return Promise.all(readAccounts().map(async (account) => ({
    ...account,
    runtime: await runtimeFor(account),
  })));
}

export async function startAccount(accountId?: string | null) {
  const config = loadConfig();
  const account = findAccount(accountId);
  if (!account) throw new Error(`unknown account: ${accountId || config.accounts.default_account_id}`);
  if (!account.enabled) throw new Error(`account disabled: ${account.account_id}`);

  const existing = processes.get(account.account_id);
  if (existing && existing.exitCode === null && !existing.killed) {
    return { ok: true, account, runtime: await runtimeFor(account), message: 'already_running_by_manager' };
  }

  if (await isPortReachable(account.port)) {
    await waitForMcpReady(account);
    return { ok: true, account, runtime: await runtimeFor(account), message: 'already_running_external' };
  }

  if (!fs.existsSync(config.accounts.binary_path)) {
    throw new Error(`xiaohongshu-mcp binary not found: ${config.accounts.binary_path}`);
  }
  fs.mkdirSync(account.work_dir, { recursive: true });

  const child = spawn(config.accounts.binary_path, ['-port', `:${account.port}`], {
    cwd: account.work_dir,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  processes.set(account.account_id, child);
  startedAt.set(account.account_id, new Date().toISOString());
  lastErrors.delete(account.account_id);

  child.stdout.on('data', (chunk) => {
    const text = chunk.toString().trim();
    if (text) console.log(`[xhs-upstream:${account.account_id}] ${text}`);
  });
  child.stderr.on('data', (chunk) => {
    const text = chunk.toString().trim();
    if (text) {
      lastErrors.set(account.account_id, text);
      console.error(`[xhs-upstream:${account.account_id}] ${text}`);
    }
  });
  child.on('exit', (code, signal) => {
    processes.delete(account.account_id);
    if (code !== 0 && signal !== 'SIGTERM') {
      lastErrors.set(account.account_id, `exited with code ${code}, signal ${signal || 'none'}`);
    }
  });

  await waitForMcpReady(account);
  return { ok: true, account, runtime: await runtimeFor(account), message: 'started' };
}

export async function stopAccount(accountId?: string | null) {
  const config = loadConfig();
  const account = findAccount(accountId);
  if (!account) throw new Error(`unknown account: ${accountId || config.accounts.default_account_id}`);
  const child = processes.get(account.account_id);
  if (!child || child.exitCode !== null || child.killed) {
    return { ok: true, account, runtime: await runtimeFor(account), message: 'not_running_by_manager' };
  }
  child.kill('SIGTERM');
  processes.delete(account.account_id);
  return { ok: true, account, runtime: await runtimeFor(account), message: 'stopped' };
}

export async function checkAccountLogin(accountId?: string | null) {
  const config = loadConfig();
  const account = findAccount(accountId);
  if (!account) throw new Error(`unknown account: ${accountId || config.accounts.default_account_id}`);
  const client = new UpstreamMcpClient(account.mcp_url, Math.min(config.upstream.timeout_ms, ACCOUNT_AUTH_TIMEOUT_MS));
  const result = await client.callTool('check_login_status', {});
  return {
    account_id: account.account_id,
    mcp_url: account.mcp_url,
    result,
    success: !result?.isError,
  };
}

export async function getAccountLoginQrCode(accountId?: string | null) {
  const config = loadConfig();
  const account = findAccount(accountId);
  if (!account) throw new Error(`unknown account: ${accountId || config.accounts.default_account_id}`);
  const client = new UpstreamMcpClient(account.mcp_url, Math.min(config.upstream.timeout_ms, ACCOUNT_AUTH_TIMEOUT_MS));
  const result = await client.callTool('get_login_qrcode', {});
  return {
    account_id: account.account_id,
    mcp_url: account.mcp_url,
    result,
    success: !result?.isError,
  };
}
