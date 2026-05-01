import { createAccount, ensureDefaultAccount } from './store';
import { checkAccountLogin, getAccountLoginQrCode, listAccountRuntimes, startAccount, stopAccount } from './runtime';

export const accountToolNames = [
  'list_xhs_accounts',
  'create_xhs_account',
  'start_xhs_account',
  'stop_xhs_account',
  'check_xhs_account_login',
  'get_xhs_account_login_qrcode',
];

export const accountTools = {
  list_xhs_accounts: async () => {
    ensureDefaultAccount();
    return { accounts: await listAccountRuntimes() };
  },
  create_xhs_account: async (args: any = {}) => {
    const account = createAccount({
      account_id: args.account_id,
      display_name: args.display_name,
      port: args.port,
      notes: args.notes,
    });
    return { account };
  },
  start_xhs_account: async (args: any = {}) => startAccount(args.account_id),
  stop_xhs_account: async (args: any = {}) => stopAccount(args.account_id),
  check_xhs_account_login: async (args: any = {}) => checkAccountLogin(args.account_id),
  get_xhs_account_login_qrcode: async (args: any = {}) => getAccountLoginQrCode(args.account_id),
};
