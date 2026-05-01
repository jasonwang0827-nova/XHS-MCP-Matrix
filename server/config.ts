import fs from 'fs';
import path from 'path';

export type AppConfig = {
  server: {
    host: string;
    port: number;
  };
  upstream: {
    url: string;
    timeout_ms: number;
  };
  accounts: {
    data_dir: string;
    binary_path: string;
    default_account_id: string;
    base_port: number;
    host: string;
  };
};

const DEFAULT_CONFIG: AppConfig = {
  server: {
    host: '127.0.0.1',
    port: 18160,
  },
  upstream: {
    url: 'http://localhost:18060/mcp',
    timeout_ms: 120000,
  },
  accounts: {
    data_dir: '/Users/jason/Nova/XHS-mcp/data/accounts',
    binary_path: '/Users/jason/AI_Workspace/xiaohongshu-mcp/xiaohongshu-mcp-darwin-arm64',
    default_account_id: 'xhs_default',
    base_port: 18060,
    host: '127.0.0.1',
  },
};

export function loadConfig(): AppConfig {
  const configPath = path.resolve('./config.json');
  if (!fs.existsSync(configPath)) return DEFAULT_CONFIG;

  const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  return {
    server: {
      ...DEFAULT_CONFIG.server,
      ...(parsed.server || {}),
    },
    upstream: {
      ...DEFAULT_CONFIG.upstream,
      ...(parsed.upstream || {}),
    },
    accounts: {
      ...DEFAULT_CONFIG.accounts,
      ...(parsed.accounts || {}),
    },
  };
}
