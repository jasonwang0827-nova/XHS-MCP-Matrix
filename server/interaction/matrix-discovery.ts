import fs from 'fs';
import path from 'path';
import { readAccounts } from '../accounts/store';
import { checkAccountLogin, startAccount } from '../accounts/runtime';
import { runSearch } from '../search/service';
import { SearchResponse } from '../search/types';
import { generateDiscoveryReport } from './discovery';

export type MatrixDiscoveryOptions = {
  accounts: string[];
  keyword: string;
  client_id?: string | null;
  limit_per_account: number;
  only_new: boolean;
  dry_run: boolean;
};

const MATRIX_REPORT_DIR = '/Users/jason/Nova/XHS-mcp/data/reports/discovery/matrix';

function now() {
  return new Date().toISOString();
}

function ensureReportDir() {
  fs.mkdirSync(MATRIX_REPORT_DIR, { recursive: true });
}

function expandAccounts(input: string[]) {
  const accounts = readAccounts().filter((account) => account.enabled);
  if (!input.length || input.includes('all')) return accounts.map((account) => account.account_id);
  return input;
}

function writeMatrixReport(report: any) {
  ensureReportDir();
  const date = new Date().toISOString().slice(0, 10);
  const file = path.join(MATRIX_REPORT_DIR, `${date}_${Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify(report, null, 2));
  return file;
}

function mergeSearchResponses(keyword: string, responses: SearchResponse[]): SearchResponse {
  const allResults = responses.flatMap((response) => response.results || []);
  const byNoteId = new Map<string, SearchResponse['results'][number]>();

  for (const item of allResults) {
    const existing = byNoteId.get(item.note_id);
    if (!existing) {
      byNoteId.set(item.note_id, item);
      continue;
    }
    existing.matched_accounts = Array.from(new Set([
      ...existing.matched_accounts,
      item.source_account_id,
      ...item.matched_accounts,
    ]));
  }

  return {
    ok: responses.some((response) => response.ok),
    keyword,
    searched_accounts: responses.flatMap((response) => response.searched_accounts || []),
    total_raw: responses.reduce((sum, response) => sum + response.total_raw, 0),
    total_unique: byNoteId.size,
    results: Array.from(byNoteId.values()),
  };
}

async function ensureAccountReadyForRead(accountId: string) {
  await startAccount(accountId);
  const login = await checkAccountLogin(accountId);
  const text = login?.result?.content?.[0]?.text || '';
  const loggedIn = login.success && text.includes('已登录');
  return {
    ok: loggedIn,
    login_text: text,
    error: loggedIn ? undefined : 'account_not_logged_in',
  };
}

export async function runMatrixDiscovery(options: MatrixDiscoveryOptions) {
  const accountIds = expandAccounts(options.accounts);
  const accountSet = new Set(readAccounts().map((account) => account.account_id));
  const unknownAccounts = accountIds.filter((accountId) => !accountSet.has(accountId));
  if (unknownAccounts.length) throw new Error(`unknown accounts: ${unknownAccounts.join(', ')}`);

  const planned = {
    ok: true,
    dry_run: options.dry_run,
    strategy: 'serial-per-account + one account failure does not stop matrix + discovery report',
    planned_at: now(),
    keyword: options.keyword,
    client_id: options.client_id || null,
    accounts: accountIds,
    limit_per_account: options.limit_per_account,
    only_new: options.only_new,
  };

  if (options.dry_run) return planned;

  const accountResults = [];
  const successfulSearches: SearchResponse[] = [];

  for (const accountId of accountIds) {
    try {
      const ready = await ensureAccountReadyForRead(accountId);
      if (!ready.ok) {
        accountResults.push({
          account_id: accountId,
          ok: false,
          skipped: true,
          error: ready.error,
          login_text: ready.login_text,
        });
        continue;
      }

      const search = await runSearch({
        keyword: options.keyword,
        account_ids: [accountId],
        limit_per_account: options.limit_per_account,
        dedupe: true,
      });
      successfulSearches.push(search);
      accountResults.push({
        account_id: accountId,
        ok: search.ok,
        total_raw: search.total_raw,
        total_unique: search.total_unique,
        searched_accounts: search.searched_accounts,
      });
    } catch (error: any) {
      accountResults.push({
        account_id: accountId,
        ok: false,
        error: error?.message || String(error),
      });
    }
  }

  const mergedSearch = mergeSearchResponses(options.keyword, successfulSearches);
  const discovery = mergedSearch.results.length
    ? generateDiscoveryReport({
        search_response: mergedSearch,
        client_id: options.client_id || null,
        only_new: options.only_new,
      })
    : null;

  const report = {
    ...planned,
    dry_run: false,
    finished_at: now(),
    account_results: accountResults,
    merged_search: {
      ok: mergedSearch.ok,
      total_raw: mergedSearch.total_raw,
      total_unique: mergedSearch.total_unique,
      searched_accounts: mergedSearch.searched_accounts,
    },
    discovery_summary: discovery?.summary || null,
    discovery_report_file: discovery?.report_file || null,
  };

  return {
    ...report,
    matrix_report_file: writeMatrixReport(report),
  };
}
