export function renderAdminPage() {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>XHS MCP 管理台</title>
  <style>
    :root { color-scheme: light; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; background: #f6f7f9; color: #20242a; }
    header { background: #ffffff; border-bottom: 1px solid #e7e9ee; padding: 18px 24px; display: flex; justify-content: space-between; align-items: center; gap: 16px; }
    main { max-width: 1120px; margin: 0 auto; padding: 24px; }
    h1 { font-size: 22px; margin: 0 0 4px; }
    h2 { font-size: 16px; margin: 0 0 14px; }
    p { margin: 0; color: #667085; }
    section { background: #fff; border: 1px solid #e7e9ee; border-radius: 8px; padding: 18px; margin-bottom: 18px; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th, td { border-bottom: 1px solid #edf0f4; padding: 10px 8px; text-align: left; vertical-align: top; }
    th { color: #667085; font-weight: 600; }
    input { height: 36px; border: 1px solid #d0d5dd; border-radius: 6px; padding: 0 10px; min-width: 160px; }
    button { height: 34px; border: 1px solid #cfd6e4; background: #fff; border-radius: 6px; padding: 0 10px; cursor: pointer; }
    button.primary { background: #20242a; color: #fff; border-color: #20242a; }
    button:disabled { opacity: .5; cursor: not-allowed; }
    .row { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
    .status { display: inline-flex; align-items: center; gap: 6px; }
    .dot { width: 8px; height: 8px; border-radius: 999px; background: #98a2b3; }
    .dot.on { background: #17b26a; }
    .muted { color: #667085; font-size: 13px; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
    #message { min-height: 22px; margin: 10px 0 0; color: #475467; }
    .nav { display: flex; gap: 12px; align-items: center; }
    a { color: #175cd3; text-decoration: none; }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>XHS MCP 管理台</h1>
      <p>多账号、本地 MCP 实例、登录状态和启动/停止管理</p>
    </div>
    <div class="nav">
      <a href="/search">搜索</a>
      <a href="/growth">增长</a>
      <a href="/leads">线索</a>
      <a href="/publish">发布</a>
    </div>
  </header>
  <main>
    <section>
      <h2>新增账号</h2>
      <div class="row">
        <input id="accountId" placeholder="account_id，如 xhs_edu_02" />
        <input id="displayName" placeholder="显示名" />
        <input id="port" placeholder="端口，可空" inputmode="numeric" />
        <button class="primary" onclick="createAccount()">创建账号目录</button>
      </div>
      <p id="message"></p>
    </section>
    <section>
      <h2>账号实例</h2>
      <table>
        <thead>
          <tr>
            <th>账号</th>
            <th>端口 / MCP</th>
            <th>运行</th>
            <th>目录</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody id="accounts"></tbody>
      </table>
    </section>
  </main>
  <script>
    let qrPollTimer = null;

    async function api(path, options) {
      const response = await fetch(path, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'request failed');
      return payload;
    }
    function setMessage(text) {
      document.getElementById('message').textContent = text || '';
    }
    async function refresh() {
      const payload = await api('/api/accounts');
      const rows = payload.accounts.map((item) => {
        const account = item;
        const runtime = item.runtime || {};
        const running = runtime.running;
        const statusText = runtime.managed ? '管理台启动' : (runtime.reachable ? '端口可访问' : '未启动');
        return '<tr>' +
          '<td><strong>' + account.display_name + '</strong><div class="muted mono">' + account.account_id + '</div></td>' +
          '<td><div>' + account.port + '</div><div class="muted mono">' + account.mcp_url + '</div></td>' +
          '<td><span class="status"><span class="dot ' + (running ? 'on' : '') + '"></span>' + statusText + '</span><div class="muted">' + (runtime.pid ? 'PID ' + runtime.pid : (runtime.reachable && !runtime.managed ? '外部进程' : '')) + '</div></td>' +
          '<td class="muted mono">' + account.work_dir + '</td>' +
          '<td class="row">' +
            '<button onclick="startAccount(\\'' + account.account_id + '\\')">启动</button>' +
            '<button onclick="stopAccount(\\'' + account.account_id + '\\')">停止</button>' +
            '<button onclick="checkLogin(\\'' + account.account_id + '\\')">检查登录</button>' +
            '<button onclick="getQr(\\'' + account.account_id + '\\')">获取二维码</button>' +
          '</td>' +
        '</tr>';
      }).join('');
      document.getElementById('accounts').innerHTML = rows || '<tr><td colspan="5">暂无账号</td></tr>';
    }
    async function createAccount() {
      try {
        const account_id = document.getElementById('accountId').value.trim();
        const display_name = document.getElementById('displayName').value.trim();
        const portValue = document.getElementById('port').value.trim();
        await api('/api/accounts', {
          method: 'POST',
          body: JSON.stringify({ account_id, display_name, port: portValue ? Number(portValue) : undefined }),
        });
        setMessage('账号已创建。下一步启动它，再获取二维码登录。');
        await refresh();
      } catch (error) {
        setMessage(error.message);
      }
    }
    async function startAccount(account_id) {
      try {
        const result = await api('/api/accounts/' + account_id + '/start', { method: 'POST', body: '{}' });
        setMessage(account_id + ': ' + result.message);
        await refresh();
      } catch (error) {
        setMessage(error.message);
      }
    }
    async function stopAccount(account_id) {
      try {
        const result = await api('/api/accounts/' + account_id + '/stop', { method: 'POST', body: '{}' });
        setMessage(account_id + ': ' + result.message);
        await refresh();
      } catch (error) {
        setMessage(error.message);
      }
    }
    async function checkLogin(account_id) {
      try {
        const result = await api('/api/accounts/' + account_id + '/login-status', { method: 'POST', body: '{}' });
        const text = result.result && result.result.content && result.result.content[0] ? result.result.content[0].text : JSON.stringify(result);
        setMessage(account_id + ': ' + text.replace(/\\n/g, ' / '));
        return text;
      } catch (error) {
        setMessage(error.message);
        return '';
      }
    }
    function startLoginPolling(account_id) {
      if (qrPollTimer) clearInterval(qrPollTimer);
      let attempts = 0;
      qrPollTimer = setInterval(async () => {
        attempts += 1;
        const text = await checkLogin(account_id);
        if (text.includes('已登录')) {
          clearInterval(qrPollTimer);
          qrPollTimer = null;
          setMessage(account_id + ': 已登录，可以使用这个账号了。');
          await refresh();
        } else if (attempts >= 30) {
          clearInterval(qrPollTimer);
          qrPollTimer = null;
          setMessage(account_id + ': 还没检测到登录，请重新获取二维码或手动点检查登录。');
        }
      }, 3000);
    }
    async function getQr(account_id) {
      try {
        let result;
        try {
          result = await api('/api/accounts/' + account_id + '/login-qrcode', { method: 'POST', body: '{}' });
        } catch (firstError) {
          await api('/api/accounts/' + account_id + '/start', { method: 'POST', body: '{}' });
          result = await api('/api/accounts/' + account_id + '/login-qrcode', { method: 'POST', body: '{}' });
        }
        const items = result.result && result.result.content ? result.result.content : [];
        const textItem = items.find((entry) => entry.text);
        const imageItem = items.find((entry) => entry.data && entry.mimeType);
        if (imageItem) {
          setMessage(account_id + ': ' + (textItem && textItem.text ? textItem.text.replace(/\\n/g, ' / ') : '二维码已返回。') + ' 扫码后我会自动检查登录状态。');
          const old = document.getElementById('qrPreview');
          if (old) old.remove();
          const img = document.createElement('img');
          img.id = 'qrPreview';
          img.alt = 'login qrcode';
          img.style.marginTop = '10px';
          img.style.width = '220px';
          img.style.height = '220px';
          img.src = 'data:' + imageItem.mimeType + ';base64,' + imageItem.data;
          document.getElementById('message').after(img);
          startLoginPolling(account_id);
          return;
        }
        const item = items[0];
        const text = item && item.text ? item.text : JSON.stringify(result);
        setMessage(account_id + ': ' + text.replace(/\\n/g, ' / '));
      } catch (error) {
        setMessage(error.message);
      }
    }
    refresh();
  </script>
</body>
</html>`;
}
