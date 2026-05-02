# OpenClaw 操作手册

这份手册给 OpenClaw 带着用户一步一步操作使用。优先读 `OPENCLAW_FUNCTION_MAP.md`，再读本手册。

## 0. 启动和检查

进入目录：

```bash
cd /Users/jason/Nova/XHS-mcp
```

检查服务：

```bash
curl -s http://127.0.0.1:18160/health
```

如果服务没启动：

```bash
npm run dev
```

打开页面：

```text
http://127.0.0.1:18160/admin
```

## 1. 账号管理

页面：

```text
http://127.0.0.1:18160/admin
```

OpenClaw 操作步骤：

1. 读取账号列表。
2. 告诉用户每个账号的 `account_id`、显示名称、端口、登录状态。
3. 如果账号未登录，引导用户点击“获取二维码”并扫码。
4. 扫码后点击“检查登录”。

接口：

```bash
curl -s http://127.0.0.1:18160/api/accounts
```

检查登录：

```bash
curl -s http://127.0.0.1:18160/api/accounts/xhs_test_01/login-status -X POST -H 'Content-Type: application/json' -d '{}'
```

获取二维码：

```bash
curl -s http://127.0.0.1:18160/api/accounts/xhs_test_01/login-qrcode -X POST -H 'Content-Type: application/json' -d '{}'
```

## 2. 搜索笔记

页面：

```text
http://127.0.0.1:18160/search
```

用户需要提供：

```text
账号：例如 xhs_test_01
主题：例如 美国签证
```

OpenClaw 应生成：

```text
搜索关键词：美国签证、美签面签、DS160、美签被拒
评论筛选词：签证、面签、被拒、请问、费用、材料
```

接口：

```bash
curl -s http://127.0.0.1:18160/api/search \
  -H 'Content-Type: application/json' \
  -d '{
    "keyword": "美国签证",
    "account_ids": ["xhs_test_01"],
    "limit_per_account": 10,
    "dedupe": true
  }'
```

输出给用户：

```text
搜索完成：
- 账号：xhs_test_01
- 关键词：美国签证
- 笔记数量：xx 条
- 下一步：是否从评论里筛选线索？
```

## 3. 查看笔记评论

用于单篇笔记检查评论内容。

接口：

```bash
curl -s http://127.0.0.1:18160/api/feed-detail \
  -H 'Content-Type: application/json' \
  -d '{
    "account_id": "xhs_test_01",
    "note_id": "笔记ID",
    "xsec_token": "搜索结果里的 xsec_token",
    "load_all_comments": false,
    "limit": 20
  }'
```

OpenClaw 只读取评论，不回复、不点赞、不关注。

## 4. 从评论找客户线索

前提：已经完成搜索，并拿到 `search_response`。

接口：

```bash
curl -s http://127.0.0.1:18160/api/search/comment-leads \
  -H 'Content-Type: application/json' \
  -d '{
    "search_response": SEARCH_RESPONSE_JSON,
    "keywords": ["签证", "面签", "被拒", "请问", "费用", "材料"],
    "max_notes": 10,
    "load_all_comments": false,
    "comments_limit": 20
  }'
```

结果会写入：

```text
/Users/jason/Nova/XHS-mcp/data/leads/leads.json
```

输出给用户：

```text
评论筛选完成：
- 深挖笔记：xx 篇
- 扫描评论：xx 条
- 命中线索：xx 条
- 下一步：生成客户线索汇总报表
```

## 5. 生成客户线索汇总报表

页面按钮：

```text
/search 页面里的“生成线索汇总表”
```

接口：

```bash
curl -s http://127.0.0.1:18160/api/leads/profile-summary \
  -H 'Content-Type: application/json' \
  -d '{
    "account_id": "xhs_test_01",
    "limit": 50,
    "search_response": SEARCH_RESPONSE_JSON,
    "comment_keywords": ["签证", "面签", "被拒", "请问", "费用", "材料"],
    "max_notes": 10,
    "comments_limit": 20
  }'
```

报表位置：

```text
/Users/jason/Nova/XHS-mcp/data/leads/reports/
```

报表结构：

```text
1. 本次搜索任务
2. 评论筛选规则
3. 筛选出的客户线索
4. 给客户的处理建议
```

OpenClaw 输出给用户：

```text
报表已生成：
- Markdown：/Users/jason/Nova/XHS-mcp/data/leads/reports/xxx.md
- JSON：/Users/jason/Nova/XHS-mcp/data/leads/reports/xxx.json

建议人工优先查看评论内容明确表达需求的线索。
```

## 6. 查看线索池

页面：

```text
http://127.0.0.1:18160/leads
```

接口：

```bash
curl -s 'http://127.0.0.1:18160/api/leads?account_id=xhs_test_01'
```

用途：

```text
查看某个账号已经沉淀的线索。
```

## 7. 增长计划

页面：

```text
http://127.0.0.1:18160/growth
```

当前定位：

```text
生成关注候选和观察对象，不自动关注。
```

保存画像：

```bash
curl -s http://127.0.0.1:18160/api/growth/profiles \
  -H 'Content-Type: application/json' \
  -d '{
    "profile_id": "study_visa_leads",
    "name": "留学签证潜在人群",
    "account_ids": ["xhs_test_01"],
    "target_persona": "准备美国签证、加拿大签证、留学申请的人",
    "seed_keywords": ["美国签证", "加拿大签证", "美签面签", "DS160"],
    "daily_follow_min": 3,
    "daily_follow_max": 5,
    "auto_follow_enabled": false,
    "auto_like_enabled": false
  }'
```

运行计划：

```bash
curl -s http://127.0.0.1:18160/api/growth/run-daily \
  -H 'Content-Type: application/json' \
  -d '{
    "profile_id": "study_visa_leads",
    "limit_per_keyword": 5
  }'
```

## 8. 发布工作台

页面：

```text
http://127.0.0.1:18160/publish
```

发布是对外动作。OpenClaw 必须先确认：

```text
账号
素材文件
文案文件
是否立即发布
```

每个账号的视频素材目录：

```text
/Users/jason/Nova/XHS-mcp/data/publish/assets/accounts/{account_id}/video-inbox/
```

同名文案文件：

```text
视频：test-video.mp4
文案：test-video.json
```

一键发布接口：

```bash
curl -s http://127.0.0.1:18160/api/openclaw/publish-video \
  -H 'Content-Type: application/json' \
  -d '{
    "account_id": "xhs_test_01"
  }'
```

发布完成后素材归档到：

```text
/Users/jason/Nova/XHS-mcp/data/publish/assets/accounts/{account_id}/published/
```

## 9. 每日推荐流程

适合 OpenClaw 每天带用户跑：

1. 检查服务 `/health`。
2. 检查账号登录 `/api/accounts`。
3. 问用户今天的业务主题和账号。
4. 生成搜索关键词和评论筛选词。
5. 搜索笔记。
6. 深挖评论。
7. 生成客户线索报表。
8. 把报表路径给用户。
9. 提醒用户人工查看和关注，不做自动互动。

## 10. 禁止 OpenClaw 执行的动作

即使接口或底层 MCP 有能力，也不要执行：

```text
自动关注
自动私信
自动回复评论
自动点赞
自动收藏
批量互动
```

当前系统已经在后端禁用了点赞、收藏、评论、回复等互动工具。
