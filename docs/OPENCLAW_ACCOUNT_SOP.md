# OpenClaw XHS Account SOP

这份 SOP 给 OpenClaw 管理小红书矩阵账号使用。

## 1. account_id 是什么

`account_id` 是本地矩阵系统里的账号编号，不一定等于小红书昵称。

示例：

```text
xhs_default
xhs_test_01
xhs_test_02
```

后续搜索、发布、增长、评论检查，都必须指定 `account_id`。

## 2. 查看账号

接口：

```http
GET http://127.0.0.1:18160/api/accounts
```

命令：

```bash
cd /Users/jason/Nova/XHS-mcp
npm run dev:list-accounts
```

页面：

```text
http://127.0.0.1:18160/admin
```

## 3. 创建账号

接口：

```http
POST http://127.0.0.1:18160/api/accounts
Content-Type: application/json
```

请求：

```json
{
  "account_id": "xhs_pet_01",
  "display_name": "宠物号 01",
  "notes": "宠物用品账号"
}
```

命令：

```bash
cd /Users/jason/Nova/XHS-mcp
npm run dev:create-account -- xhs_pet_01 "宠物号 01"
```

创建后，系统会给账号分配端口和工作目录。

## 4. 启动账号 MCP

接口：

```http
POST http://127.0.0.1:18160/api/accounts/{account_id}/start
```

命令：

```bash
npm run dev:start-account -- xhs_pet_01
```

## 5. 检查登录状态

接口：

```http
POST http://127.0.0.1:18160/api/accounts/{account_id}/login-status
```

命令：

```bash
npm run dev:check-account-login -- xhs_pet_01
```

## 6. 获取登录二维码

接口：

```http
POST http://127.0.0.1:18160/api/accounts/{account_id}/login-qrcode
```

页面：

```text
http://127.0.0.1:18160/admin
```

用户扫码后，再检查登录状态。

## 7. 停止账号 MCP

接口：

```http
POST http://127.0.0.1:18160/api/accounts/{account_id}/stop
```

命令：

```bash
npm run dev:stop-account -- xhs_pet_01
```

## 8. OpenClaw 标准流程

```text
1. GET /api/accounts
2. 确认用户要操作哪个 account_id
3. 如果账号未启动，POST /start
4. POST /login-status
5. 如果未登录，POST /login-qrcode 并指导用户扫码
6. 登录成功后再执行搜索、发布、增长等业务
```

## 9. 注意事项

- 不要猜 `account_id`，必须读取账号列表。
- 不要把小红书昵称当成 `account_id`。
- 一个账号一个素材目录，一个账号一个登录状态。
- 账号未登录时，不要继续发布、搜索、评论等动作。

