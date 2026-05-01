# XHS MCP Matrix

Local Xiaohongshu matrix wrapper for the existing `xiaohongshu-mcp` binary service.

This project does not reimplement Xiaohongshu browser automation in the first version. It calls the upstream MCP service at `http://localhost:18060/mcp`, then adds a local tool API, task queue, scheduler, and account state layer shaped like the existing `douyin-mcp` matrix project.

## Prerequisites

Start the upstream Xiaohongshu service first:

```bash
cd /Users/jason/AI_Workspace/xiaohongshu-mcp
./xiaohongshu-mcp-darwin-arm64
```

Optional config:

```bash
cp config.example.json config.json
```

## Run

```bash
npm install
npm run dev
```

Local wrapper endpoints:

- `GET /health`
- `GET /admin`
- `GET /tools`
- `POST /tools/call`
- `GET /api/accounts`
- `POST /api/accounts`

Open the local admin page:

```text
http://127.0.0.1:18160/admin
```

## Multi-account MCP Instances

The wrapper supports multiple local Xiaohongshu MCP instances.

One account maps to:

- one `account_id`
- one local port
- one MCP URL
- one isolated working directory
- one isolated `cookies.json`

Example:

```text
xhs_default -> http://localhost:18060/mcp -> /Users/jason/AI_Workspace/xiaohongshu-mcp
xhs_test_01 -> http://127.0.0.1:18061/mcp -> /Users/jason/Nova/XHS-mcp/data/accounts/xhs_test_01
```

Admin actions:

- create account directory
- start account MCP instance
- stop account MCP instance
- check login status
- get login QR code

CLI helpers:

```bash
npm run dev:list-accounts
npm run dev:create-account -- xhs_edu_02 "留学账号 02"
npm run dev:start-account -- xhs_edu_02
npm run dev:check-account-login -- xhs_edu_02
npm run dev:check-two-accounts -- xhs_default xhs_edu_02
npm run dev:verify-multi-account -- "加拿大留学" xhs_default xhs_edu_02
npm run dev:stop-account -- xhs_edu_02
```

Tool calls can route to a specific account by passing `account_id`:

```json
{
  "name": "search_feeds",
  "arguments": {
    "account_id": "xhs_edu_02",
    "keyword": "加拿大留学"
  }
}
```

## Tool Names

- `check_login_status`
- `get_login_qrcode`
- `delete_cookies`
- `publish_content`
- `publish_with_video`
- `list_feeds`
- `search_feeds`
- `get_feed_detail`
- `user_profile`
- `like_feed`
- `favorite_feed`
- `post_comment`
- `post_comment_to_feed`
- `reply_comment`
- `reply_comment_in_feed`
- `list_xhs_accounts`
- `create_xhs_account`
- `start_xhs_account`
- `stop_xhs_account`
- `check_xhs_account_login`
- `get_xhs_account_login_qrcode`
- `list_client_profiles`
- `get_client_profile`
- `safety_check_content`
- `create_reply_suggestion`
- `create_client_search_plan`

## Client Profiles

Built-in client ids:

- `client_a_edu_immigration`: 留学 / 移民业务
- `client_b_private_care`: 成人用品 / 私密护理业务
- `client_c_blindbox_supply`: 盲盒 / 潮玩 / 工厂货源业务

Client B uses strict safety checks. Comment and reply tasks for Client B default to draft-only mode; they generate a suggested reply and do not call the upstream comment tools unless the task payload includes `"auto_send": true`.

Useful checks:

```bash
npm run dev:list-clients
npm run dev:search-plan -- client_a_edu_immigration
npm run dev:safety-check -- client_b_private_care "测评" "这是一篇亲密关系和私密护理测评" '["私密护理"]'
npm run dev:reply-suggestion -- client_b_private_care "这个适合新手吗"
```

## Scheduler

Tasks are stored in `data/jobs/tasks.json`.

```bash
npm run dev:enqueue-task -- publish_content account_xhs_1 '{"title":"test","content":"hello","images":["/absolute/path/image.jpg"]}'
npm run dev:enqueue-task -- post_comment account_xhs_1 '{"client_id":"client_b_private_care","feed_id":"...","xsec_token":"...","content":"建议回复内容","source_comment":"用户原评论"}'
npm run dev:run-next-task
```

## Discovery Pipeline

The Xiaohongshu discovery flow follows the same business shape as the Douyin matrix interaction flow:

1. search notes by account
2. sync signatures to avoid repeated follow-up
3. score leads with rules
4. write leads to `data/leads/leads.json`
5. generate reply draft suggestions only
6. write discovery reports under `data/reports/discovery/`

Run a dry run first:

```bash
npm run dev:run-matrix-discovery -- --accounts all --keyword 加拿大留学 --limit_per_account 3 --dry_run true
```

Run selected logged-in accounts:

```bash
npm run dev:run-matrix-discovery -- --accounts xhs_default,xhs_test_01 --keyword 加拿大留学 --limit_per_account 5 --dry_run false --only_new true
```

Notes:

- One account failure does not stop the matrix run.
- Unready or not-logged-in accounts are skipped and recorded in the matrix report.
- Reply drafts are suggestions only; this pipeline does not send comments, likes, favorites, DMs, or publish content.
