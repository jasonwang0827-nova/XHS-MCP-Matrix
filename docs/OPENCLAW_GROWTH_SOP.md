# OpenClaw XHS Growth SOP

这份 SOP 给 OpenClaw 每天自动寻找小红书博主、生成关注候选使用。

核心目标：

```text
用户给业务目标 -> OpenClaw 生成搜索关键词 -> 保存账号增长画像 -> 系统搜索小红书 -> 生成每日关注候选名单
```

重要限制：当前上游 `xiaohongshu-mcp` 没有 `follow_user` 工具，所以系统现在只能生成“计划关注候选”，不能真正自动点关注。

## 1. 先确认账号 ID

OpenClaw 先读取本地账号：

```http
GET http://127.0.0.1:18160/api/accounts
```

或命令：

```bash
cd /Users/jason/Nova/XHS-mcp
npm run dev:list-accounts
```

示例：

```text
xhs_default
xhs_test_01
xhs_test_02
```

后续所有增长任务都必须绑定到具体 `account_id`。

## 2. 接收用户业务目标

用户可能会这样说：

```text
帮 xhs_test_01 每天找盲盒、潮玩、工厂货源、一件代发相关博主。
每天找 3-5 个。
```

OpenClaw 要把它整理成：

```json
{
  "account_id": "xhs_test_01",
  "profile_name": "xhs_test_01 盲盒潮玩增长",
  "persona": "寻找盲盒、潮玩、开箱、工厂货源、招商合作、批发供应、一件代发相关博主和潜在合作账号",
  "keywords": ["盲盒开箱", "潮玩工厂", "工厂货源", "一件代发", "批发供应", "招商合作"],
  "daily_follow_min": 3,
  "daily_follow_max": 5
}
```

## 3. 关键词生成规则

OpenClaw 生成关键词时要覆盖三类词：

```text
产品词：盲盒、潮玩、成人用品、宠物用品、加拿大留学
需求词：开箱、测评、攻略、避坑、货源、申请、签证
商业词：批发、招商、工厂、一件代发、合作、咨询
```

每个账号建议 5-10 个关键词，不要太多。

## 4. 保存增长画像

接口：

```http
POST http://127.0.0.1:18160/api/growth/profiles
Content-Type: application/json
```

请求体示例：

```json
{
  "profile_id": "account_xhs_test_01_growth",
  "name": "xhs_test_01 盲盒潮玩增长",
  "account_ids": ["xhs_test_01"],
  "persona_description": "寻找盲盒、潮玩、开箱、工厂货源、招商合作、批发供应、一件代发相关博主和潜在合作账号",
  "rules_source": "/Users/jason/Nova/XHS-mcp/data/growth/rules/account_xhs_test_01_growth.md",
  "seed_keywords": ["盲盒开箱", "潮玩工厂", "工厂货源", "一件代发", "批发供应", "招商合作"],
  "daily_follow_min": 3,
  "daily_follow_max": 5,
  "daily_run_time": "09:30",
  "daily_like_limit": 10,
  "enabled": true,
  "auto_follow_enabled": false,
  "auto_like_enabled": false
}
```

`profile_id` 规则：

```text
account_{account_id}_growth
```

例如：

```text
account_xhs_test_01_growth
```

## 5. 执行每日增长计划

接口：

```http
POST http://127.0.0.1:18160/api/growth/run-daily
Content-Type: application/json
```

Dry Run：

```json
{
  "profile_id": "account_xhs_test_01_growth",
  "dry_run": true,
  "limit_per_keyword": 5
}
```

正式生成候选：

```json
{
  "profile_id": "account_xhs_test_01_growth",
  "dry_run": false,
  "limit_per_keyword": 5
}
```

## 6. 返回结果怎么看

成功结果里重点看：

```json
{
  "ok": true,
  "dry_run": false,
  "searched_keywords": ["盲盒开箱", "潮玩工厂"],
  "searched_accounts": ["xhs_test_01"],
  "follow_candidates": [],
  "summary": {
    "discovered_authors": 20,
    "planned_follows": 5,
    "follow_tasks_created": 5
  },
  "report_file": "/Users/jason/Nova/XHS-mcp/data/reports/growth/xxxx.json"
}
```

重点字段：

- `follow_candidates`: 今日建议关注的博主。
- `summary.planned_follows`: 今日计划关注数量。
- `summary.follow_tasks_created`: 创建了几个关注候选任务。
- `report_file`: 本次报告文件。

## 7. 结果在哪里看

页面：

```text
http://127.0.0.1:18160/growth
```

报告目录：

```text
/Users/jason/Nova/XHS-mcp/data/reports/growth/
```

候选数据：

```text
/Users/jason/Nova/XHS-mcp/data/growth/candidates.json
```

任务队列：

```text
/Users/jason/Nova/XHS-mcp/data/jobs/tasks.json
```

## 8. OpenClaw 推荐执行顺序

```text
1. 读取 /api/accounts，确认 account_id
2. 询问用户这个账号要找什么人
3. 生成 persona 和 seed_keywords
4. POST /api/growth/profiles 保存画像
5. POST /api/growth/run-daily dry_run=true 做预检查
6. 如果结果正常，再 dry_run=false 生成今日候选
7. 把 follow_candidates 摘要反馈给用户
```

## 9. 当前不能做什么

当前不能真正自动关注，因为上游没有：

```text
follow_user
```

所以现在生成的是：

```text
growth_follow_candidate
```

任务状态通常是：

```text
needs_approval
```

这代表“候选人已找到，等待未来接入关注能力或人工处理”。

## 10. 示例：盲盒账号

保存画像：

```bash
curl -X POST http://127.0.0.1:18160/api/growth/profiles \
  -H 'Content-Type: application/json' \
  -d '{
    "profile_id": "account_xhs_test_01_growth",
    "name": "xhs_test_01 盲盒潮玩增长",
    "account_ids": ["xhs_test_01"],
    "persona_description": "寻找盲盒、潮玩、开箱、工厂货源、招商合作、批发供应、一件代发相关博主和潜在合作账号",
    "rules_source": "/Users/jason/Nova/XHS-mcp/data/growth/rules/account_xhs_test_01_growth.md",
    "seed_keywords": ["盲盒开箱", "潮玩工厂", "工厂货源", "一件代发", "批发供应", "招商合作"],
    "daily_follow_min": 3,
    "daily_follow_max": 5,
    "daily_run_time": "09:30",
    "daily_like_limit": 10,
    "enabled": true,
    "auto_follow_enabled": false,
    "auto_like_enabled": false
  }'
```

执行计划：

```bash
curl -X POST http://127.0.0.1:18160/api/growth/run-daily \
  -H 'Content-Type: application/json' \
  -d '{
    "profile_id": "account_xhs_test_01_growth",
    "dry_run": false,
    "limit_per_keyword": 5
  }'
```

