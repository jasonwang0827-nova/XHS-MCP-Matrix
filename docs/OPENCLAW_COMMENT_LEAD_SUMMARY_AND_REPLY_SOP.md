# OpenClaw SOP：评论线索汇总报表

## 目标

每天让 OpenClaw 按业务主题搜索小红书笔记，深挖评论，把命中关键词的评论人整理成线索表。系统只自动读取和汇总，不自动关注、不自动私信、不自动评论回复。后续由人工查看报表后手工判断是否关注或沟通。

## 适用页面

- 搜索工作台：`http://127.0.0.1:18160/search`
- 线索池：`http://127.0.0.1:18160/leads`

## 每日流程

1. 确认账号

   使用用户指定的小红书账号，例如：

   ```json
   {
     "account_id": "xhs_default"
   }
   ```

2. 生成搜索关键词

   根据用户给的业务目标生成 3 到 8 个关键词。

   ```json
   {
     "theme": "加拿大租房留学",
     "search_keywords": ["加拿大留学", "多伦多租房", "加拿大签证", "北美留学生"],
     "comment_keywords": ["租房", "签证", "找房", "室友", "学校"]
   }
   ```

3. 搜索笔记

   ```bash
   curl -s http://127.0.0.1:18160/api/search \
     -H 'Content-Type: application/json' \
     -d '{
       "keyword": "加拿大留学",
       "account_ids": ["xhs_default"],
       "limit_per_account": 10,
       "dedupe": true
     }'
   ```

4. 从评论找准客户

   把上一步搜索结果作为 `search_response`，调用评论线索接口：

   ```bash
   curl -s http://127.0.0.1:18160/api/search/comment-leads \
     -H 'Content-Type: application/json' \
     -d '{
       "search_response": SEARCH_RESPONSE_JSON,
       "keywords": ["租房", "签证", "找房", "室友", "学校"],
       "max_notes": 10,
       "load_all_comments": false,
       "comments_limit": 20
     }'
   ```

   命中的评论会保存到：

   ```text
   /Users/jason/Nova/XHS-mcp/data/leads/leads.json
   ```

5. 生成线索汇总表

   ```bash
   curl -s http://127.0.0.1:18160/api/leads/profile-summary \
     -H 'Content-Type: application/json' \
     -d '{
       "account_id": "xhs_default",
       "limit": 50
     }'
   ```

   系统会读取评论人的主页信息，并保存两份报告：

   ```text
   /Users/jason/Nova/XHS-mcp/data/leads/reports/comment-lead-summary-时间.json
   /Users/jason/Nova/XHS-mcp/data/leads/reports/comment-lead-summary-时间.md
   ```

## 汇总表字段

- 账号
- 评论人昵称
- 评论人 author_id
- 小红书号
- IP 位置
- 粉丝数
- 命中词
- 评论内容
- 来源笔记
- 建议动作

## 禁止动作

这个 SOP 是只读线索采集流程。OpenClaw 不要调用以下动作：

- 不调用 `reply_comment` / `reply_comment_in_feed`
- 不调用 `post_comment` / `post_comment_to_feed`
- 不自动关注
- 不自动私信
- 不批量互动

## 安全边界

- 不自动关注。
- 不自动私信。
- 不生成或发送评论回复。
- 只导出报表给人工查看。
- 成人用品、私密护理类业务必须更严格：只做线索观察，不做外部互动。

## 给用户的反馈格式

```text
完成：
- 搜索账号：xhs_default
- 搜索主题：加拿大留学
- 搜索笔记：10 条
- 扫描评论：xx 条
- 命中评论线索：xx 条
- 主页读取成功：xx 条
- 汇总表：/Users/jason/Nova/XHS-mcp/data/leads/reports/xxx.md

下一步建议：
- 用户可打开 /search 查看线索表
- 用户可手工关注高质量线索
- 用户可手工决定是否联系，不建议自动评论
```
