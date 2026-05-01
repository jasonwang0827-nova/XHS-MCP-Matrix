# OpenClaw XHS Daily Operations SOP

这份 SOP 给 OpenClaw 每天巡检 XHS 矩阵系统使用。

## 1. 检查主服务

```http
GET http://127.0.0.1:18160/health
```

正常应返回：

```json
{
  "ok": true,
  "service": "xhs-mcp-matrix"
}
```

## 2. 检查账号

```http
GET http://127.0.0.1:18160/api/accounts
```

重点看：

```text
account_id
runtime.reachable
runtime.port
runtime.last_error
```

## 3. 检查登录

对每个账号：

```http
POST http://127.0.0.1:18160/api/accounts/{account_id}/login-status
```

未登录时，指导用户到：

```text
http://127.0.0.1:18160/admin
```

获取二维码并扫码。

## 4. 检查发布素材目录

每个账号：

```text
/Users/jason/Nova/XHS-mcp/data/publish/assets/accounts/{account_id}/video-inbox/
/Users/jason/Nova/XHS-mcp/data/publish/assets/accounts/{account_id}/published/
```

检查：

```text
是否有视频
是否有同名文案
是否有已发布归档
```

## 5. 检查发布记录

```text
/Users/jason/Nova/XHS-mcp/data/publish/publish-records.jsonl
```

重点看最近记录：

```text
status=success
status=failed
error
archived_assets
```

## 6. 检查任务队列

```text
/Users/jason/Nova/XHS-mcp/data/jobs/tasks.json
```

重点看：

```text
running
failed
needs_approval
pending
```

如果有任务长时间 `running`，需要检查是否是上游发布卡住或进程中断。

## 7. 检查增长报告

```text
/Users/jason/Nova/XHS-mcp/data/reports/growth/
```

重点看：

```text
planned_follows
follow_tasks_created
searched_keywords
follow_candidates
```

## 8. 检查线索

```http
GET http://127.0.0.1:18160/api/leads?account_id={account_id}
```

页面：

```text
http://127.0.0.1:18160/leads
```

## 9. 每日建议流程

```text
1. GET /health
2. GET /api/accounts
3. 对账号检查 login-status
4. 检查 video-inbox 是否有素材
5. 如有素材，按发布 SOP 执行一键发布
6. 按增长 SOP 生成今日关注候选
7. 按评论 SOP 检查可检查的评论
8. 汇总成功、失败、待处理事项给用户
```

## 10. 每日报告格式

OpenClaw 最后给用户的汇总建议：

```text
今日巡检：
- 主服务：正常
- 账号：3 个，2 个已登录，1 个需扫码
- 发布：xhs_test_01 成功 1 条，已归档
- 增长：生成 5 个关注候选
- 评论：暂无可检查 note_id
- 失败：无
- 需要你处理：xhs_test_02 需要扫码登录
```

