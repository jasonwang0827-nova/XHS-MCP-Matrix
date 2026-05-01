# OpenClaw Feed Detail Comments SOP

这份 SOP 给 OpenClaw 在“搜索结果”基础上继续深挖笔记评论使用。

核心目标：

```text
搜索到笔记 -> 取 note_id 和 xsec_token -> 调用详情接口 -> 读取评论内容和评论人
```

## 1. 使用场景

当用户问：

```text
这些搜索出来的是文章还是博主？
能不能看到这些文章下面的评论？
我想知道某条评论是谁发的。
```

OpenClaw 应使用本 SOP。

## 2. 前置条件

必须先执行搜索 SOP：

```text
/Users/jason/Nova/XHS-mcp/docs/OPENCLAW_SEARCH_LEADS_SOP.md
```

搜索结果里必须有：

```text
account_id
note_id
xsec_token
```

其中：

- `note_id`: 搜索结果里的笔记 ID。
- `xsec_token`: 访问该笔记详情需要的 token。
- `account_id`: 搜到这条笔记的小红书账号。

## 3. 评论详情接口

接口：

```http
POST http://127.0.0.1:18160/api/feed-detail
Content-Type: application/json
```

请求体：

```json
{
  "account_id": "xhs_default",
  "note_id": "68e9ec720000000004003ca1",
  "xsec_token": "搜索结果里的 xsec_token",
  "load_all_comments": false
}
```

系统内部会自动把：

```text
note_id -> feed_id
```

传给上游 MCP。

## 4. 加载更多评论

默认：

```json
{
  "load_all_comments": false
}
```

表示只读取前 10 条左右一级评论。

如果用户明确要求更多评论：

```json
{
  "account_id": "xhs_default",
  "note_id": "68e9ec720000000004003ca1",
  "xsec_token": "搜索结果里的 xsec_token",
  "load_all_comments": true,
  "limit": 20,
  "scroll_speed": "normal"
}
```

不建议一次拉太多，避免账号风险。

## 5. 返回结果重点字段

成功返回里重点看：

```json
{
  "ok": true,
  "account_id": "xhs_default",
  "detail": {
    "note_id": "68e9ec720000000004003ca1",
    "title": "笔记标题",
    "author_name": "笔记作者",
    "comment_count": 5,
    "comments": [
      {
        "comment_id": "68ea0ef700000000390278f0",
        "content": "1225了[害羞R]",
        "author_name": "NOBOD",
        "author_id": "64d3354b000000001001e613",
        "liked_count": 0,
        "created_at": "2025-10-11T08:02:01.000Z"
      }
    ]
  }
}
```

OpenClaw 应展示：

```text
笔记标题
笔记作者
评论人昵称
评论人 ID
评论内容
评论点赞数
评论时间
```

## 6. OpenClaw 标准流程

```text
1. 执行搜索，拿到 results
2. 选择用户关心的笔记
3. 从该笔记取 source_account_id / note_id / xsec_token
4. POST /api/feed-detail
5. 解析 detail.comments
6. 把评论人和评论内容汇总给用户
```

## 7. 示例：从搜索结果读取评论

假设搜索结果里有：

```json
{
  "source_account_id": "xhs_default",
  "note_id": "68e9ec720000000004003ca1",
  "title": "【美国NCAA大学D1球员投篮训练】",
  "xsec_token": "ABEH8z18jdYjyv-itTmh3A-zA3dTeHdai8_BkxmotNRcs="
}
```

调用：

```bash
curl -X POST http://127.0.0.1:18160/api/feed-detail \
  -H 'Content-Type: application/json' \
  -d '{
    "account_id": "xhs_default",
    "note_id": "68e9ec720000000004003ca1",
    "xsec_token": "ABEH8z18jdYjyv-itTmh3A-zA3dTeHdai8_BkxmotNRcs=",
    "load_all_comments": false
  }'
```

## 8. 常见失败

### 缺少 xsec_token

错误原因：

```text
xsec_token is required
```

处理：

```text
必须从搜索结果中取 xsec_token。
只知道笔记链接或 note_id 还不够。
```

### noteDetailMap not found

可能错误：

```text
feed xxx not found in noteDetailMap
```

含义：

```text
上游 MCP 打开这条笔记详情失败，可能是页面结构、token、笔记状态或账号访问问题。
```

处理：

```text
换同一搜索结果里的其他笔记测试。
如果多条都失败，检查账号登录状态。
```

### 评论为空

可能原因：

```text
这条笔记确实没有评论
上游只返回了笔记详情没有返回评论
评论需要 load_all_comments=true 才能加载更多
```

## 9. 页面操作

用户也可以直接打开：

```text
http://127.0.0.1:18160/search
```

搜索后，点击每条结果旁边：

```text
查看评论
```

页面会显示：

```text
评论人昵称
评论内容
评论 ID
```

## 10. 注意事项

- 这个 SOP 是只读操作，不会点赞、收藏、评论或关注。
- 不要把搜索结果误称为博主；搜索结果是笔记，笔记里包含作者信息。
- 如果用户要找博主，应从评论人或笔记作者里再筛选。
- 不要高频读取大量评论。

