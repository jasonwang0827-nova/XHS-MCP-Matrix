export type XhsAccount = {
  account_id: string;
  display_name: string;
  port: number;
  mcp_url: string;
  work_dir: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
  notes?: string;
};

export type XhsAccountRuntime = {
  account_id: string;
  running: boolean;
  managed: boolean;
  reachable: boolean;
  pid?: number;
  port: number;
  mcp_url: string;
  started_at?: string;
  last_error?: string;
};
