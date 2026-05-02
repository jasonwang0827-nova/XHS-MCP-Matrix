# OpenClaw 功能地图

OpenClaw 每次接到 XHS 矩阵系统任务时，先读这份文档，再按任务跳转到对应 SOP。

## 系统地址

```text
管理后台：http://127.0.0.1:18160/admin
搜索工作台：http://127.0.0.1:18160/search
线索池：http://127.0.0.1:18160/leads
增长计划：http://127.0.0.1:18160/growth
发布工作台：http://127.0.0.1:18160/publish
健康检查：http://127.0.0.1:18160/health
```

## 总原则

当前系统以低风险运营为主。

允许：

- 检查账号
- 搜索笔记
- 读取笔记评论
- 读取评论人主页
- 导出线索报表
- 扫描素材
- 按用户明确要求执行发布流程

默认禁止：

- 自动关注
- 自动私信
- 自动回复评论
- 自动点赞
- 自动收藏
- 批量互动

## 功能清单

| 功能 | 页面 | 主要接口 | SOP |
| --- | --- | --- | --- |
| 账号管理 | `/admin` | `/api/accounts` | `OPENCLAW_ACCOUNT_SOP.md` |
| 登录二维码 | `/admin` | `/api/accounts/{account_id}/login-qrcode` | `OPENCLAW_ACCOUNT_SOP.md` |
| 搜索笔记 | `/search` | `/api/search` | `OPENCLAW_SEARCH_LEADS_SOP.md` |
| 查看评论 | `/search` | `/api/feed-detail` | `OPENCLAW_FEED_DETAIL_COMMENTS_SOP.md` |
| 评论找线索 | `/search` | `/api/search/comment-leads` | `OPENCLAW_COMMENT_LEADS_SOP.md` |
| 线索汇总报表 | `/search` | `/api/leads/profile-summary` | `OPENCLAW_COMMENT_LEAD_SUMMARY_AND_REPLY_SOP.md` |
| 线索池查看 | `/leads` | `/api/leads` | `OPENCLAW_OPERATOR_MANUAL.md` |
| 增长候选 | `/growth` | `/api/growth/run-daily` | `OPENCLAW_GROWTH_SOP.md` |
| 发布素材池 | `/publish` | `/api/publish/content-pool` | `OPENCLAW_PUBLISH_SOP.md` |
| 一键发布视频 | `/publish` | `/api/openclaw/publish-video` | `OPENCLAW_PUBLISH_SOP.md` |
| 日常巡检 | 无固定页面 | `/health` 等 | `OPENCLAW_DAILY_OPERATIONS_SOP.md` |

## OpenClaw 标准工作方式

1. 先问用户要做什么业务目标。
2. 确认使用哪个 `account_id`。
3. 检查账号是否登录。
4. 如果未登录，引导用户到 `/admin` 扫码。
5. 如果是搜索线索任务，先生成搜索关键词和评论筛选词。
6. 调用系统接口执行只读采集。
7. 生成客户可读报表。
8. 把报表路径和摘要反馈给用户。

## 账号 ID 说明

读取账号：

```bash
curl -s http://127.0.0.1:18160/api/accounts
```

常见账号：

```text
xhs_default：默认小红书账号
xhs_test_01：测试账号 01
xhs_test_02：批发商
```

OpenClaw 不要猜账号。每次任务开始时都要确认用户要用哪个账号。

## 报表输出位置

评论线索汇总报表：

```text
/Users/jason/Nova/XHS-mcp/data/leads/reports/
```

搜索结果保存：

```text
/Users/jason/Nova/XHS-mcp/data/search-results/
```

发布记录：

```text
/Users/jason/Nova/XHS-mcp/data/publish/publish-records.jsonl
```

## 推荐任务话术

当用户说“帮我找线索”：

```text
我需要确认两件事：
1. 用哪个小红书账号？
2. 搜索什么业务主题？

我会生成搜索关键词和评论筛选词，只做只读采集，然后导出客户线索报表。
```

当用户说“帮我发视频”：

```text
我会先检查账号素材目录、文案文件和登录状态。
发布属于对外动作，需要用户明确确认后才执行。
```

当用户说“帮我自动关注/回复/私信”：

```text
当前系统不做自动关注、自动私信、自动回复，避免账号风控。
我可以帮你导出线索表，由人工打开主页后判断是否关注。
```
