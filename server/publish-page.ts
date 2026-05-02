export function renderPublishPage() {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>XHS 发布工作台</title>
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
    button { cursor: pointer; }
    button.primary { background: #20242a; color: #fff; border-color: #20242a; }
    button.danger { border-color: #fecdca; color: #b42318; }
    button:disabled { opacity: .55; cursor: not-allowed; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { border-bottom: 1px solid #edf0f4; padding: 10px 8px; text-align: left; vertical-align: top; }
    th { color: #667085; font-weight: 600; white-space: nowrap; }
    .row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; }
    .form-grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
    .muted { color: #667085; font-size: 12px; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
    .pill { display: inline-flex; border: 1px solid #d0d5dd; border-radius: 999px; padding: 2px 8px; margin: 2px 4px 0 0; color: #475467; background: #fff; }
    .empty { color: #667085; padding: 20px 8px; }
    .wide { min-width: min(420px, 100%); }
    .nav { display: flex; gap: 12px; align-items: center; }
    #message { min-height: 22px; color: #475467; }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>XHS 发布工作台</h1>
      <p>先选账号，再管理这个账号的待发布内容、发布任务和发布记录</p>
    </div>
    <div class="nav">
      <a href="/search">搜索</a>
      <a href="/growth">增长</a>
      <a href="/leads">线索</a>
      <a href="/admin">账号</a>
    </div>
  </header>
  <main>
    <section>
      <h2>账号</h2>
      <div class="row">
        <select id="account"></select>
        <button onclick="load()">刷新</button>
        <button class="primary" onclick="generateTask()">生成下一条发布任务</button>
        <span id="message"></span>
      </div>
      <p class="muted">素材默认放在 /Users/jason/Nova/XHS-mcp/data/publish/assets/，JSON 内容池在 /Users/jason/Nova/XHS-mcp/data/publish/content-pool.json。</p>
    </section>

    <section>
      <h2>从视频文件夹导入</h2>
      <div class="form-grid">
        <div class="grid">
          <input id="scanSourceDir" />
          <input id="scanArchiveDir" />
          <input id="scanLimit" type="number" min="1" max="100" value="20" />
          <input id="scanScheduleAt" type="datetime-local" title="小红书官方定时发布时间，可留空立即发布" />
        </div>
        <div class="row">
          <label class="row muted" style="gap:6px"><input id="scanSubmit" type="checkbox" checked /> OpenClaw 自动发布时真实提交</label>
          <label class="row muted" style="gap:6px"><input id="scanApproved" type="checkbox" checked /> 导入后直接视为已审核</label>
          <label class="row muted" style="gap:6px"><input id="requireCaption" type="checkbox" checked /> 必须有同名文案</label>
          <label class="muted">评论检查 <input id="scanCheckMinutes" type="number" min="1" max="1440" value="60" style="width:82px" /> 分钟后</label>
          <button onclick="scanVideoFolder()">扫描导入视频</button>
          <button class="primary" onclick="openClawPublishVideo()">一键发布一条</button>
        </div>
        <p class="muted">规则：视频和文案同名，例如 demo.mp4 + demo.txt / demo.md / demo.json。定时发布时间会交给小红书官方发布页，需设置为未来 1 小时到 14 天内；留空则立即发布。发布成功后视频和文案会移动到归档目录。</p>
      </div>
    </section>

    <section>
      <h2>加入内容池</h2>
      <div class="form-grid">
        <div class="row">
          <select id="type">
            <option value="note">图文</option>
            <option value="video">视频</option>
          </select>
          <input id="title" class="wide" placeholder="标题" />
          <input id="scheduleAt" type="datetime-local" />
        </div>
        <textarea id="content" placeholder="正文内容"></textarea>
        <input id="tags" placeholder="标签，用逗号分隔，如 留学, 加拿大, 选校" />
        <div class="grid">
          <input id="imagePaths" placeholder="图片路径，用逗号分隔，例：/Users/jason/Nova/XHS-mcp/data/publish/assets/note-001/1.jpg" />
          <input id="videoPath" placeholder="视频路径，例：/Users/jason/Nova/XHS-mcp/data/publish/assets/video-001/main.mp4" />
          <input id="coverPath" placeholder="封面路径，可选" />
        </div>
        <div class="row">
          <label class="muted">每日上限 <input id="dailyLimit" type="number" min="1" max="20" value="1" style="width:72px" /></label>
          <label class="muted">间隔小时 <input id="minInterval" type="number" min="0" max="72" value="6" style="width:72px" /></label>
          <label class="muted">失败重试 <input id="maxRetry" type="number" min="0" max="10" value="2" style="width:72px" /></label>
          <label class="muted">评论检查 <input id="checkMinutes" type="number" min="1" max="1440" value="60" style="width:82px" /> 分钟后</label>
          <label class="row muted" style="gap:6px"><input id="submit" type="checkbox" /> 真实提交</label>
          <label class="row muted" style="gap:6px"><input id="approved" type="checkbox" /> 已审核</label>
          <button onclick="addContent()">保存到内容池</button>
        </div>
      </div>
    </section>

    <section>
      <h2>当前账号内容池</h2>
      <div id="contentPool"></div>
    </section>

    <section>
      <h2>当前账号发布任务</h2>
      <div id="tasks"></div>
    </section>

    <section>
      <h2>当前账号发布记录</h2>
      <div id="records"></div>
    </section>
  </main>
  <script>
    let accounts = [];
    let pool = [];
    let tasks = [];
    let records = [];

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
    function splitList(value) {
      return String(value || '').split(/[，,\\n]+/).map((item) => item.trim()).filter(Boolean);
    }
    function dateTimeLocalToIso(elementId) {
      const value = document.getElementById(elementId).value;
      return value ? new Date(value).toISOString() : null;
    }
    function selectedAccountId() {
      return document.getElementById('account').value;
    }
    function setMessage(text) {
      document.getElementById('message').textContent = text || '';
    }
    function renderAccounts() {
      const current = selectedAccountId();
      document.getElementById('account').innerHTML = accounts.map((account) => {
        const runtime = account.runtime || {};
        const status = runtime.reachable ? '可用' : '可自动启动';
        return '<option value="' + escapeHtml(account.account_id) + '">' +
          escapeHtml(account.display_name) + ' · ' + escapeHtml(status) +
        '</option>';
      }).join('');
      if (current) document.getElementById('account').value = current;
    }
    function renderPool() {
      const accountId = selectedAccountId();
      const items = pool.filter((item) => (item.target_accounts || []).includes(accountId));
      if (!items.length) {
        document.getElementById('contentPool').innerHTML = '<div class="empty">这个账号暂无待发布内容。</div>';
        return;
      }
      const rows = items.map((item) => {
        const assets = item.type === 'video'
          ? escapeHtml(item.video_path || '')
          : escapeHtml((item.image_paths || []).join(', '));
        const tags = (item.tags || []).map((tag) => '<span class="pill">' + escapeHtml(tag) + '</span>').join('');
        const queued = item.queued_at_by_account?.[accountId] ? '<span class="pill">已生成任务</span>' : '';
        const approved = item.approved ? '<span class="pill">已审核</span>' : '<span class="pill">待审核</span>';
        return '<tr>' +
          '<td><strong>' + escapeHtml(item.title || '无标题') + '</strong><div class="muted mono">' + escapeHtml(item.content_id) + '</div><div class="muted">' + escapeHtml(item.content).slice(0, 160) + '</div></td>' +
          '<td>' + escapeHtml(item.type) + '</td>' +
          '<td>' + tags + '</td>' +
          '<td class="mono">' + assets + '</td>' +
          '<td>' + approved + queued + '<div class="muted">状态：' + escapeHtml(item.status) + '</div></td>' +
          '<td>' + escapeHtml(item.schedule_at || '立即') + '</td>' +
          '<td><button onclick="approveContent(\\'' + escapeHtml(item.content_id) + '\\')">审核内容</button></td>' +
        '</tr>';
      }).join('');
      document.getElementById('contentPool').innerHTML =
        '<table><thead><tr><th>内容</th><th>类型</th><th>标签</th><th>素材</th><th>状态</th><th>计划时间</th><th>操作</th></tr></thead><tbody>' +
        rows + '</tbody></table>';
    }
    function renderTasks() {
      const accountId = selectedAccountId();
      const items = tasks.filter((task) => task.account_id === accountId);
      if (!items.length) {
        document.getElementById('tasks').innerHTML = '<div class="empty">这个账号暂无发布任务。先保存内容，再点击生成下一条发布任务。</div>';
        return;
      }
      const rows = items.map((task) => {
        const title = task.payload?.title || task.payload?.content_id || '';
        const canApprove = task.status === 'needs_approval';
        return '<tr>' +
          '<td><strong>' + escapeHtml(title) + '</strong><div class="muted mono">' + escapeHtml(task.task_id) + '</div></td>' +
          '<td>' + escapeHtml(task.type) + '</td>' +
          '<td><span class="pill">' + escapeHtml(task.status) + '</span></td>' +
          '<td>' + escapeHtml(task.run_at || '') + '</td>' +
          '<td>' + escapeHtml(task.error || '') + '</td>' +
          '<td>' + (canApprove ? '<button class="danger" onclick="approveTask(\\'' + escapeHtml(task.task_id) + '\\')">批准进入发布队列</button>' : '') + '</td>' +
        '</tr>';
      }).join('');
      document.getElementById('tasks').innerHTML =
        '<table><thead><tr><th>任务</th><th>类型</th><th>状态</th><th>执行时间</th><th>错误</th><th>操作</th></tr></thead><tbody>' +
        rows + '</tbody></table>';
    }
    function renderRecords() {
      if (!records.length) {
        document.getElementById('records').innerHTML = '<div class="empty">这个账号暂无发布记录。</div>';
        return;
      }
      const rows = records.map((record) => '<tr>' +
        '<td>' + escapeHtml(record.ts) + '</td>' +
        '<td><strong>' + escapeHtml(record.title || record.content_id || '') + '</strong><div class="muted mono">' + escapeHtml(record.content_id || '') + '</div></td>' +
        '<td>' + escapeHtml(record.type) + '</td>' +
        '<td><span class="pill">' + escapeHtml(record.status) + '</span></td>' +
        '<td>' + escapeHtml(record.error || '') + '</td>' +
      '</tr>').join('');
      document.getElementById('records').innerHTML =
        '<table><thead><tr><th>时间</th><th>内容</th><th>类型</th><th>状态</th><th>错误</th></tr></thead><tbody>' +
        rows + '</tbody></table>';
    }
    async function load() {
      const currentAccount = selectedAccountId();
      const [accountPayload, poolPayload] = await Promise.all([
        api('/api/accounts'),
        api('/api/publish/content-pool'),
      ]);
      accounts = accountPayload.accounts || [];
      pool = poolPayload.items || [];
      renderAccounts();
      if (currentAccount) document.getElementById('account').value = currentAccount;
      applyDefaultAccountDirs();
      const accountId = selectedAccountId();
      const [taskPayload, recordPayload] = await Promise.all([
        api('/api/publish/tasks' + (accountId ? '?account_id=' + encodeURIComponent(accountId) : '')),
        api('/api/publish/records?limit=50' + (accountId ? '&account_id=' + encodeURIComponent(accountId) : '')),
      ]);
      tasks = taskPayload.tasks || [];
      records = recordPayload.items || [];
      renderPool();
      renderTasks();
      renderRecords();
    }
    async function addContent() {
      const accountId = selectedAccountId();
      if (!accountId) return setMessage('请先选择账号。');
      const payload = {
        type: document.getElementById('type').value,
        title: document.getElementById('title').value.trim(),
        content: document.getElementById('content').value.trim(),
        tags: splitList(document.getElementById('tags').value),
        image_paths: splitList(document.getElementById('imagePaths').value),
        video_path: document.getElementById('videoPath').value.trim() || null,
        cover_path: document.getElementById('coverPath').value.trim() || null,
        target_accounts: [accountId],
        schedule_at: dateTimeLocalToIso('scheduleAt'),
        submit: document.getElementById('submit').checked,
        approval_required: true,
        approved: document.getElementById('approved').checked,
        daily_limit: Number(document.getElementById('dailyLimit').value || 1),
        min_interval_hours: Number(document.getElementById('minInterval').value || 6),
        max_retry: Number(document.getElementById('maxRetry').value || 2),
        check_comments_after_minutes: Number(document.getElementById('checkMinutes').value || 60),
      };
      if (!payload.title || !payload.content) return setMessage('标题和正文必填。');
      if (payload.type === 'note' && !payload.image_paths.length) return setMessage('图文内容需要至少一张图片路径。');
      if (payload.type === 'video' && !payload.video_path) return setMessage('视频内容需要视频路径。');
      const result = await api('/api/publish/content-pool', { method: 'POST', body: JSON.stringify(payload) });
      setMessage('已加入内容池：' + result.item.content_id);
      await load();
    }
    async function scanVideoFolder() {
      const accountId = selectedAccountId();
      if (!accountId) return setMessage('请先选择账号。');
      const payload = {
        account_id: accountId,
        source_dir: document.getElementById('scanSourceDir').value.trim(),
        archive_dir: document.getElementById('scanArchiveDir').value.trim(),
        limit: Number(document.getElementById('scanLimit').value || 20),
        submit: document.getElementById('scanSubmit').checked,
        approved: document.getElementById('scanApproved').checked,
        approval_required: !document.getElementById('scanApproved').checked,
        schedule_at: dateTimeLocalToIso('scanScheduleAt'),
        check_comments_after_minutes: Number(document.getElementById('scanCheckMinutes').value || 60),
        require_caption: document.getElementById('requireCaption').checked,
      };
      const result = await api('/api/publish/scan-video-folder', { method: 'POST', body: JSON.stringify(payload) });
      setMessage('已从文件夹导入 ' + result.count + ' 条视频，跳过 ' + (result.skipped || []).length + ' 条。');
      await load();
    }
    async function openClawPublishVideo() {
      const accountId = selectedAccountId();
      if (!accountId) return setMessage('请先选择账号。');
      const submit = document.getElementById('scanSubmit').checked;
      if (submit && !confirm('这会调用真实发布流程。确认让当前账号发布一条视频吗？')) return;
      const payload = {
        account_id: accountId,
        source_dir: document.getElementById('scanSourceDir').value.trim(),
        archive_dir: document.getElementById('scanArchiveDir').value.trim(),
        scan_limit: Number(document.getElementById('scanLimit').value || 20),
        max_publish_count: 1,
        submit,
        approved: document.getElementById('scanApproved').checked,
        approval_required: !document.getElementById('scanApproved').checked,
        require_caption: document.getElementById('requireCaption').checked,
        schedule_at: dateTimeLocalToIso('scanScheduleAt'),
        check_comments_after_minutes: Number(document.getElementById('scanCheckMinutes').value || 60),
        execute: true,
      };
      const result = await api('/api/openclaw/publish-video', { method: 'POST', body: JSON.stringify(payload) });
      setMessage('导入 ' + result.imported_count + ' 条，生成 ' + result.generated_count + ' 个任务，执行 ' + result.executed_count + ' 个任务。');
      await load();
    }
    async function approveContent(contentId) {
      await api('/api/publish/content-pool/' + encodeURIComponent(contentId) + '/approve', { method: 'POST' });
      setMessage('内容已审核。');
      await load();
    }
    async function generateTask() {
      const result = await api('/api/publish/generate-task', { method: 'POST' });
      setMessage(result.task ? '已生成任务：' + result.task.task_id : '没有符合条件的待发布内容。');
      await load();
    }
    async function approveTask(taskId) {
      if (!confirm('批准后任务会进入待执行队列；如果调度器正在运行，可能会真实调用发布接口。确认继续吗？')) return;
      await api('/api/publish/tasks/' + encodeURIComponent(taskId) + '/approve', { method: 'POST' });
      setMessage('任务已批准进入发布队列。');
      await load();
    }
    document.getElementById('account').addEventListener('change', () => {
      applyDefaultAccountDirs();
      load().catch((error) => setMessage(error.message));
    });
    function safeAccountId(accountId) {
      return String(accountId || 'xhs_default').replace(/[^a-zA-Z0-9_-]+/g, '_') || 'xhs_default';
    }
    function applyDefaultAccountDirs() {
      const id = safeAccountId(selectedAccountId());
      document.getElementById('scanSourceDir').value = '/Users/jason/Nova/XHS-mcp/data/publish/assets/accounts/' + id + '/video-inbox';
      document.getElementById('scanArchiveDir').value = '/Users/jason/Nova/XHS-mcp/data/publish/assets/accounts/' + id + '/published';
    }
    load().catch((error) => setMessage(error.message));
  </script>
</body>
</html>`;
}
