# XHS Publish Workflow

这份文档说明 XHS 矩阵发布系统的业务逻辑。OpenClaw 具体操作 SOP 见：

```text
/Users/jason/Nova/XHS-mcp/docs/OPENCLAW_PUBLISH_SOP.md
```

OpenClaw 增长找博主 SOP 见：

```text
/Users/jason/Nova/XHS-mcp/docs/OPENCLAW_GROWTH_SOP.md
```

OpenClaw 评论和私信检查 SOP 见：

```text
/Users/jason/Nova/XHS-mcp/docs/OPENCLAW_COMMENT_DM_SOP.md
```

OpenClaw SOP 总索引见：

```text
/Users/jason/Nova/XHS-mcp/docs/OPENCLAW_SOP_INDEX.md
```

## 核心业务逻辑

发布不是一个统一素材池，而是 **按账号分开管理素材**：

```text
账号 A -> 账号 A 的视频目录 -> 账号 A 发布 -> 账号 A 归档
账号 B -> 账号 B 的视频目录 -> 账号 B 发布 -> 账号 B 归档
```

这样避免多个小红书账号的视频素材混在一起。

## 账号 ID

查看账号：

```bash
cd /Users/jason/Nova/XHS-mcp
npm run dev:list-accounts
```

接口：

```http
GET http://127.0.0.1:18160/api/accounts
```

示例：

```text
xhs_default
xhs_test_01
xhs_test_02
```

## 账号独立素材目录

每个账号的待发布视频目录：

```text
/Users/jason/Nova/XHS-mcp/data/publish/assets/accounts/{account_id}/video-inbox/
```

每个账号的发布成功归档目录：

```text
/Users/jason/Nova/XHS-mcp/data/publish/assets/accounts/{account_id}/published/
```

例如：

```text
/Users/jason/Nova/XHS-mcp/data/publish/assets/accounts/xhs_test_01/video-inbox/
/Users/jason/Nova/XHS-mcp/data/publish/assets/accounts/xhs_test_01/published/
```

## 视频文案规则

视频和文案必须同名：

```text
demo-001.mp4
demo-001.txt
```

支持文案格式：

```text
demo-001.txt
demo-001.md
demo-001.json
```

TXT / MD：

```text
标题：这是小红书标题
正文第一行
正文第二行
标签：留学, 加拿大, 选校
可见范围：仅自己可见
```

JSON：

```json
{
  "title": "这是小红书标题",
  "content": "这是正文",
  "tags": ["留学", "加拿大", "选校"],
  "visibility": "仅自己可见"
}
```

## 内容池

内容池文件：

```text
/Users/jason/Nova/XHS-mcp/data/publish/content-pool.json
```

内容池字段：

- `content_id`
- `type`: `note` or `video`
- `title`
- `content`
- `tags`
- `image_paths`
- `video_path`
- `caption_path`
- `source_dir`
- `archive_dir`
- `target_accounts`
- `schedule_at`
- `visibility`
- `submit`
- `approval_required`
- `approved`
- `daily_limit`
- `min_interval_hours`
- `max_retry`
- `published_accounts`
- `failed_accounts`
- `retry_count_by_account`
- `last_error_by_account`
- `published_at_by_account`
- `queued_at_by_account`

## OpenClaw 一键发布

接口：

```http
POST http://127.0.0.1:18160/api/openclaw/publish-video
Content-Type: application/json
```

推荐请求：

```json
{
  "account_id": "xhs_test_01",
  "schedule_at": "2026-05-03T22:00:00.000Z",
  "visibility": "仅自己可见",
  "submit": true,
  "approved": true,
  "approval_required": false,
  "require_caption": true,
  "scan_limit": 1,
  "max_publish_count": 1,
  "check_comments_after_minutes": 60,
  "execute": true
}
```

注意：默认不需要传 `source_dir` 和 `archive_dir`，系统会根据 `account_id` 自动定位账号目录。

`schedule_at` 可选。传入后，系统会立即打开小红书发布页上传视频，并使用小红书官方“定时发布”能力设置发布时间；不是本地服务到点再发布。时间必须是 ISO8601 格式，并且建议设置为未来 1 小时到 14 天内。留空表示立即发布。

`visibility` 可选，默认 `仅自己可见`。支持：`仅自己可见`、`仅互关好友可见`、`公开可见`。账号前期测试建议保持 `仅自己可见`。

## 一键发布流程

```text
读取 account_id
-> 自动定位 /assets/accounts/{account_id}/video-inbox
-> 扫描视频文件，默认只导入 1 条
-> 查找同名文案
-> 创建内容池记录
-> 生成发布任务
-> 执行本次生成的任务；如果有 schedule_at，则在小红书官方发布页设置定时发布
-> 记录发布结果
-> 成功后移动视频和文案到 /assets/accounts/{account_id}/published
-> 如果发布结果有笔记 ID，生成延迟评论检查任务
```

## Dry Run

```bash
cd /Users/jason/Nova/XHS-mcp
npm run dev:openclaw-publish-video -- \
  --account xhs_test_01 \
  --submit false \
  --execute false \
  --require_caption true
```

## 正式发布

```bash
cd /Users/jason/Nova/XHS-mcp
npm run dev:openclaw-publish-video -- \
  --account xhs_test_01 \
  --submit true \
  --approved true \
  --approval_required false \
  --require_caption true \
  --schedule_at 2026-05-03T22:00:00.000Z \
  --visibility 仅自己可见 \
  --max_publish_count 1
```

## 发布记录

```text
/Users/jason/Nova/XHS-mcp/data/publish/publish-records.jsonl
/Users/jason/Nova/XHS-mcp/data/publish/publish-log.jsonl
```

页面：

```text
http://127.0.0.1:18160/publish
```

## 安全边界

普通页面手动添加内容时，默认仍可走审核。

OpenClaw 自动发布时，传：

```json
{
  "submit": true,
  "approved": true,
  "approval_required": false,
  "execute": true
}
```

人工测试时，传：

```json
{
  "submit": false,
  "execute": false
}
```

## 当前限制

- 评论检查依赖发布结果里是否返回笔记 ID。
- 私信检查暂未实现，因为当前上游 MCP 没有私信工具。
- 建议每个账号每次只发布 1 条，降低账号风险。
