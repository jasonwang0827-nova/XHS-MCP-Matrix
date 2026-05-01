export function renderLeadsPage() {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>XHS 线索池</title>
  <style>
    :root { color-scheme: light; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; background: #f6f7f9; color: #20242a; }
    header { background: #fff; border-bottom: 1px solid #e7e9ee; padding: 18px 24px; display: flex; justify-content: space-between; align-items: center; gap: 16px; }
    main { max-width: 1280px; margin: 0 auto; padding: 24px; }
    h1 { font-size: 22px; margin: 0 0 4px; }
    h2 { font-size: 16px; margin: 0 0 14px; }
    p { margin: 0; color: #667085; }
    a { color: #175cd3; text-decoration: none; }
    section { background: #fff; border: 1px solid #e7e9ee; border-radius: 8px; padding: 18px; margin-bottom: 18px; }
    select { height: 36px; border: 1px solid #cfd6e4; border-radius: 6px; padding: 0 12px; background: #fff; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { border-bottom: 1px solid #edf0f4; padding: 10px 8px; text-align: left; vertical-align: top; }
    th { color: #667085; font-weight: 600; white-space: nowrap; }
    .row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .muted { color: #667085; font-size: 12px; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
    .pill { display: inline-flex; border: 1px solid #d0d5dd; border-radius: 999px; padding: 2px 8px; margin: 2px 4px 0 0; color: #475467; background: #fff; }
    .empty { color: #667085; padding: 24px 8px; }
    .title { min-width: 260px; max-width: 420px; }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>XHS 线索池</h1>
      <p>先选小红书账号，下面显示这个账号搜索沉淀出来的线索</p>
    </div>
    <div>
      <a href="/search">搜索工作台</a>
      <span class="muted"> · </span>
      <a href="/growth">增长计划</a>
      <span class="muted"> · </span>
      <a href="/publish">发布</a>
      <span class="muted"> · </span>
      <a href="/admin">账号管理</a>
    </div>
  </header>
  <main>
    <section>
      <h2>账号筛选</h2>
      <div class="row">
        <select id="account"></select>
        <div id="accountMeta" class="muted"></div>
      </div>
    </section>
    <section>
      <h2>线索列表</h2>
      <div id="summary" class="muted"></div>
      <div id="leads"></div>
    </section>
  </main>
  <script>
    let accounts = [];
    let profiles = [];

    async function api(path) {
      const response = await fetch(path);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'request failed');
      return payload;
    }
    function escapeHtml(value) {
      return String(value || '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
      }[char]));
    }
    function selectedAccount() {
      const accountId = document.getElementById('account').value;
      return accounts.find((account) => account.account_id === accountId) || null;
    }
    function profileForAccount(accountId) {
      return profiles.find((profile) => (profile.account_ids || []).includes(accountId)) || null;
    }
    function renderAccounts() {
      document.getElementById('account').innerHTML = accounts.map((account) => {
        const runtime = account.runtime || {};
        const status = runtime.reachable ? '可用' : '可自动启动';
        return '<option value="' + escapeHtml(account.account_id) + '">' +
          escapeHtml(account.display_name) + ' · ' + escapeHtml(status) +
        '</option>';
      }).join('');
    }
    function renderMeta() {
      const account = selectedAccount();
      const profile = account ? profileForAccount(account.account_id) : null;
      document.getElementById('accountMeta').innerHTML = account
        ? '当前账号：' + escapeHtml(account.account_id) + ' · 业务画像：' + escapeHtml(profile?.name || '未绑定')
        : '';
    }
    function render(leads) {
      const account = selectedAccount();
      const profile = account ? profileForAccount(account.account_id) : null;
      document.getElementById('summary').textContent =
        (account ? account.display_name + ' · ' : '') +
        (profile ? profile.name + ' · ' : '') +
        '共 ' + leads.length + ' 条线索';
      if (!leads.length) {
        document.getElementById('leads').innerHTML = '<div class="empty">这个账号暂无线索。先到搜索工作台用这个账号搜索并生成线索报告。</div>';
        return;
      }

      const rows = leads.map((lead) => {
        const matched = (lead.matched_accounts || []).map((id) => '<span class="pill">' + escapeHtml(id) + '</span>').join('');
        return '<tr>' +
          '<td class="title"><strong>' + escapeHtml(lead.title || '无标题') + '</strong><div class="muted mono">' + escapeHtml(lead.note_id) + '</div><div class="muted">' + escapeHtml(lead.lead_result?.follow_up_suggestion || '') + '</div></td>' +
          '<td>' + escapeHtml(lead.author_name || '未知') + '<div class="muted mono">' + escapeHtml(lead.author_id || '') + '</div></td>' +
          '<td><span class="pill">' + escapeHtml(lead.status) + '</span></td>' +
          '<td><span class="pill">' + escapeHtml(lead.lead_result?.lead_level) + '</span></td>' +
          '<td>' + matched + '</td>' +
          '<td>' + escapeHtml((lead.lead_result?.matched_keywords || []).join(', ')) + '</td>' +
          '<td><a href="' + escapeHtml(lead.url) + '" target="_blank" rel="noreferrer">打开</a></td>' +
        '</tr>';
      }).join('');

      document.getElementById('leads').innerHTML =
        '<table><thead><tr><th>笔记</th><th>作者</th><th>状态</th><th>等级</th><th>来源账号</th><th>命中词</th><th>链接</th></tr></thead><tbody>' +
        rows +
        '</tbody></table>';
    }
    async function load() {
      const currentAccountId = document.getElementById('account').value;
      const accountPayload = await api('/api/accounts');
      accounts = accountPayload.accounts || [];
      const accountId = currentAccountId || accounts[0]?.account_id || '';
      const leadPayload = await api('/api/leads' + (accountId ? '?account_id=' + encodeURIComponent(accountId) : ''));
      profiles = leadPayload.profiles || profiles;
      renderAccounts();
      if (accountId) document.getElementById('account').value = accountId;
      renderMeta();
      render(leadPayload.leads || []);
    }

    document.getElementById('account').addEventListener('change', () => {
      load().catch((error) => {
        document.getElementById('leads').innerHTML = '<div class="empty">' + escapeHtml(error.message) + '</div>';
      });
    });
    load().catch((error) => {
      document.getElementById('leads').innerHTML = '<div class="empty">' + escapeHtml(error.message) + '</div>';
    });
  </script>
</body>
</html>`;
}
