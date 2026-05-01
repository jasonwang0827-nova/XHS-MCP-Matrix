# OpenClaw Comment Leads SOP

这份 SOP 给 OpenClaw 执行“评论里找准客户”使用。

核心逻辑：

```text
先搜索小红书笔记
-> 再读取这些笔记下面的评论
-> 在评论里搜索二级关键词
-> 命中关键词的评论人就是准客户线索
-> 保存到线索池
```

## 1. 使用场景

用户可能会说：

```text
先搜加拿大留学，再在评论里找包含“租房”的人。
```

或者：

```text
搜盲盒文章，再看评论里有没有问“批发”“货源”“多少钱”的人。
```

OpenClaw 应理解为两层搜索：

```text
第一层关键词：用来搜索笔记
第二层关键词：用来筛选评论
```

## 2. 先确认账号 ID

读取账号：

```http
GET http://127.0.0.1:18160/api/accounts
```

或：

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

## 3. 第一步：搜索笔记

接口：

```http
POST http://127.0.0.1:18160/api/search
Content-Type: application/json
```

请求示例：

```json
{
  "keyword": "加拿大留学",
  "account_ids": ["xhs_default"],
  "limit_per_account": 5,
  "dedupe": true
}
```

返回结果里的 `results` 是笔记，不是博主。

每条笔记里后续会用到：

```text
source_account_id
note_id
xsec_token
title
author_name
comment_count
url
```

## 4. 第二步：在评论里找关键词

接口：

```http
POST http://127.0.0.1:18160/api/search/comment-leads
Content-Type: application/json
```

请求体：

```json
{
  "search_response": "<第一步 /api/search 的完整返回结果>",
  "keywords": ["租房", "找房", "室友"],
  "max_notes": 5,
  "load_all_comments": false,
  "comments_limit": 20
}
```

说明：

- `search_response`: 必须传第一步搜索接口的完整 JSON 返回。
- `keywords`: 要在评论里匹配的词。
- `max_notes`: 最多深挖前几篇笔记，建议 5-10。
- `load_all_comments`: 默认 `false`，只读前 10 条左右评论。
- `comments_limit`: 当 `load_all_comments=true` 时限制评论数量。

## 5. 返回结果怎么看

成功返回：

```json
{
  "ok": true,
  "keywords": ["租房"],
  "summary": {
    "scanned_notes": 5,
    "matched_comments": 1,
    "inserted": 1,
    "updated": 0,
    "errors": 0
  },
  "leads": [
    {
      "source": "comment",
      "author_name": "枣虾在写字",
      "author_id": "用户ID",
      "title": "来源笔记标题",
      "note_id": "笔记ID",
      "lead_result": {
        "matched_keywords": ["租房"],
        "lead_level": "B",
        "follow_up_suggestion": "评论命中关键词「租房」，建议查看评论人主页并生成回复建议。"
      },
      "raw_item": {
        "comment": {
          "comment_id": "69edb8430000000028034a00",
          "content": "请问，两边都租房吗？",
          "author_name": "枣虾在写字",
          "author_id": "用户ID"
        }
      }
    }
  ]
}
```

OpenClaw 应重点提取：

```text
评论人昵称
评论人 ID
评论内容
命中关键词
来源笔记标题
来源笔记链接
评论 ID
```

## 6. 线索保存位置

命中的评论线索会自动写入：

```text
/Users/jason/Nova/XHS-mcp/data/leads/leads.json
```

页面查看：

```text
http://127.0.0.1:18160/leads
```

接口查看：

```http
GET http://127.0.0.1:18160/api/leads?account_id=xhs_default
```

## 7. 页面操作

用户也可以直接打开：

```text
http://127.0.0.1:18160/search
```

操作步骤：

```text
1. 选择账号
2. 输入第一层搜索关键词，例如：加拿大留学
3. 点击搜索
4. 在“评论关键词”里输入：租房, 找房, 室友
5. 点击“从评论找准客户”
6. 查看“评论准客户”表格
```

## 8. OpenClaw 标准流程

```text
1. 询问用户：用哪个账号搜？
2. 询问用户：第一层搜什么笔记？
3. 询问用户：评论里要找什么关键词？
4. POST /api/search 搜索笔记
5. POST /api/search/comment-leads 深挖评论
6. 把命中的评论准客户返回给用户
7. 提醒用户这些线索已写入 /leads
```

## 9. 示例：租房线索

用户需求：

```text
用 xhs_default 搜“加拿大留学”，再在评论里找“租房”。
```

第一步：

```bash
curl -X POST http://127.0.0.1:18160/api/search \
  -H 'Content-Type: application/json' \
  -d '{
    "keyword": "加拿大留学",
    "account_ids": ["xhs_default"],
    "limit_per_account": 5,
    "dedupe": true
  }'
```

第二步：把第一步完整返回作为 `search_response`，再调用：

```bash
curl -X POST http://127.0.0.1:18160/api/search/comment-leads \
  -H 'Content-Type: application/json' \
  -d '{
    "search_response": FIRST_SEARCH_RESPONSE_JSON,
    "keywords": ["租房"],
    "max_notes": 5,
    "load_all_comments": false
  }'
```

## 10. 常见失败

### 没有命中评论

可能原因：

```text
关键词太窄
前几篇笔记评论太少
评论没有加载出来
```

处理：

```text
增加 max_notes
换评论关键词
把 load_all_comments 设置为 true
```

### 部分笔记详情失败

返回里会有：

```json
{
  "errors": [
    {
      "note_id": "xxx",
      "error": "feed xxx not found in noteDetailMap"
    }
  ]
}
```

这是上游 MCP 没打开某篇详情，不代表整个流程失败。OpenClaw 应继续处理其他笔记。

### 缺少 xsec_token

评论详情需要 `xsec_token`。如果搜索结果没有 token，就无法深挖这篇笔记评论。

## 11. 后续动作

命中评论准客户后，下一步可以：

```text
查看评论人主页
导出线索报表
人工查看后再决定是否手工关注
未来接入关注能力后再关注用户
```

当前不要自动回复、不要自动关注。

原因：

```text
评论回复和关注都是对外互动动作，容易触发平台风控。
当前上游 MCP 也没有 follow_user 工具。
```
