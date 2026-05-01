import { getUpstreamClient } from './upstream/mcp-client';
import { ToolHandler } from './tools/xhs-tools';
import { xhsToolNames, xhsTools } from './tools/xhs-tools';
import { listClientProfiles, getClientProfile } from './business/client-profiles';
import { checkContentSafety } from './business/safety';
import { createReplySuggestion } from './business/reply-draft';
import { createClientSearchPlan } from './business/search-plan';
import { accountToolNames, accountTools } from './accounts/tools';
import { getUpstreamClientForAccount } from './upstream/mcp-client';

export const toolRegistry: Record<string, ToolHandler> = {
  ...xhsTools,
  ...accountTools,
  upstream_ping: async (args = {}) => getUpstreamClientForAccount(args.account_id).ping(),
  upstream_list_tools: async (args = {}) => getUpstreamClientForAccount(args.account_id).listTools(),
  list_client_profiles: async () => listClientProfiles(),
  get_client_profile: async (args = {}) => {
    const profile = getClientProfile(args.client_id);
    if (!profile) throw new Error(`unknown client_id: ${args.client_id}`);
    return profile;
  },
  safety_check_content: async (args = {}) => checkContentSafety(args),
  create_reply_suggestion: async (args = {}) => createReplySuggestion(args as any),
  create_client_search_plan: async (args = {}) => createClientSearchPlan(args as any),
};

export const toolNames = [
  ...xhsToolNames,
  ...accountToolNames,
  'upstream_ping',
  'upstream_list_tools',
  'list_client_profiles',
  'get_client_profile',
  'safety_check_content',
  'create_reply_suggestion',
  'create_client_search_plan',
];
