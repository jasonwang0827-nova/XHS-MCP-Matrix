import fs from 'fs';
import path from 'path';
import { loadConfig } from '../config';
import { XhsAccount } from './types';

function now() {
  return new Date().toISOString();
}

export function getAccountsDir() {
  const config = loadConfig();
  return path.resolve(config.accounts.data_dir);
}

export function getAccountsFile() {
  return path.join(getAccountsDir(), 'accounts.json');
}

export function ensureAccountsDir() {
  fs.mkdirSync(getAccountsDir(), { recursive: true });
}

export function getAccountWorkDir(accountId: string) {
  return path.join(getAccountsDir(), accountId);
}

export function readAccounts(): XhsAccount[] {
  ensureAccountsDir();
  const file = getAccountsFile();
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function writeAccounts(accounts: XhsAccount[]) {
  ensureAccountsDir();
  fs.writeFileSync(getAccountsFile(), JSON.stringify(accounts, null, 2));
}

export function findAccount(accountId?: string | null) {
  const config = loadConfig();
  const id = accountId || config.accounts.default_account_id;
  return readAccounts().find((account) => account.account_id === id) || null;
}

export function ensureDefaultAccount() {
  const config = loadConfig();
  const accounts = readAccounts();
  const existing = accounts.find((account) => account.account_id === config.accounts.default_account_id);
  if (existing) return existing;

  const account: XhsAccount = {
    account_id: config.accounts.default_account_id,
    display_name: '默认小红书账号',
    port: config.accounts.base_port,
    mcp_url: config.upstream.url,
    work_dir: '/Users/jason/AI_Workspace/xiaohongshu-mcp',
    enabled: true,
    created_at: now(),
    updated_at: now(),
    notes: '当前已登录的本地 xiaohongshu-mcp 实例',
  };
  accounts.push(account);
  writeAccounts(accounts);
  return account;
}

export function nextAvailablePort(accounts: XhsAccount[]) {
  const config = loadConfig();
  const used = new Set(accounts.map((account) => account.port));
  let port = config.accounts.base_port;
  while (used.has(port)) port += 1;
  return port;
}

export function createAccount(input: {
  account_id: string;
  display_name?: string;
  port?: number;
  notes?: string;
}) {
  ensureDefaultAccount();
  const accounts = readAccounts();
  if (!/^[a-zA-Z0-9_-]+$/.test(input.account_id)) {
    throw new Error('account_id only supports letters, numbers, underscore, and dash');
  }
  if (accounts.some((account) => account.account_id === input.account_id)) {
    throw new Error(`account already exists: ${input.account_id}`);
  }

  const config = loadConfig();
  const port = input.port || nextAvailablePort(accounts);
  if (accounts.some((account) => account.port === port)) throw new Error(`port already used: ${port}`);
  const workDir = getAccountWorkDir(input.account_id);
  fs.mkdirSync(workDir, { recursive: true });

  const account: XhsAccount = {
    account_id: input.account_id,
    display_name: input.display_name || input.account_id,
    port,
    mcp_url: `http://${config.accounts.host}:${port}/mcp`,
    work_dir: workDir,
    enabled: true,
    created_at: now(),
    updated_at: now(),
    notes: input.notes,
  };

  accounts.push(account);
  writeAccounts(accounts);
  return account;
}
