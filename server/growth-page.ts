export function renderGrowthPage() {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>XHS 增长计划</title>
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
    button, select, input, textarea { border: 1px solid #cfd6e4; background: #fff; border-radius: 6px; padding: 0 12px; box-sizing: border-box; }
    button, select, input { height: 36px; }
    textarea { width: 100%; min-height: 92px; padding: 10px 12px; line-height: 1.5; resize: vertical; }
    input[type="checkbox"] { width: 16px; height: 16px; padding: 0; }
    button { cursor: pointer; }
    button.primary { background: #20242a; color: #fff; border-color: #20242a; }
    button:disabled { opacity: .55; cursor: not-allowed; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { border-bottom: 1px solid #edf0f4; padding: 10px 8px; text-align: left; vertical-align: top; }
    th { color: #667085; font-weight: 600; white-space: nowrap; }
    .row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .form-grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
    .muted { color: #667085; font-size: 12px; }
    .profile-meta { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 8px; font-size: 12px; color: #475467; }
    .pill { display: inline-flex; border: 1px solid #d0d5dd; border-radius: 999px; padding: 2px 8px; margin: 2px 4px 0 0; color: #475467; background: #fff; }
    .empty { color: #667085; padding: 20px 8px; }
    .nav { display: flex; gap: 12px; align-items: center; }
    #message { min-height: 22px; color: #475467; }
    .wide { min-width: min(420px, 100%); }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>XHS 增长计划</h1>
      <p>先选小红书账号，再输入要找的人群，系统自动生成今日关注计划</p>
    </div>
    <div class="nav">
      <a href="/search">搜索工作台</a>
      <a href="/leads">线索池</a>
      <a href="/publish">发布</a>
      <a href="/admin">账号管理</a>
    </div>
  </header>
  <main>
    <section>
      <h2>账号与找人规则</h2>
      <div class="form-grid">
        <div class="row">
          <select id="account"></select>
          <input id="profileName" class="wide" placeholder="规则名称，如 留学号增长规则" />
        </div>
        <textarea id="persona" placeholder="输入你要找的人，比如：正在了解加拿大本科申请、签证、选校规划的学生和家长。以后也可以由文档或 AI 自动写入。"></textarea>
        <input id="keywords" placeholder="搜索关键词，用逗号分隔，如 加拿大留学, 签证经验, 选校规划" />
        <div class="row">
          <label class="muted">每日最少 <input id="dailyMin" type="number" min="1" max="20" style="width:72px" /></label>
          <label class="muted">每日最多 <input id="dailyMax" type="number" min="1" max="20" style="width:72px" /></label>
          <label class="muted">自动时间 <input id="dailyTime" type="time" style="width:112px" /></label>
          <label class="row muted" style="gap:6px"><input id="autoFollow" type="checkbox" /> 自动运行</label>
          <button onclick="saveRule()">保存规则</button>
          <button onclick="runPlan(true)">Dry Run</button>
          <button class="primary" onclick="runPlan(false)">保存并生成今日计划</button>
        </div>
        <div id="profileMeta" class="profile-meta"></div>
        <p id="message"></p>
      </div>
    </section>
    <section>
      <h2>今日关注计划</h2>
      <div id="candidates"></div>
    </section>
    <section>
      <h2>点赞任务</h2>
      <div id="likes"></div>
    </section>
  </main>
  <script>
    let accounts = [];
    let profiles = [];
    let candidates = [];
    let likeCandidates = [];

    async function api(path, options = {}) {
      const response = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...options });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'request failed');
      return payload;
    }
    function escapeHtml(value) {
      return String(value || '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
      }[char]));
    }
    function setMessage(text) { document.getElementById('message').textContent = text || ''; }
    function accountProfileId(accountId) { return 'account_' + accountId.replace(/[^a-zA-Z0-9_-]+/g, '_') + '_growth'; }
    function splitKeywords(value) {
      return String(value || '').split(/[，,、\\n]+/).map((item) => item.trim()).filter(Boolean);
    }
    function deriveKeywords(text) {
      const direct = splitKeywords(document.getElementById('keywords').value);
      if (direct.length) return direct;
      return splitKeywords(text).slice(0, 8);
    }
    function selectedAccount() {
      const accountId = document.getElementById('account').value;
      return accounts.find((account) => account.account_id === accountId) || null;
    }
    function selectedProfile() {
      const account = selectedAccount();
      if (!account) return null;
      const ownedProfileId = accountProfileId(account.account_id);
      return profiles.find((profile) => profile.profile_id === ownedProfileId)
        || profiles.find((profile) => (profile.account_ids || []).includes(account.account_id))
        || null;
    }
    function buildProfileFromForm() {
      const account = selectedAccount();
      if (!account) throw new Error('请选择小红书账号。');
      const existing = selectedProfile();
      const persona = document.getElementById('persona').value.trim();
      const dailyMin = Number(document.getElementById('dailyMin').value || 3);
      const dailyMax = Number(document.getElementById('dailyMax').value || 5);
      const profileId = accountProfileId(account.account_id);
      return {
        ...(existing || {}),
        profile_id: profileId,
        name: document.getElementById('profileName').value.trim() || account.display_name + ' 增长规则',
        account_ids: [account.account_id],
        persona_description: persona,
        rules_source: '/Users/jason/Nova/XHS-mcp/data/growth/rules/' + profileId + '.md',
        seed_keywords: deriveKeywords(persona),
        daily_follow_min: Math.max(1, Math.min(dailyMin, dailyMax)),
        daily_follow_max: Math.max(dailyMin, dailyMax),
        daily_run_time: document.getElementById('dailyTime').value || '09:30',
        daily_like_limit: existing?.daily_like_limit || 10,
        enabled: true,
        auto_follow_enabled: document.getElementById('autoFollow').checked,
        auto_like_enabled: document.getElementById('autoFollow').checked,
      };
    }
    async function load() {
      const [accountPayload, growthPayload] = await Promise.all([api('/api/accounts'), api('/api/growth')]);
      accounts = accountPayload.accounts || [];
      profiles = growthPayload.profiles || [];
      candidates = growthPayload.candidates || [];
      likeCandidates = growthPayload.like_candidates || [];
      renderAccounts();
      renderForm();
      renderCurrentLists();
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
    function renderForm() {
      const account = selectedAccount();
      const profile = selectedProfile();
      document.getElementById('profileName').value = profile?.name || (account ? account.display_name + ' 增长规则' : '');
      document.getElementById('persona').value = profile?.persona_description || '';
      document.getElementById('keywords').value = (profile?.seed_keywords || []).join(', ');
      document.getElementById('dailyMin').value = profile?.daily_follow_min || 3;
      document.getElementById('dailyMax').value = profile?.daily_follow_max || 5;
      document.getElementById('dailyTime').value = profile?.daily_run_time || '09:30';
      document.getElementById('autoFollow').checked = Boolean(profile?.auto_follow_enabled);
      document.getElementById('profileMeta').innerHTML = account
        ? '<div>当前账号：' + escapeHtml(account.display_name) + ' · ' + escapeHtml(account.account_id) + '</div>' +
          '<div>规则来源：' + escapeHtml(profile?.rules_source || '/Users/jason/Nova/XHS-mcp/data/growth/rules/' + accountProfileId(account.account_id) + '.md') + '</div>' +
          '<div>执行方式：保存后会只用这个账号搜索和生成计划</div>' +
          '<div>自动开关：' + escapeHtml(profile?.auto_follow_enabled || profile?.auto_like_enabled ? '已开启' : '未开启') + '</div>'
        : '';
    }
    function renderCurrentLists() {
      const profile = selectedProfile();
      renderCandidates(profile ? candidates.filter((item) => item.profile_id === profile.profile_id) : []);
      renderLikes(profile ? likeCandidates.filter((item) => item.profile_id === profile.profile_id) : []);
    }
    function renderCandidates(items) {
      if (!items.length) {
        document.getElementById('candidates').innerHTML = '<div class="empty">暂无计划。输入要找的人后，点击 Dry Run 或生成今日计划。</div>';
        return;
      }
      const rows = items.map((item) => '<tr>' +
        '<td><strong>' + escapeHtml(item.nickname) + '</strong><div class="muted">' + escapeHtml(item.user_id) + '</div></td>' +
        '<td>' + (item.matched_keywords || []).map((word) => '<span class="pill">' + escapeHtml(word) + '</span>').join('') + '</td>' +
        '<td>' + escapeHtml(item.score) + '</td>' +
        '<td><span class="pill">' + escapeHtml(item.status) + '</span></td>' +
        '<td>' + escapeHtml(item.latest_note?.title || '') + '</td>' +
      '</tr>').join('');
      document.getElementById('candidates').innerHTML = '<table><thead><tr><th>作者</th><th>命中词</th><th>分数</th><th>状态</th><th>来源笔记</th></tr></thead><tbody>' + rows + '</tbody></table>';
    }
    function renderLikes(items) {
      if (!items.length) {
        document.getElementById('likes').innerHTML = '<div class="empty">暂无点赞任务。只有已关注作者的新内容才会进入这里。</div>';
        return;
      }
      const rows = items.map((item) => '<tr>' +
        '<td><strong>' + escapeHtml(item.title) + '</strong><div class="muted">' + escapeHtml(item.note_id) + '</div></td>' +
        '<td>' + escapeHtml(item.nickname) + '</td>' +
        '<td>' + escapeHtml(item.account_id) + '</td>' +
        '<td><span class="pill">' + escapeHtml(item.status) + '</span></td>' +
        '<td><a href="' + escapeHtml(item.url) + '" target="_blank" rel="noreferrer">打开</a></td>' +
      '</tr>').join('');
      document.getElementById('likes').innerHTML = '<table><thead><tr><th>笔记</th><th>作者</th><th>账号</th><th>状态</th><th>链接</th></tr></thead><tbody>' + rows + '</tbody></table>';
    }
    async function saveRule() {
      const profile = buildProfileFromForm();
      if (!profile.persona_description) throw new Error('请输入要找的人群。');
      if (!profile.seed_keywords.length) throw new Error('请填写搜索关键词，或在人群描述里用逗号分隔关键词。');
      const saved = await api('/api/growth/profiles', { method: 'POST', body: JSON.stringify(profile) });
      const idx = profiles.findIndex((item) => item.profile_id === saved.profile.profile_id);
      if (idx >= 0) profiles[idx] = saved.profile;
      else profiles.push(saved.profile);
      renderForm();
      renderCurrentLists();
      return saved.profile;
    }
    async function runPlan(dryRun) {
      setMessage(dryRun ? '正在试运行...' : '正在保存规则并生成今日计划...');
      try {
        const profile = await saveRule();
        const result = await api('/api/growth/run-daily', {
          method: 'POST',
          body: JSON.stringify({ profile_id: profile.profile_id, dry_run: dryRun, limit_per_keyword: 3 }),
        });
        setMessage('完成：发现作者 ' + result.summary.discovered_authors + ' 个，计划关注 ' + result.summary.planned_follows + ' 个，点赞任务 ' + result.summary.like_candidates + ' 个。');
        if (dryRun) {
          renderCandidates(result.follow_candidates || []);
          renderLikes(result.like_candidates || []);
        } else {
          await load();
        }
      } catch (error) {
        setMessage(error.message);
      }
    }
    document.getElementById('account').addEventListener('change', () => {
      renderForm();
      renderCurrentLists();
    });
    load().catch((error) => setMessage(error.message));
  </script>
</body>
</html>`;
}
