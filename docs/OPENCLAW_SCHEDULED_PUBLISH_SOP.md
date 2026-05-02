# OpenClaw XHS Official Scheduled Publish SOP

这份 SOP 用于指导 OpenClaw 执行“小红书官方定时发布”。

核心原则：

- 每个账号使用自己的素材目录
- OpenClaw 现在调用接口，系统立即上传视频
- 如果传入 `schedule_at`，系统会在小红书官方发布页设置定时发布
- 这不是本地定时器，不需要 OpenClaw 等到发布时间再调用
- 发布时间必须是未来 1 小时到 14 天内

## 1. 先确认账号

OpenClaw 必须先确认用户要操作哪个 `account_id`。

读取账号：

```http
GET http://127.0.0.1:18160/api/accounts
```

或命令：

```bash
cd /Users/jason/Nova/XHS-mcp
npm run dev:list-accounts
```

常见账号示例：

```text
xhs_default
xhs_test_01
xhs_test_02
```

## 2. 确认发布时间

OpenClaw 需要向用户确认：

```text
你要立即发布，还是使用小红书官方定时发布？
```

如果用户选择定时发布，OpenClaw 要把用户给的本地时间转换成 ISO8601。

示例：

```text
用户说：2026-05-03 下午 6 点发布
Toronto 本地时间对应 ISO8601：2026-05-03T22:00:00.000Z
```

规则：

- 必须晚于当前时间至少 1 小时
- 必须早于当前时间 14 天
- 如果时间不符合范围，不要调用发布接口，先提醒用户重新选择时间

## 3. 放置素材

每个账号的视频和文案必须放到该账号自己的目录。

待发布目录：

```text
/Users/jason/Nova/XHS-mcp/data/publish/assets/accounts/{account_id}/video-inbox/
```

发布成功归档目录：

```text
/Users/jason/Nova/XHS-mcp/data/publish/assets/accounts/{account_id}/published/
```

例如：

```text
/Users/jason/Nova/XHS-mcp/data/publish/assets/accounts/xhs_test_01/video-inbox/
/Users/jason/Nova/XHS-mcp/data/publish/assets/accounts/xhs_test_01/published/
```

## 4. 视频和文案规则

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

## 5. 文案格式

TXT / MD：

```text
标题：加拿大留学选校怎么开始
很多学生和家长一开始会卡在选校。
建议先从预算、专业、城市和未来就业四个角度做第一轮筛选。
标签：加拿大留学, 选校规划, 留学申请
```

JSON：

```json
{
  "title": "加拿大留学选校怎么开始",
  "content": "很多学生和家长一开始会卡在选校。建议先从预算、专业、城市和未来就业四个角度做第一轮筛选。",
  "tags": ["加拿大留学", "选校规划", "留学申请"]
}
```

## 6. Dry Run 检查

正式发布前，OpenClaw 可以先做 dry run。

这个动作不会上传，也不会发布，只检查目录、文案和任务生成。

```http
POST http://127.0.0.1:18160/api/openclaw/publish-video
Content-Type: application/json
```

```json
{
  "account_id": "xhs_test_01",
  "schedule_at": "2026-05-03T22:00:00.000Z",
  "submit": false,
  "approved": true,
  "approval_required": false,
  "require_caption": true,
  "scan_limit": 20,
  "max_publish_count": 1,
  "execute": false
}
```

命令方式：

```bash
cd /Users/jason/Nova/XHS-mcp
npm run dev:openclaw-publish-video -- \
  --account xhs_test_01 \
  --schedule_at 2026-05-03T22:00:00.000Z \
  --submit false \
  --approved true \
  --approval_required false \
  --require_caption true \
  --max_publish_count 1 \
  --execute false
```

## 7. 正式定时发布

确认账号、素材、文案和时间无误后，OpenClaw 调用：

```http
POST http://127.0.0.1:18160/api/openclaw/publish-video
Content-Type: application/json
```

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

命令方式：

```bash
cd /Users/jason/Nova/XHS-mcp
npm run dev:openclaw-publish-video -- \
  --account xhs_test_01 \
  --schedule_at 2026-05-03T22:00:00.000Z \
  --submit true \
  --approved true \
  --approval_required false \
  --require_caption true \
  --max_publish_count 1 \
  --execute true
```

## 8. 执行后检查

OpenClaw 执行后检查：

```text
/Users/jason/Nova/XHS-mcp/data/publish/publish-records.jsonl
/Users/jason/Nova/XHS-mcp/data/publish/publish-log.jsonl
```

也可以打开页面：

```text
http://127.0.0.1:18160/publish
```

检查点：

- 内容是否进入发布记录
- 视频和同名文案是否移动到 `published`
- 如果小红书返回任务成功，提醒用户去小红书创作者中心确认定时发布状态

## 9. OpenClaw 对用户的话术

成功时：

```text
已经提交到小红书官方定时发布流程。请到小红书创作者中心检查是否显示为定时发布任务。
```

失败时：

```text
这次没有完成发布。我先看 publish-log.jsonl 和接口返回错误，再判断是素材、登录、时间范围，还是上游 MCP 页面自动化问题。
```

## 10. 禁止动作

OpenClaw 不要做这些事：

- 不要把所有账号的视频混到一个公共素材目录
- 不要在没有同名文案时强行发布
- 不要绕过 `account_id`
- 不要把 `schedule_at` 当成本地定时器
- 不要在用户未确认 `submit: true` 时真实发布
