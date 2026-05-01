import fs from 'fs';
import path from 'path';
import { LeadItem, LeadsFile } from './types';

const LEADS_DIR = '/Users/jason/Nova/XHS-mcp/data/leads';
const LEADS_FILE = path.join(LEADS_DIR, 'leads.json');

function ensureStore() {
  fs.mkdirSync(LEADS_DIR, { recursive: true });
  if (!fs.existsSync(LEADS_FILE)) {
    fs.writeFileSync(LEADS_FILE, JSON.stringify({ version: 'v1', updated_at: new Date().toISOString(), items: [] }, null, 2));
  }
}

export function listLeads(filter: { growth_profile_id?: string | null; account_id?: string | null } = {}) {
  ensureStore();
  const parsed = JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8'));
  const items = Array.isArray(parsed) ? parsed as LeadItem[] : (Array.isArray(parsed?.items) ? parsed.items as LeadItem[] : []);
  return items.filter((item) => {
    if (filter.growth_profile_id && item.growth_profile_id !== filter.growth_profile_id) return false;
    if (filter.account_id && item.account_id !== filter.account_id && !(item.matched_accounts || []).includes(filter.account_id)) return false;
    return true;
  });
}

export function readLeadsFile(): LeadsFile {
  ensureStore();
  const parsed = JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8'));
  if (Array.isArray(parsed)) {
    return { version: 'v1', updated_at: new Date().toISOString(), items: parsed as LeadItem[] };
  }
  return {
    version: 'v1',
    updated_at: parsed?.updated_at || new Date().toISOString(),
    items: Array.isArray(parsed?.items) ? parsed.items as LeadItem[] : [],
  };
}

export function writeLeadsFile(file: LeadsFile) {
  ensureStore();
  fs.writeFileSync(LEADS_FILE, JSON.stringify({ ...file, version: 'v1', updated_at: new Date().toISOString() }, null, 2));
}

export function upsertLeads(items: LeadItem[]) {
  const file = readLeadsFile();
  const bySignature = new Map(file.items.map((item) => [item.signature, item]));
  let inserted = 0;
  let updated = 0;

  for (const item of items) {
    const existing = bySignature.get(item.signature);
    if (existing) {
      Object.assign(existing, {
        ...existing,
        ...item,
        status: existing.status,
        created_at: existing.created_at,
        updated_at: new Date().toISOString(),
      });
      updated += 1;
    } else {
      file.items.push(item);
      bySignature.set(item.signature, item);
      inserted += 1;
    }
  }

  writeLeadsFile(file);
  return { inserted, updated, total_items: file.items.length, items: file.items };
}
