import fs from 'fs';
import path from 'path';

const STATE_DIR = '/Users/jason/Nova/XHS-mcp/data/interaction-state';

export type SyncResult = {
  summary: {
    scanned: number;
    new_items: number;
    known_items: number;
  };
  new_signatures: string[];
  known_signatures: string[];
  state_file: string;
};

function ensureDir() {
  fs.mkdirSync(STATE_DIR, { recursive: true });
}

function stateFile(scope: string) {
  const safeScope = scope.replace(/[^a-zA-Z0-9_-]+/g, '_') || 'default';
  return path.join(STATE_DIR, `${safeScope}.json`);
}

function readState(file: string) {
  if (!fs.existsSync(file)) return { version: 'v1', signatures: [] as string[], updated_at: new Date().toISOString() };
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  return {
    version: 'v1',
    signatures: Array.isArray(parsed?.signatures) ? parsed.signatures as string[] : [],
    updated_at: parsed?.updated_at || new Date().toISOString(),
  };
}

export function syncSignatures(scope: string, signatures: string[]): SyncResult {
  ensureDir();
  const file = stateFile(scope);
  const state = readState(file);
  const existing = new Set(state.signatures);
  const newSignatures: string[] = [];
  const knownSignatures: string[] = [];

  for (const signature of signatures.filter(Boolean)) {
    if (existing.has(signature)) {
      knownSignatures.push(signature);
    } else {
      existing.add(signature);
      newSignatures.push(signature);
    }
  }

  fs.writeFileSync(file, JSON.stringify({
    version: 'v1',
    updated_at: new Date().toISOString(),
    signatures: Array.from(existing),
  }, null, 2));

  return {
    summary: {
      scanned: signatures.length,
      new_items: newSignatures.length,
      known_items: knownSignatures.length,
    },
    new_signatures: newSignatures,
    known_signatures: knownSignatures,
    state_file: file,
  };
}
