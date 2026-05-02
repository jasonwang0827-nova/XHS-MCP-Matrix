# 技术问题复盘：2026-05-02 评论线索采集

## 背景

今天跑小红书评论线索采集时，OpenClaw 在大批量读取笔记评论和导出线索报表过程中遇到几个稳定性问题。本文记录现象、判断、已修复项和后续建议。

## 1. 小红书 MCP 获取 Feed 详情频繁 500

### 现象

- 扫多篇笔记评论时，部分 `/api/feed-detail` 返回上游 500。
- 典型错误包括：

```text
feed xxx not found in noteDetailMap
upstream HTTP 500: Internal Server Error
```

### 判断

Matrix server 的 `/api/feed-detail` 会把 `account_id` 传给 `toolRegistry.get_feed_detail`，最终通过 `getUpstreamClientForAccount(account_id)` 转发到对应账号的 MCP 地址。因此不是 health 里显示 18060 导致所有详情请求都走默认账号。

真正风险更可能在上游小红书 MCP：

- 笔记详情页打不开
- `xsec_token` 失效
- 笔记类型或状态特殊
- 上游 MCP 内部 `noteDetailMap` 没缓存到目标笔记
- 小红书页面风控/跳转/加载失败

### 已修复/加固

- `/api/feed-detail` 响应新增 `mcp_url`，方便确认实际路由到哪个 MCP 实例。
- `getFeedDetail` 支持 `detail_timeout_ms`，允许大批量任务降低单篇等待时间。
- 评论解析新增二级评论归一化，`subComments` 会进入 `comments` 列表，并带 `level` 和 `parent_comment_id`。

## 2. `/api/search/comment-leads` 大批量超时

### 现象

- 一次性传 10 篇笔记且 `load_all_comments: true` 时容易超时。
- 原因是系统按笔记逐篇读取详情，每篇详情原本最多等待 45 秒，总耗时会线性增长。

### 判断

目前不建议并发打同一个小红书账号的多个详情请求。上游 MCP 多数是浏览器/页面自动化式操作，并发会更容易互相干扰。

更稳妥的方式是：

- 顺序处理
- 单篇设置较短超时
- 失败不中断全局
- 每次保存部分报告
- OpenClaw 分批跑

### 已修复/加固

`/api/search/comment-leads` 已新增：

- `detail_timeout_ms`：单篇详情超时，默认 30000ms
- `save_partial_report`：默认保存本次运行报告
- `started_at` / `finished_at`
- `options`
- `requested_notes`
- 每篇错误保留 `account_id`、`note_id`、`title`、`error`
- 报告保存目录：

```text
/Users/jason/Nova/XHS-mcp/data/reports/comment-leads/
```

推荐 OpenClaw 大批量时分批：

```json
{
  "max_notes": 5,
  "load_all_comments": false,
  "comments_limit": 20,
  "detail_timeout_ms": 25000
}
```

## 3. 上游 MCP 地址路由疑问

### 现象

`/health` 显示：

```text
upstream: http://localhost:18060/mcp
```

但用户实际可能选择 `xhs_test_01`，它在：

```text
http://127.0.0.1:18061/mcp
```

### 判断

`/health` 显示的是默认 upstream，不代表所有请求都走 18060。

实际账号路由逻辑：

```text
请求 body.account_id
-> getUpstreamClientForAccount(account_id)
-> accounts.json 里的 account.mcp_url
```

### 已修复/加固

- `/api/feed-detail` 返回 `mcp_url`，后续排查可以直接看详情请求实际打到了哪个 MCP。

## 4. Excel 生成流程不够自动化

### 现象

当前主要输出：

- Markdown 报告
- JSON 数据

Excel 需要额外脚本转换。

### 建议

短期：

- 增加 CSV 输出，Excel 可直接打开。

中期：

- 增加 `/api/leads/profile-summary` 的 `format: "xlsx"` 或 `include_csv: true`。
- 保存到同一 reports 目录。

## 当前建议给 OpenClaw 的执行策略

### 稳定优先模式

```json
{
  "max_notes": 5,
  "load_all_comments": false,
  "comments_limit": 20,
  "detail_timeout_ms": 25000
}
```

### 高评论笔记单独深挖

对于评论数特别高的笔记，不要混在批量任务里跑。单篇执行：

```json
{
  "account_id": "xhs_test_01",
  "note_id": "目标笔记ID",
  "xsec_token": "目标token",
  "load_all_comments": true,
  "limit": 50,
  "click_more_replies": false,
  "detail_timeout_ms": 60000
}
```

### 失败重试

遇到 500：

1. 记录 `account_id`、`note_id`、`xsec_token`、错误信息。
2. 不阻塞整批任务。
3. 重启对应账号 MCP。
4. 单篇重试一次。
5. 仍失败则加入报告的失败笔记列表。

## 仍待做

- CSV/XLSX 自动导出。
- `/health` 增加账号实例状态摘要，减少默认 upstream 误解。
- 评论线索页面展示失败笔记和失败原因。
