export function renderSearchPage() {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>XHS 搜索</title>
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
    input { height: 38px; border: 1px solid #d0d5dd; border-radius: 6px; padding: 0 10px; min-width: min(360px, 100%); }
    textarea { width: min(520px, 100%); min-height: 72px; border: 1px solid #d0d5dd; border-radius: 6px; padding: 8px 10px; resize: vertical; font-family: inherit; }
    select { height: 38px; border: 1px solid #d0d5dd; border-radius: 6px; padding: 0 10px; background: #fff; }
    button { height: 36px; border: 1px solid #cfd6e4; background: #fff; border-radius: 6px; padding: 0 12px; cursor: pointer; }
    button.primary { background: #20242a; color: #fff; border-color: #20242a; }
    button:disabled { opacity: .55; cursor: not-allowed; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { border-bottom: 1px solid #edf0f4; padding: 10px 8px; text-align: left; vertical-align: top; }
    th { color: #667085; font-weight: 600; white-space: nowrap; }
    .row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .accounts { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 8px; }
    .account { border: 1px solid #e7e9ee; border-radius: 8px; padding: 10px; display: flex; gap: 8px; align-items: flex-start; }
    .account input { min-width: 0; height: auto; margin-top: 2px; }
    .muted { color: #667085; font-size: 12px; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
    .pill { display: inline-flex; border: 1px solid #d0d5dd; border-radius: 999px; padding: 2px 8px; margin: 2px 4px 0 0; color: #475467; background: #fff; }
    .toolbar { justify-content: space-between; }
    .title { min-width: 220px; max-width: 360px; }
    .empty { color: #667085; padding: 24px 8px; }
    .nav { display: flex; gap: 12px; align-items: center; }
    .comments { margin-top: 10px; border: 1px solid #edf0f4; border-radius: 8px; padding: 10px; background: #fafbfc; }
    .comment { border-top: 1px solid #edf0f4; padding: 8px 0; }
    .comment:first-child { border-top: 0; }
    .replyBox { margin-top: 8px; display: grid; gap: 8px; }
    .reportBox { margin-top: 12px; border: 1px solid #edf0f4; border-radius: 8px; padding: 10px; background: #fafbfc; }
    .errorBox { border: 1px solid #fecdca; border-radius: 8px; padding: 10px; background: #fff4f2; color: #912018; margin: 10px 0; }
    #message { min-height: 22px; color: #475467; }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>XHS 搜索</h1>
      <p>选择账号，输入关键词，搜索记录并生成线索</p>
    </div>
    <div class="nav">
      <a href="/growth">增长计划</a>
      <a href="/leads">线索池</a>
      <a href="/publish">发布</a>
      <a href="/admin">账号管理</a>
    </div>
  </header>
  <main>
    <section>
      <h2>搜索</h2>
      <div class="row">
        <select id="searchMode" aria-label="搜索模式">
          <option value="single" selected>单账号</option>
          <option value="multi">多账号同搜</option>
        </select>
        <select id="account" aria-label="小红书账号"></select>
        <input id="keyword" placeholder="输入关键词，如 加拿大留学" />
        <select id="keywordPreset" aria-label="常用关键词"></select>
        <select id="limitPerAccount" aria-label="每个账号返回数量">
          <option value="5" selected>每号 5 条</option>
          <option value="10">每号 10 条</option>
          <option value="20">每号 20 条</option>
        </select>
        <button class="primary" id="searchButton" onclick="runSearch()">搜索</button>
        <button onclick="saveLastResults()" id="saveButton" disabled>保存结果</button>
        <button onclick="generateDiscoveryReport()" id="reportButton" disabled>生成线索报告</button>
      </div>
      <div class="row" style="margin-top:12px">
        <input id="commentKeywords" placeholder="评论关键词，如 租房, 找房, 室友" />
        <select id="commentMaxNotes" aria-label="深挖笔记数量">
          <option value="5" selected>深挖前 5 篇</option>
          <option value="10">深挖前 10 篇</option>
          <option value="20">深挖前 20 篇</option>
        </select>
        <button onclick="generateCommentLeads()" id="commentLeadButton" disabled>从评论找准客户</button>
      </div>
      <p id="message"></p>
    </section>
    <section id="multiSection" style="display:none">
      <h2>多账号选择</h2>
      <div id="multiAccounts" class="accounts"></div>
    </section>
    <section>
      <h2>账号规则</h2>
      <div id="accountStrategy" class="muted"></div>
    </section>
    <section>
      <div class="row toolbar">
        <h2>搜索结果</h2>
        <div id="summary" class="muted"></div>
      </div>
      <div id="results"></div>
    </section>
    <section>
      <div class="row toolbar">
        <h2>评论准客户</h2>
        <div class="row">
          <button onclick="generateLeadProfileSummary()" id="profileSummaryButton" disabled>生成线索汇总表</button>
          <div id="commentLeadSummary" class="muted"></div>
        </div>
      </div>
      <div id="commentLeads" class="empty">先搜索笔记，再输入评论关键词。</div>
      <div id="profileSummary" class="reportBox" style="display:none"></div>
    </section>
  </main>
  <script>
    let lastResponse = null;
    let lastCommentLeadReport = null;
    let profiles = [];
    let accounts = [];

    async function api(path, options = {}) {
      const timeoutMs = options.timeoutMs || 90000;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const { timeoutMs: _timeoutMs, ...fetchOptions } = options;
      try {
        const response = await fetch(path, {
          headers: { 'Content-Type': 'application/json' },
          ...fetchOptions,
          signal: controller.signal,
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'request failed');
        return payload;
      } finally {
        clearTimeout(timer);
      }
    }
    function escapeHtml(value) {
      return String(value || '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
      }[char]));
    }
    function setMessage(text) { document.getElementById('message').textContent = text || ''; }
    function selectedAccount() {
      const accountId = document.getElementById('account').value;
      return accounts.find((account) => account.account_id === accountId) || null;
    }
    function profileForAccount(accountId) {
      return profiles.find((profile) => (profile.account_ids || []).includes(accountId)) || null;
    }
    function selectedProfile() {
      const account = selectedAccount();
      return account ? profileForAccount(account.account_id) : null;
    }
    async function load() {
      const [accountPayload, growthPayload] = await Promise.all([api('/api/accounts'), api('/api/growth')]);
      accounts = accountPayload.accounts || [];
      profiles = growthPayload.profiles || [];
      renderAccounts();
      renderMultiAccounts();
      renderKeywordPresets();
      renderAccountStrategy();
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
    function renderMultiAccounts() {
      document.getElementById('multiAccounts').innerHTML = accounts.map((account) => {
        const runtime = account.runtime || {};
        const checked = runtime.reachable ? 'checked' : '';
        const disabled = account.enabled === false ? 'disabled' : '';
        const status = runtime.managed ? '管理台启动' : (runtime.reachable ? '端口可访问' : '未启动，搜索时自动启动');
        return '<label class="account">' +
          '<input type="checkbox" value="' + escapeHtml(account.account_id) + '" ' + checked + ' ' + disabled + ' />' +
          '<span><strong>' + escapeHtml(account.display_name) + '</strong>' +
          '<div class="muted mono">' + escapeHtml(account.account_id) + ' · ' + escapeHtml(account.port) + '</div>' +
          '<div class="muted">' + escapeHtml(status) + '</div></span>' +
        '</label>';
      }).join('') || '<div class="empty">暂无账号，请先到账号管理页创建。</div>';
    }
    function renderKeywordPresets() {
      const profile = selectedProfile();
      const keywords = profile?.seed_keywords || [];
      document.getElementById('keywordPreset').innerHTML =
        '<option value="">常用关键词</option>' +
        keywords.map((keyword) => '<option value="' + escapeHtml(keyword) + '">' + escapeHtml(keyword) + '</option>').join('');
      if (keywords.length && !document.getElementById('keyword').value.trim()) {
        document.getElementById('keyword').value = keywords[0];
      }
    }
    function renderAccountStrategy() {
      const mode = document.getElementById('searchMode').value;
      const account = selectedAccount();
      const profile = selectedProfile();
      const keywords = profile?.seed_keywords || [];
      document.getElementById('multiSection').style.display = mode === 'multi' ? '' : 'none';
      document.getElementById('account').style.display = mode === 'single' ? '' : 'none';
      if (mode === 'multi') {
        document.getElementById('accountStrategy').innerHTML =
          '<div><strong>多账号同搜</strong></div>' +
          '<div>多个账号一起搜索同一个关键词，适合临时扩大采集量。</div>';
        return;
      }
      document.getElementById('accountStrategy').innerHTML = account
        ? '<div><strong>' + escapeHtml(account.display_name) + '</strong> · ' + escapeHtml(account.account_id) + '</div>' +
          '<div>绑定规则：' + escapeHtml(profile?.name || '未绑定，可到增长计划页面填写') + '</div>' +
          '<div>常用关键词：' + escapeHtml(keywords.join('、') || '暂无') + '</div>'
        : '<div>暂无账号，请先到账号管理页创建。</div>';
    }
    function selectedAccounts() {
      if (document.getElementById('searchMode').value === 'multi') {
        return Array.from(document.querySelectorAll('#multiAccounts input[type="checkbox"]:checked')).map((input) => input.value);
      }
      const accountId = document.getElementById('account').value;
      return accountId ? [accountId] : [];
    }
    function selectedGrowthProfileId() {
      if (document.getElementById('searchMode').value === 'multi') return null;
      return selectedProfile()?.profile_id || null;
    }
    function renderResults(response) {
      const results = response.results || [];
      document.getElementById('summary').textContent =
        '关键词：' + response.keyword + ' · 原始 ' + response.total_raw + ' 条 · 去重后 ' + response.total_unique + ' 条';
      document.getElementById('saveButton').disabled = !results.length;
      document.getElementById('reportButton').disabled = !results.length;
      document.getElementById('commentLeadButton').disabled = !results.length;
      const failedAccounts = (response.searched_accounts || []).filter((account) => !account.ok);
      const failureHtml = failedAccounts.length
        ? '<div class="errorBox"><strong>失败账号</strong>' +
          failedAccounts.map((account) =>
            '<div><span class="mono">' + escapeHtml(account.account_id) + '</span>：' + escapeHtml(account.error || '未知错误') + '</div>'
          ).join('') +
          '</div>'
        : '';
      if (!results.length) {
        document.getElementById('results').innerHTML = failureHtml + '<div class="empty">没有结果</div>';
        return;
      }
      const accountSummary = (response.searched_accounts || []).map((account) =>
        '<span class="pill" title="' + escapeHtml(account.error || '') + '">' +
        escapeHtml(account.account_id) + ': ' + (account.ok ? account.count + ' 条' : '失败') +
        '</span>'
      ).join('');
      const rows = results.map((item, index) => {
        const matched = (item.matched_accounts || []).map((id) => '<span class="pill">' + escapeHtml(id) + '</span>').join('');
        const detailButton = item.xsec_token
          ? '<button onclick="loadFeedDetail(' + index + ')">查看评论</button>'
          : '<span class="muted">缺少 xsec_token</span>';
        return '<tr>' +
          '<td class="title"><strong>' + escapeHtml(item.title || '无标题') + '</strong><div class="muted mono">' + escapeHtml(item.note_id) + '</div><div id="detail-' + index + '"></div></td>' +
          '<td>' + escapeHtml(item.author_name || '未知') + '<div class="muted mono">' + escapeHtml(item.author_id || '') + '</div></td>' +
          '<td>' + (item.liked_count ?? '') + '</td>' +
          '<td>' + (item.comment_count ?? '') + '</td>' +
          '<td>' + (item.collected_count ?? '') + '</td>' +
          '<td>' + matched + '</td>' +
          '<td><div class="row"><a href="' + escapeHtml(item.url) + '" target="_blank" rel="noreferrer">打开</a>' + detailButton + '</div></td>' +
        '</tr>';
      }).join('');
      document.getElementById('results').innerHTML =
        failureHtml +
        '<div style="margin-bottom:10px">' + accountSummary + '</div>' +
        '<table><thead><tr><th>标题</th><th>作者</th><th>赞</th><th>评</th><th>藏</th><th>来源账号</th><th>链接</th></tr></thead><tbody>' +
        rows +
        '</tbody></table>';
    }
    async function loadFeedDetail(index) {
      if (!lastResponse?.results?.[index]) return;
      const item = lastResponse.results[index];
      const target = document.getElementById('detail-' + index);
      target.innerHTML = '<div class="comments muted">正在读取评论...</div>';
      try {
        const response = await api('/api/feed-detail', {
          method: 'POST',
          body: JSON.stringify({
            account_id: item.source_account_id || selectedAccounts()[0],
            note_id: item.note_id,
            xsec_token: item.xsec_token,
            load_all_comments: false,
          }),
          timeoutMs: 60000,
        });
        const detail = response.detail || {};
        const comments = detail.comments || [];
        if (!comments.length) {
          target.innerHTML = '<div class="comments muted">没有读取到评论内容。</div>';
          return;
        }
        target.innerHTML =
          '<div class="comments">' +
          '<div class="muted">评论 ' + comments.length + ' 条 · 作者 ' + escapeHtml(detail.author_name || item.author_name || '') + '</div>' +
          comments.map((comment) =>
            '<div class="comment"><strong>' + escapeHtml(comment.author_name || '未知用户') + '</strong>' +
            '<div>' + escapeHtml(comment.content || '') + '</div>' +
            '<div class="muted mono">' + escapeHtml(comment.comment_id || '') + '</div></div>'
          ).join('') +
          '</div>';
      } catch (error) {
        target.innerHTML = '<div class="comments muted">读取评论失败：' + escapeHtml(error.message) + '</div>';
      }
    }
    async function runSearch() {
      const keyword = document.getElementById('keyword').value.trim();
      const account_ids = selectedAccounts();
      const limit_per_account = Number(document.getElementById('limitPerAccount').value) || 10;
      if (!keyword) return setMessage('请输入关键词。');
      if (!account_ids.length) return setMessage('请选择至少一个账号。');
      document.getElementById('searchButton').disabled = true;
      document.getElementById('saveButton').disabled = true;
      document.getElementById('reportButton').disabled = true;
      document.getElementById('commentLeadButton').disabled = true;
      setMessage('搜索中，会按账号顺序执行；账号越多耗时越长。');
      try {
        const response = await api('/api/search', {
          method: 'POST',
          body: JSON.stringify({
            keyword,
            account_ids,
            growth_profile_id: selectedGrowthProfileId(),
            limit_per_account,
            dedupe: true,
          }),
          timeoutMs: Math.max(90000, account_ids.length * 45000),
        });
        lastResponse = response;
        renderResults(response);
        const failed = (response.searched_accounts || []).filter((account) => !account.ok);
        setMessage(failed.length
          ? '搜索完成，但有账号失败：' + failed.map((account) => account.account_id + ' ' + (account.error || '')).join('；')
          : '搜索完成。');
      } catch (error) {
        setMessage(error.name === 'AbortError' ? '搜索超时，请减少账号或每号条数后重试。' : error.message);
      } finally {
        document.getElementById('searchButton').disabled = false;
      }
    }
    async function saveLastResults() {
      if (!lastResponse) return;
      setMessage('保存中...');
      try {
        const response = await api('/api/search/save', { method: 'POST', body: JSON.stringify(lastResponse) });
        setMessage('已保存：' + response.saved_file);
      } catch (error) {
        setMessage(error.message);
      }
    }
    async function generateDiscoveryReport() {
      if (!lastResponse) return;
      setMessage('正在生成线索报告...');
      document.getElementById('reportButton').disabled = true;
      try {
        const response = await api('/api/search/discovery-report', {
          method: 'POST',
          body: JSON.stringify({
            search_response: lastResponse,
            growth_profile_id: lastResponse.growth_profile_id || null,
            client_id: null,
            only_new: true,
          }),
        });
        const summary = response.summary || {};
        setMessage('线索报告完成：新增笔记 ' + (summary.new_notes || 0) + ' 条，生成线索 ' + (summary.generated_leads || 0) + ' 条。');
      } catch (error) {
        setMessage(error.message);
      } finally {
        document.getElementById('reportButton').disabled = false;
      }
    }
    function splitKeywords(value) {
      return String(value || '').split(/[，,、\\n\\s]+/).map((item) => item.trim()).filter(Boolean);
    }
    function renderCommentLeads(report) {
      lastCommentLeadReport = report;
      const leads = report.leads || [];
      document.getElementById('commentLeadSummary').textContent =
        '命中评论 ' + (report.summary?.matched_comments || 0) + ' 条 · 新增 ' + (report.summary?.inserted || 0) + ' 条 · 更新 ' + (report.summary?.updated || 0) + ' 条';
      document.getElementById('profileSummaryButton').disabled = !leads.length;
      if (!leads.length) {
        document.getElementById('commentLeads').innerHTML = '<div class="empty">没有评论命中关键词。</div>';
        return;
      }
      const rows = leads.map((lead) => {
        const comment = lead.raw_item?.comment || {};
        const matched = (lead.lead_result?.matched_keywords || []).map((word) => '<span class="pill">' + escapeHtml(word) + '</span>').join('');
        return '<tr>' +
          '<td><strong>' + escapeHtml(lead.author_name || '未知') + '</strong><div class="muted mono">' + escapeHtml(lead.author_id || '') + '</div></td>' +
          '<td>' + escapeHtml(comment.content || '') + '<div class="muted mono">' + escapeHtml(comment.comment_id || '') + '</div></td>' +
          '<td>' + matched + '</td>' +
          '<td><strong>' + escapeHtml(lead.title || '无标题') + '</strong><div class="muted mono">' + escapeHtml(lead.note_id || '') + '</div></td>' +
          '<td><a href="' + escapeHtml(lead.url) + '" target="_blank" rel="noreferrer">打开</a></td>' +
        '</tr>';
      }).join('');
      document.getElementById('commentLeads').innerHTML =
        '<table><thead><tr><th>评论人</th><th>评论内容</th><th>命中词</th><th>来源笔记</th><th>操作</th></tr></thead><tbody>' +
        rows + '</tbody></table>';
    }
    async function generateLeadProfileSummary() {
      const accountIds = selectedAccounts();
      const account_id = accountIds.length === 1 ? accountIds[0] : null;
      const target = document.getElementById('profileSummary');
      target.style.display = '';
      target.innerHTML = '<div class="muted">正在读取评论人主页并生成汇总表...</div>';
      setMessage('正在生成线索汇总表，会逐个读取评论人主页。');
      try {
        const report = await api('/api/leads/profile-summary', {
          method: 'POST',
          body: JSON.stringify({
            account_id,
            growth_profile_id: selectedGrowthProfileId(),
            limit: 50,
            search_response: lastCommentLeadReport?.search_response || lastResponse,
            comment_keywords: lastCommentLeadReport?.comment_keywords || splitKeywords(document.getElementById('commentKeywords').value),
            max_notes: lastCommentLeadReport?.max_notes || Number(document.getElementById('commentMaxNotes').value || 5),
            comments_limit: lastCommentLeadReport?.comments_limit || 20,
          }),
          timeoutMs: 180000,
        });
        const rows = report.rows || [];
        const tableRows = rows.map((row, idx) =>
          '<tr>' +
          '<td>' + (idx + 1) + '</td>' +
          '<td><strong>' + escapeHtml(row.author_name) + '</strong><div class="muted mono">' + escapeHtml(row.author_id) + '</div></td>' +
          '<td>' + escapeHtml(row.red_id || '-') + '</td>' +
          '<td>' + escapeHtml(row.ip_location || '-') + '</td>' +
          '<td>' + escapeHtml(row.fans || '-') + '</td>' +
          '<td>' + escapeHtml((row.matched_keywords || []).join('、')) + '</td>' +
          '<td>' + escapeHtml(row.comment_content || '') + '</td>' +
          '<td><a href="' + escapeHtml(row.note_url) + '" target="_blank" rel="noreferrer">' + escapeHtml(row.note_title || '来源笔记') + '</a></td>' +
          '<td>' + escapeHtml(row.suggested_action || '') + '</td>' +
          '</tr>'
        ).join('');
        target.innerHTML =
          '<div class="row toolbar"><strong>线索汇总表</strong><span class="muted">保存：' + escapeHtml(report.files?.markdown || '') + '</span></div>' +
          '<div class="muted">线索 ' + (report.summary?.leads || 0) + ' 条 · 主页成功 ' + (report.summary?.profiles_ok || 0) + ' 条 · 失败 ' + (report.summary?.profiles_failed || 0) + ' 条</div>' +
          '<table><thead><tr><th>#</th><th>评论人</th><th>小红书号</th><th>IP</th><th>粉丝</th><th>命中词</th><th>评论内容</th><th>来源笔记</th><th>建议动作</th></tr></thead><tbody>' +
          tableRows + '</tbody></table>';
        setMessage('线索汇总表已生成并保存。');
      } catch (error) {
        target.innerHTML = '<div class="muted">生成失败：' + escapeHtml(error.message) + '</div>';
        setMessage(error.message);
      }
    }
    async function generateCommentLeads() {
      if (!lastResponse?.results?.length) return setMessage('请先搜索笔记。');
      const keywords = splitKeywords(document.getElementById('commentKeywords').value);
      if (!keywords.length) return setMessage('请输入评论关键词。');
      const max_notes = Number(document.getElementById('commentMaxNotes').value || 5);
      const button = document.getElementById('commentLeadButton');
      button.disabled = true;
      setMessage('正在读取评论并筛选准客户，这一步会逐篇打开评论。');
      try {
        const report = await api('/api/search/comment-leads', {
          method: 'POST',
          body: JSON.stringify({
            search_response: lastResponse,
            keywords,
            max_notes,
            load_all_comments: false,
            comments_limit: 20,
          }),
          timeoutMs: Math.max(120000, max_notes * 50000),
        });
        report.search_response = lastResponse;
        report.comment_keywords = keywords;
        report.max_notes = max_notes;
        report.comments_limit = 20;
        renderCommentLeads(report);
        setMessage('评论准客户筛选完成：命中 ' + (report.summary?.matched_comments || 0) + ' 条。');
      } catch (error) {
        setMessage(error.name === 'AbortError' ? '评论深挖超时，请减少深挖篇数。' : error.message);
      } finally {
        button.disabled = false;
      }
    }
    document.getElementById('searchMode').addEventListener('change', renderAccountStrategy);
    document.getElementById('account').addEventListener('change', () => {
      renderKeywordPresets();
      renderAccountStrategy();
    });
    document.getElementById('keywordPreset').addEventListener('change', (event) => {
      if (event.target.value) document.getElementById('keyword').value = event.target.value;
    });
    load().catch((error) => setMessage(error.message));
  </script>
</body>
</html>`;
}
