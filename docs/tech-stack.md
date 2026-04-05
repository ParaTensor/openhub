# OpenHub 技术栈总览

OpenHub 是一个统一 AI 模型网关与管理平台，采用**三层架构**：数据平面（Gateway）、控制平面（Hub）、前端控制台（Web）。

---

## 架构概览

```
┌─────────────────────────────────────────────────────┐
│                   Web Console (React)               │
│   React 19 · Vite 6 · Tailwind CSS 4 · TypeScript  │
└────────────────────────┬────────────────────────────┘
                         │ HTTP/REST (port 5173 → 3322)
┌────────────────────────▼────────────────────────────┐
│              Control Plane / Hub (Node.js)          │
│   Express 4 · TypeScript · PostgreSQL · Redis       │
└────────────────────────┬────────────────────────────┘
                         │ SQL / Redis
┌────────────────────────▼────────────────────────────┐
│              Data Plane / Gateway (Rust)            │
│   Axum 0.7 · Tokio 1 · SQLx 0.8 · llm-connector    │
└────────────────────────┬────────────────────────────┘
                         │ HTTPS
             ┌───────────┼───────────┐
         OpenAI      Anthropic    Gemini …
```

---

## 分层技术栈

### 1. 数据平面 — Gateway（Rust）

| 类别 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 语言 | Rust | edition 2021 | 高性能、内存安全 |
| Web 框架 | Axum | 0.7 | 基于 Tower 的异步 HTTP 框架 |
| 异步运行时 | Tokio | 1.x (full) | 异步 IO 运行时 |
| 中间件 | tower-http | 0.5 | CORS、Trace、静态文件 |
| LLM 连接器 | llm-connector | 1.1.5 | 多 Provider 统一适配（含 streaming） |
| LLM Provider | llm_providers | 0.8.0 | OpenAI / Anthropic / Google 等 Provider 驱动 |
| 数据库 ORM | SQLx | 0.8 | 异步 SQL，支持 PostgreSQL & SQLite |
| 序列化 | serde / serde_json / serde_yaml | 1.x | 配置与 API 序列化 |
| 错误处理 | anyhow / thiserror | 1.x | 统一错误链 |
| 日志追踪 | tracing / tracing-subscriber | 0.1/0.3 | 结构化日志 |
| HTTP 客户端 | reqwest | 0.11 | 向上游 LLM 发送请求 |
| CLI | clap | 4.x (derive) | 命令行参数解析 |
| 工具库 | uuid, chrono, rand, bcrypt, sha2 | — | UUID 生成、时间、加密 |
| 流处理 | futures, tokio-stream, async-stream | — | SSE 流转发 |
| 邮件 | resend-rs | 0.21 | 邮件发送（验证码等） |
| 配置 | dotenvy | 0.15 | `.env` 环境变量 |

### 2. 控制平面 — Hub（Node.js）

| 类别 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 语言 | TypeScript | 5.8 | 强类型后端 |
| 运行时 | Node.js + tsx | — | 直接运行 `.ts` 文件（无需预编译） |
| Web 框架 | Express | 4.21 | HTTP API 服务（端口 3322） |
| 数据库客户端 | pg (node-postgres) | 8.20 | PostgreSQL 连接 |
| 缓存 | ioredis | 5.10 | Redis 连接（会话、缓存） |
| 环境变量 | dotenv | 17.x | 配置管理 |
| 类型共享 | @openhub/shared | workspace | 跨包共享 TypeScript 类型 |

### 3. 前端控制台 — Web（React）

| 类别 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 语言 | TypeScript | 5.8 | 强类型前端 |
| UI 框架 | React | 19.0 | 组件化 UI |
| 构建工具 | Vite | 6.2 | 极速 HMR 开发 & 生产构建 |
| CSS 框架 | Tailwind CSS | 4.1 | 原子化 CSS |
| 路由 | React Router DOM | 7.13 | SPA 路由 |
| 无头组件 | @headlessui/react | 2.x | 无样式可访问组件 |
| 图标 | lucide-react | 0.546 | SVG 图标库 |
| 图表 | recharts | 3.8 | 数据可视化 |
| 动画 | motion | 12.x | 声明式动画 |
| 国际化 | i18next + react-i18next | 26.x/17.x | i18n 多语言支持 |
| CSS 工具 | clsx + tailwind-merge | — | 条件类名合并 |
| Google AI SDK | @google/genai | 1.29 | Gemini API 直连（调试用） |

### 4. 共享包 — packages/shared

| 类别 | 技术 | 说明 |
|------|------|------|
| 语言 | TypeScript | 跨 hub / web 共享类型定义 |
| 包管理 | npm workspaces | monorepo 内引用 `@openhub/shared` |

### 5. 基础设施 & DevOps

| 类别 | 技术 | 说明 |
|------|------|------|
| 包管理 | npm workspaces (monorepo) | 根 `package.json` 统一管理所有 JS/TS 包 |
| 数据库 | PostgreSQL | 用户、模型、计费、API Key 持久化 |
| 缓存 | Redis | 会话缓存、速率限制 |
| 嵌入式 DB | SQLite（Gateway） | Gateway 本地轻量存储 |

---

## 数据库模式（主要表）

| 表名 | 说明 |
|------|------|
| users | 用户账户 |
| auth_sessions | 登录会话 |
| email_verifications | 邮件验证码 |
| models / llm_models | 模型目录 |
| provider_types | Provider 类型（OpenAI/Anthropic…） |
| provider_accounts | Provider 账户配置 |
| provider_api_keys | Provider API Key 管理 |
| user_api_keys | 用户 API Key |
| model_provider_pricings | 模型计费配置 |
| pricing_releases | 计费版本发布 |
| activity_logs | 调用日志 & 分析 |

---

## 关键端口

| 服务 | 端口 | 说明 |
|------|------|------|
| Gateway（Rust） | 3000（默认） | OpenAI 兼容 LLM 代理 |
| Hub（Node.js） | 3322 | 控制平面 API |
| Web（Vite Dev） | 5173 | 前端开发服务器，代理到 Hub |
