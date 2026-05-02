# OpenClaw XHS Publish SOP

这份 SOP 是给 OpenClaw 读取并指导用户完成小红书矩阵账号发布用的。

核心原则：**每个小红书账号使用自己的素材文件夹**。不要把所有账号的视频混在一个统一目录里。

## 1. 先确认账号 ID

`account_id` 是本地矩阵系统里的账号编号，不一定等于小红书昵称。

OpenClaw 可以用接口读取：

```http
GET http://127.0.0.1:18160/api/accounts
```

也可以用命令读取：

```bash
cd /Users/jason/Nova/XHS-mcp
npm run dev:list-accounts
```

当前常见账号示例：

```text
xhs_default
xhs_test_01
xhs_test_02
```

OpenClaw 在指导用户放素材前，必须先确认要操作哪个 `account_id`。

## 2. 每个账号的素材目录

待发布视频目录：

```text
/Users/jason/Nova/XHS-mcp/data/publish/assets/accounts/{account_id}/video-inbox/
```

发布成功后的归档目录：

```text
/Users/jason/Nova/XHS-mcp/data/publish/assets/accounts/{account_id}/published/
```

例如 `account_id = xhs_test_01`：

```text
/Users/jason/Nova/XHS-mcp/data/publish/assets/accounts/xhs_test_01/video-inbox/
/Users/jason/Nova/XHS-mcp/data/publish/assets/accounts/xhs_test_01/published/
```

OpenClaw 应指导用户把这个账号要发的视频和文案放入该账号自己的 `video-inbox`。

## 3. 视频和文案命名规则

一个视频必须配一个同名文案。

正确：

```text
canada-study-001.mp4
canada-study-001.txt
```

也支持：

```text
canada-study-001.md
canada-study-001.json
```

错误：

```text
canada-study-001.mp4
文案.txt
```

因为系统无法判断它们是一组。

## 4. TXT / MD 文案格式

```text
标题：加拿大留学选校怎么开始
很多学生和家长一开始会卡在选校。
建议先从预算、专业、城市和未来就业四个角度做第一轮筛选。
标签：加拿大留学, 选校规划, 留学申请
```

## 5. JSON 文案格式

```json
{
  "title": "加拿大留学选校怎么开始",
  "content": "很多学生和家长一开始会卡在选校。建议先从预算、专业、城市和未来就业四个角度做第一轮筛选。",
  "tags": ["加拿大留学", "选校规划", "留学申请"]
}
```

## 6. OpenClaw 一键发布接口

OpenClaw 正式发布时调用：

```http
POST http://127.0.0.1:18160/api/openclaw/publish-video
Content-Type: application/json
```

推荐请求体：

```json
{
  "account_id": "xhs_test_01",
  "schedule_at": "2026-05-03T22:00:00.000Z",
  "submit": true,
  "approved": true,
  "approval_required": false,
  "require_caption": true,
  "scan_limit": 20,
  "max_publish_count": 1,
  "check_comments_after_minutes": 60,
  "execute": true
}
```

注意：这里不需要传 `source_dir` 和 `archive_dir`。系统会根据 `account_id` 自动找到该账号自己的目录。

`schedule_at` 是可选字段：

- 不传：立即发布
- 传入：系统会立即上传视频，并在小红书官方发布页设置“定时发布”
- 时间格式：ISO8601，例如 `2026-05-03T22:00:00.000Z`
- 时间范围：建议未来 1 小时到 14 天内
- 这不是本地定时器，不需要 OpenClaw 等到发布时间再调用

## 7. Dry Run 测试

不真实发布，只检查目录、文案和任务生成：

```json
{
  "account_id": "xhs_test_01",
  "submit": false,
  "execute": false,
  "require_caption": true,
  "max_publish_count": 1
}
```

命令：

```bash
cd /Users/jason/Nova/XHS-mcp
npm run dev:openclaw-publish-video -- \
  --account xhs_test_01 \
  --submit false \
  --execute false \
  --require_caption true \
  --max_publish_count 1
```

## 8. 正式发布命令

```bash
cd /Users/jason/Nova/XHS-mcp
npm run dev:openclaw-publish-video -- \
  --account xhs_test_01 \
  --submit true \
  --approved true \
  --approval_required false \
  --require_caption true \
  --schedule_at 2026-05-03T22:00:00.000Z \
  --max_publish_count 1
```

## 9. 执行流程

```text
读取 account_id
-> 自动定位该账号 video-inbox
-> 扫描视频
-> 找同名文案
-> 加入内容池
-> 生成发布任务
-> 执行本次生成的任务；如果有 schedule_at，则设置小红书官方定时发布
-> 写入发布记录
-> 成功后把视频和文案移动到该账号 published
-> 如果返回笔记 ID，创建延迟评论检查任务
```

## 10. 返回结果怎么看

成功调用会返回：

```json
{
  "ok": true,
  "mode": "scan_generate_execute",
  "account_id": "xhs_test_01",
  "source_dir": "/Users/jason/Nova/XHS-mcp/data/publish/assets/accounts/xhs_test_01/video-inbox",
  "archive_dir": "/Users/jason/Nova/XHS-mcp/data/publish/assets/accounts/xhs_test_01/published",
  "imported_count": 1,
  "generated_count": 1,
  "executed_count": 1,
  "skipped": [],
  "generated_tasks": [],
  "executed_tasks": []
}
```

重点看：

- `source_dir`: 本次扫描的是哪个账号的待发布目录。
- `archive_dir`: 发布成功后归档到哪里。
- `imported_count`: 导入了几条新视频。
- `generated_count`: 生成了几个发布任务。
- `executed_count`: 执行了几个发布任务。
- `skipped`: 跳过的视频和原因。
- `executed_tasks[].ok`: 发布任务是否执行成功。

## 11. 常见失败

### 没有同名文案

返回：

```json
{
  "reason": "caption_not_found"
}
```

处理：在同一个账号的 `video-inbox` 里补同名 `.txt` / `.md` / `.json`。

### 没有导入视频

常见原因：

- 视频放错账号目录。
- 文件不是 `.mp4` / `.mov` / `.m4v` / `.webm`。
- 视频已经在内容池里。
- 视频已经发布并归档过。

### 没有生成任务

常见原因：

- 今天该账号已达到 `daily_limit`。
- 距离上次发布没超过 `min_interval_hours`。
- 内容已排队，不能重复排队。

### 执行失败

查看发布记录：

```text
/Users/jason/Nova/XHS-mcp/data/publish/publish-records.jsonl
```

或者打开页面：

```text
http://127.0.0.1:18160/publish
```

## 12. 建议调度策略

每个账号每天 1-3 条，不要一次发太多。

建议：

```text
xhs_default：09:30 发布 1 条
xhs_test_01：11:00 发布 1 条
xhs_test_02：14:30 发布 1 条
xhs_default：18:30 可选再发布 1 条
```

OpenClaw 每次调用建议：

```json
{
  "max_publish_count": 1
}
```

## 13. 评论和私信

评论：如果上游发布结果返回笔记 ID，系统会自动创建延迟的 `get_feed_detail` 任务检查评论。

私信：当前上游 MCP 没有私信工具，所以暂时不能自动检查私信。后续需要新增私信能力或浏览器自动化能力。

## 14. 操作边界

正式自动发布：

```json
{
  "submit": true,
  "approved": true,
  "approval_required": false,
  "execute": true
}
```

人工测试：

```json
{
  "submit": false,
  "execute": false
}
```
