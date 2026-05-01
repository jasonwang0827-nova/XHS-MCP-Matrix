# OpenClaw XHS Search and Leads SOP

这份 SOP 给 OpenClaw 执行小红书搜索、保存结果、生成线索使用。

## 1. 先确认账号 ID

```http
GET http://127.0.0.1:18160/api/accounts
```

或：

```bash
cd /Users/jason/Nova/XHS-mcp
npm run dev:list-accounts
```

## 2. 单账号搜索

接口：

```http
POST http://127.0.0.1:18160/api/search
Content-Type: application/json
```

请求：

```json
{
  "keyword": "盲盒开箱",
  "account_ids": ["xhs_test_01"],
  "limit_per_account": 10,
  "dedupe": true
}
```

## 3. 多账号同搜

```json
{
  "keyword": "加拿大留学",
  "account_ids": ["xhs_default", "xhs_test_01"],
  "limit_per_account": 10,
  "dedupe": true
}
```

用途：

```text
多个账号同时搜索同一个关键词，扩大采集结果。
```

## 4. 保存搜索结果

接口：

```http
POST http://127.0.0.1:18160/api/search/save
Content-Type: application/json
```

请求体使用 `/api/search` 的完整返回结果。

保存目录：

```text
/Users/jason/Nova/XHS-mcp/data/search-results/
```

## 5. 生成线索报告

接口：

```http
POST http://127.0.0.1:18160/api/search/discovery-report
Content-Type: application/json
```

请求体使用 `/api/search` 的完整返回结果。

报告目录：

```text
/Users/jason/Nova/XHS-mcp/data/reports/discovery/
```

线索池：

```text
/Users/jason/Nova/XHS-mcp/data/leads/leads.json
```

## 6. 查看线索

接口：

```http
GET http://127.0.0.1:18160/api/leads?account_id=xhs_test_01
```

页面：

```text
http://127.0.0.1:18160/leads
```

## 7. 页面

搜索页：

```text
http://127.0.0.1:18160/search
```

线索页：

```text
http://127.0.0.1:18160/leads
```

## 8. OpenClaw 推荐流程

```text
1. 读取账号列表，确认 account_id
2. 根据用户业务目标生成关键词
3. POST /api/search 搜索
4. 如果有结果，POST /api/search/save 保存
5. POST /api/search/discovery-report 生成线索
6. GET /api/leads?account_id=xxx 查看该账号线索
7. 把高价值线索摘要反馈给用户
```

## 9. 返回结果重点字段

- `results[].title`: 笔记标题
- `results[].author_name`: 作者昵称
- `results[].author_id`: 作者 ID
- `results[].liked_count`: 点赞数
- `results[].comment_count`: 评论数
- `results[].collected_count`: 收藏数
- `results[].url`: 笔记链接
- `results[].matched_accounts`: 哪些账号搜到了这条

## 10. 注意事项

- 搜索结果不等于线索，线索需要再生成报告。
- 多账号同搜时要控制频率，不要一次性太多账号。
- 不同业务账号应该用不同关键词。

