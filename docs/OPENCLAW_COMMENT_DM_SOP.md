# OpenClaw XHS Comment and DM SOP

这份 SOP 给 OpenClaw 检查小红书发布后的评论、私信使用。

如果是从“搜索结果”继续深挖评论，优先阅读：

```text
/Users/jason/Nova/XHS-mcp/docs/OPENCLAW_FEED_DETAIL_COMMENTS_SOP.md
```

当前能力边界：

```text
评论：可以通过 get_feed_detail 检查笔记详情和评论
私信：当前上游 xiaohongshu-mcp 没有私信工具，暂时不能自动检查
```

## 1. 先确认账号 ID

OpenClaw 先读取账号：

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

评论检查必须绑定具体 `account_id`。

## 2. 评论检查的前提

评论检查需要知道笔记 ID。

理想情况：发布接口返回 `note_id` / `feed_id` / `PostID`。

当前情况：上游发布成功返回里可能出现：

```text
PostID:
```

但值为空。也就是说，虽然发布成功了，但系统不一定能拿到刚发布笔记的 ID。

如果拿不到笔记 ID，OpenClaw 应先提示：

```text
发布成功，但上游没有返回笔记 ID，暂时无法自动检查该笔记评论。
下一步需要通过用户主页最新笔记来反查刚发布内容。
```

## 3. 有笔记 ID 时检查评论

调用工具：

```http
POST http://127.0.0.1:18160/tools/call
Content-Type: application/json
```

请求体：

```json
{
  "name": "get_feed_detail",
  "arguments": {
    "account_id": "xhs_test_01",
    "note_id": "笔记ID",
    "xsec_token": "可选，如果搜索结果里有"
  }
}
```

返回结果里通常会包含笔记详情和评论内容。OpenClaw 要提取：

```text
评论人昵称
评论内容
评论时间
评论 ID
是否需要回复
建议回复内容
```

## 4. 评论回复策略

默认策略：**只生成回复建议，不自动发送**。

原因：

```text
评论回复属于对外互动动作，容易触发平台风控，也可能产生业务风险。
```

OpenClaw 应输出类似：

```json
{
  "comment_id": "xxx",
  "user": "用户昵称",
  "comment": "请问怎么买？",
  "reply_suggestion": "可以的，我们这边支持咨询和对接，具体看你需要哪一类产品。",
  "auto_send": false
}
```

如果未来要自动回复，必须单独开启规则，并且经过内容安全检查。

## 5. 生成回复建议

可以调用：

```http
POST http://127.0.0.1:18160/tools/call
Content-Type: application/json
```

请求体：

```json
{
  "name": "create_reply_suggestion",
  "arguments": {
    "client_id": "default",
    "user_comment": "请问怎么买？",
    "intent": "lead_reply",
    "context": "这是小红书发布后评论区的潜在线索"
  }
}
```

OpenClaw 应把回复建议展示给用户，不要默认调用 `post_comment` 或 `reply_comment`。

## 6. 私信检查当前限制

当前上游工具列表没有：

```text
list_messages
get_messages
check_dm
reply_dm
```

所以 OpenClaw 不要假装已经能检查私信。

正确处理方式：

```text
当前系统暂不支持自动检查小红书私信。
原因：上游 xiaohongshu-mcp 没有暴露私信相关工具。
可选方案：后续接入支持私信的 MCP，或开发浏览器自动化私信检查能力。
```

## 7. 发布后自动评论检查流程

如果发布成功并拿到笔记 ID：

```text
发布成功
-> 获取 note_id
-> 创建延迟 get_feed_detail 任务
-> 到时间后检查评论
-> 提取潜在线索评论
-> 生成回复建议
-> 等用户确认是否回复
```

当前系统已经支持：如果发布结果中能解析出笔记 ID，会创建延迟 `get_feed_detail` 任务。

但如果 `PostID` 为空，则无法自动创建准确评论检查任务。

## 8. 建议检查频率

发布后：

```text
第 1 次：发布后 60 分钟
第 2 次：发布后 6 小时
第 3 次：发布后 24 小时
```

不要高频检查，避免账号风险。

## 9. OpenClaw 推荐执行顺序

```text
1. 读取发布记录 publish-records.jsonl
2. 找到 status=success 的发布记录
3. 尝试从 result 里提取 note_id / feed_id / PostID
4. 如果拿到 ID，调用 get_feed_detail
5. 提取评论
6. 对有价值评论生成回复建议
7. 把建议返回给用户
8. 私信部分明确提示当前不支持
```

发布记录位置：

```text
/Users/jason/Nova/XHS-mcp/data/publish/publish-records.jsonl
```

## 10. 需要后续补的能力

### A. 发布后反查最新笔记

当发布成功但没有返回笔记 ID 时，需要：

```text
调用 user_profile
-> 读取当前账号最新笔记
-> 用标题 / 发布时间 / 内容匹配刚发布的视频
-> 拿到 note_id
-> 再检查评论
```

### B. 私信能力

需要新增工具之一：

```text
list_messages
get_message_threads
reply_message
```

或者做浏览器自动化检查。

### C. 评论自动回复安全规则

如果未来允许自动回复，必须加：

```text
敏感词检查
业务风险检查
成人用品类默认只生成建议
移民/留学类避免承诺结果
工厂货源类避免夸大供货能力
```
