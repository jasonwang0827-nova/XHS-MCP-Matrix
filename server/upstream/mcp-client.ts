import { loadConfig } from '../config';
import { findAccount } from '../accounts/store';

type JsonRpcRequest = {
  jsonrpc: '2.0';
  id?: number;
  method: string;
  params?: any;
};

export type UpstreamMcpResult = {
  content?: Array<{
    type: string;
    text?: string;
    mimeType?: string;
    data?: string;
  }>;
  isError?: boolean;
  [key: string]: any;
};

export class UpstreamMcpClient {
  private sessionId: string | null = null;
  private nextId = 1;

  constructor(
    private readonly url = loadConfig().upstream.url,
    private readonly timeoutMs = loadConfig().upstream.timeout_ms,
  ) {}

  async ensureInitialized() {
    if (this.sessionId) return;

    const response = await this.post({
      jsonrpc: '2.0',
      id: this.nextId++,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'xhs-mcp-matrix',
          version: '0.1.0',
        },
      },
    }, false);

    this.sessionId =
      response.headers.get('mcp-session-id') ||
      response.headers.get('Mcp-Session-Id') ||
      null;

    await this.post({
      jsonrpc: '2.0',
      method: 'notifications/initialized',
      params: {},
    }, true);
  }

  async ping() {
    await this.ensureInitialized();
    return this.request('ping', {});
  }

  async listTools() {
    await this.ensureInitialized();
    return this.request('tools/list', {});
  }

  async callTool(name: string, args: Record<string, any> = {}): Promise<UpstreamMcpResult> {
    await this.ensureInitialized();
    const response = await this.request('tools/call', {
      name,
      arguments: args,
    });
    return response.result;
  }

  private async request(method: string, params: any) {
    const response = await this.post({
      jsonrpc: '2.0',
      id: this.nextId++,
      method,
      params,
    }, true);

    const payload = await response.json();
    if (payload.error) {
      throw new Error(`${method} failed: ${payload.error.message || JSON.stringify(payload.error)}`);
    }
    return payload;
  }

  private async post(body: JsonRpcRequest, includeSession: boolean) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      };
      if (includeSession && this.sessionId) headers['Mcp-Session-Id'] = this.sessionId;

      const response = await fetch(this.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`upstream HTTP ${response.status}: ${text}`);
      }
      return response;
    } finally {
      clearTimeout(timer);
    }
  }
}

export function getUpstreamClient() {
  return new UpstreamMcpClient();
}

export function getUpstreamClientForAccount(accountId?: string | null) {
  if (!accountId) return getUpstreamClient();
  const account = findAccount(accountId);
  if (!account) throw new Error(`unknown account_id: ${accountId}`);
  return new UpstreamMcpClient(account.mcp_url);
}
