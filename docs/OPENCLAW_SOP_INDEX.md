# OpenClaw SOP Index

OpenClaw 先读这份索引，再按任务读取对应 SOP。

## 必读规则

所有动作都必须先确认 `account_id`。

读取账号：

```http
GET http://127.0.0.1:18160/api/accounts
```

或命令：

```bash
cd /Users/jason/Nova/XHS-mcp
npm run dev:list-accounts
```

## SOP 列表

### 账号管理和登录

```text
/Users/jason/Nova/XHS-mcp/docs/OPENCLAW_ACCOUNT_SOP.md
```

用途：

```text
创建账号、启动账号 MCP、检查登录、获取二维码、解释 account_id
```

### 搜索和线索

```text
/Users/jason/Nova/XHS-mcp/docs/OPENCLAW_SEARCH_LEADS_SOP.md
```

用途：

```text
按账号搜索关键词、多账号同搜、保存搜索结果、生成线索报告、查看线索池
```

### 发布

```text
/Users/jason/Nova/XHS-mcp/docs/OPENCLAW_PUBLISH_SOP.md
```

用途：

```text
按账号放视频和文案、OpenClaw 一键发布、发布后归档
```

### 增长找博主

```text
/Users/jason/Nova/XHS-mcp/docs/OPENCLAW_GROWTH_SOP.md
```

用途：

```text
用户给业务目标，OpenClaw 生成关键词，系统搜索并生成关注候选
```

### 评论和私信

```text
/Users/jason/Nova/XHS-mcp/docs/OPENCLAW_COMMENT_DM_SOP.md
```

用途：

```text
检查笔记评论、生成回复建议、说明私信当前限制
```

### 搜索结果深挖评论

```text
/Users/jason/Nova/XHS-mcp/docs/OPENCLAW_FEED_DETAIL_COMMENTS_SOP.md
```

用途：

```text
从搜索结果里的 note_id 和 xsec_token 读取笔记详情、评论内容和评论人
```

### 评论里找准客户

```text
/Users/jason/Nova/XHS-mcp/docs/OPENCLAW_COMMENT_LEADS_SOP.md
```

用途：

```text
先搜索笔记，再在这些笔记的评论里匹配关键词，把命中的评论人保存为线索
```

### 评论线索汇总报表

```text
/Users/jason/Nova/XHS-mcp/docs/OPENCLAW_COMMENT_LEAD_SUMMARY_AND_REPLY_SOP.md
```

用途：

```text
读取评论准客户主页，生成汇总表；只读导出，不自动回复、不自动关注
```

### 安全和风控

```text
/Users/jason/Nova/XHS-mcp/docs/OPENCLAW_SAFETY_SOP.md
```

用途：

```text
发布、评论、点赞、关注等外部动作前的安全边界
```

### 日常巡检

```text
/Users/jason/Nova/XHS-mcp/docs/OPENCLAW_DAILY_OPERATIONS_SOP.md
```

用途：

```text
每天检查服务、账号登录、发布记录、失败任务、素材目录、增长报告
```
