import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createReplySuggestion } from '../business/reply-draft';
import { SearchResponse, SearchResultItem } from '../search/types';
import { LeadItem } from '../leads/types';
import { upsertLeads } from '../leads/store';
import { evaluateSearchItem } from './rules';
import { syncSignatures } from './state';

const REPORT_DIR = '/Users/jason/Nova/XHS-mcp/data/reports/discovery';

export type DiscoveryRequest = {
  search_response: SearchResponse;
  client_id?: string | null;
  growth_profile_id?: string | null;
  only_new?: boolean;
};

function makeSignature(item: SearchResultItem) {
  return `xhs_note:${item.note_id}`;
}

function makeLeadId(signature: string) {
  const hash = crypto.createHash('sha1').update(signature).digest('hex').slice(0, 16);
  return `note_${hash}`;
}

function toLead(item: SearchResultItem, clientId?: string | null, growthProfileId?: string | null): LeadItem | null {
  const leadResult = evaluateSearchItem(item, clientId);
  if (leadResult.lead_level === 'negative') return null;
  if (!leadResult.need_follow_up && leadResult.matched_keywords.length === 0) return null;

  const now = new Date().toISOString();
  const signature = makeSignature(item);
  return {
    lead_id: makeLeadId(signature),
    source: 'note_search',
    platform: 'xiaohongshu',
    account_id: item.source_account_id,
    client_id: clientId || null,
    growth_profile_id: growthProfileId || null,
    keyword: item.keyword,
    note_id: item.note_id,
    title: item.title || '无标题',
    author_name: item.author_name || '未知',
    author_id: item.author_id || '',
    url: item.url,
    matched_accounts: item.matched_accounts || [item.source_account_id],
    signature,
    lead_result: leadResult,
    status: 'new',
    raw_item: item,
    created_at: now,
    updated_at: now,
  };
}

function makeDrafts(leads: LeadItem[]) {
  return leads
    .filter((lead) => lead.lead_result.need_follow_up)
    .map((lead) => ({
      draft_id: `draft_${lead.lead_id}`,
      lead_id: lead.lead_id,
      platform: lead.platform,
      account_id: lead.account_id,
      note_id: lead.note_id,
      author_name: lead.author_name,
      title: lead.title,
      action: 'comment_reply_draft',
      status: 'draft',
      suggestion: lead.client_id
        ? createReplySuggestion({
            client_id: lead.client_id,
            user_comment: lead.title,
            intent: 'lead',
            context: `小红书搜索关键词：${lead.keyword || ''}`,
          })
        : null,
      created_at: new Date().toISOString(),
    }));
}

function writeReport(report: any) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const date = new Date().toISOString().slice(0, 10);
  const file = path.join(REPORT_DIR, `${date}_${Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify(report, null, 2));
  return file;
}

export function generateDiscoveryReport(request: DiscoveryRequest) {
  const response = request.search_response;
  if (!response?.results?.length) throw new Error('search_response.results is required');

  const signatures = response.results.map(makeSignature);
  const scope = [
    'xhs_search',
    request.growth_profile_id || response.growth_profile_id || 'no_growth_profile',
    request.client_id || 'no_client',
    response.keyword || 'keyword',
  ].join('_');
  const sync = syncSignatures(scope, signatures);
  const allowed = new Set(request.only_new === false ? signatures : sync.new_signatures);
  const scannedItems = response.results.filter((item) => allowed.has(makeSignature(item)));
  const growthProfileId = request.growth_profile_id || response.growth_profile_id || null;
  const candidateLeads = scannedItems.map((item) => toLead(item, request.client_id, growthProfileId)).filter(Boolean) as LeadItem[];
  const upsert = upsertLeads(candidateLeads);
  const drafts = makeDrafts(candidateLeads);

  const report = {
    ok: true,
    generated_at: new Date().toISOString(),
    client_id: request.client_id || null,
    growth_profile_id: growthProfileId,
    keyword: response.keyword,
    mode: request.only_new === false ? 'all_scan' : 'new_only',
    summary: {
      scanned_notes: response.results.length,
      new_notes: sync.summary.new_items,
      known_notes: sync.summary.known_items,
      evaluated_notes: scannedItems.length,
      generated_leads: candidateLeads.length,
      reply_drafts: drafts.length,
      lead_levels: candidateLeads.reduce((acc: Record<string, number>, lead) => {
        acc[lead.lead_result.lead_level] = (acc[lead.lead_result.lead_level] || 0) + 1;
        return acc;
      }, {}),
    },
    sync,
    leads: candidateLeads,
    drafts,
    upsert,
  };

  const reportFile = writeReport(report);
  return { ...report, report_file: reportFile };
}
