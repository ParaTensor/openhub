# Skills & Quickstart — 构建类似 AI 网关项目

本文档总结构建类似 **OpenHub**（多 Provider AI 模型网关 + 管理控制台）所需的核心技能和快速上手路径。

---

## 一、核心技能图谱

### 1. Rust 后端（数据平面 / 高性能代理）

**必学技能：**

| 技能 | 学习资源 |
|------|----------|
| Rust 基础（所有权、生命周期、trait） | [The Rust Book](https://doc.rust-lang.org/book/) |
| 异步编程（async/await + Tokio） | [Tokio Tutorial](https://tokio.rs/tokio/tutorial) |
| Axum Web 框架（路由、提取器、中间件） | [Axum docs](https://docs.rs/axum) |
| SQLx 异步数据库访问 | [SQLx GitHub](https://github.com/launchbadge/sqlx) |
| serde 序列化（JSON / YAML） | [serde.rs](https://serde.rs) |
| 错误处理（anyhow + thiserror） | [Error Handling 最佳实践](https://nick.groenen.me/posts/rust-error-handling/) |
| HTTP 流（SSE / streaming） | tokio-stream + async-stream |
| Tower 中间件（CORS、rate-limit） | [tower-http docs](https://docs.rs/tower-http) |

**快捷起步（Rust API 服务）：**

```bash
cargo new my-gateway
# 在 Cargo.toml 中添加：
# axum = "0.7"
# tokio = { version = "1", features = ["full"] }
# serde = { version = "1", features = ["derive"] }
# serde_json = "1"
# tower-http = { version = "0.5", features = ["cors"] }
```

---

### 2. Node.js 控制平面（管理 API）

**必学技能：**

| 技能 | 说明 |
|------|------|
| TypeScript（strict 模式） | 所有后端代码使用 TS |
| Express.js 路由 & 中间件 | REST API 框架 |
| node-postgres (`pg`) | PostgreSQL 客户端 |
| ioredis | Redis 客户端（缓存 / 会话） |
| ES Modules（`"type": "module"`） | Node.js 现代模块系统 |
| tsx | 直接运行 `.ts` 文件，无需编译 |
| dotenv | 环境变量管理 |

**快捷起步（Node.js API）：**

```bash
mkdir my-hub && cd my-hub
npm init -y
npm install express pg ioredis dotenv
npm install -D typescript tsx @types/express @types/pg
npx tsc --init --strict
# 创建 server.ts，用 tsx server.ts 启动
```

---

### 3. React 前端（管理控制台）

**必学技能：**

| 技能 | 说明 |
|------|------|
| React 19 + Hooks | 函数式组件、useState、useEffect 等 |
| Vite 6 | 极速构建工具 |
| Tailwind CSS v4 | 原子化 CSS（v4 无需 config 文件） |
| React Router v7 | SPA 路由（`createBrowserRouter`） |
| react-i18next | 多语言国际化 |
| recharts | 数据图表 |
| @headlessui/react | 无障碍可访问的无样式 UI 组件 |
| lucide-react | SVG 图标 |
| motion | 动画库 |

**快捷起步（React + Vite + Tailwind v4）：**

```bash
npm create vite@latest my-web -- --template react-ts
cd my-web
npm install tailwindcss @tailwindcss/vite
npm install react-router-dom lucide-react @headlessui/react clsx tailwind-merge
npm install i18next react-i18next i18next-browser-languagedetector
npm install recharts motion
```

在 `vite.config.ts` 中添加 Tailwind 插件：

```ts
import tailwindcss from '@tailwindcss/vite'
export default { plugins: [react(), tailwindcss()] }
```

在 `src/index.css` 中引入：

```css
@import "tailwindcss";
```

---

### 4. Monorepo 管理（npm workspaces）

**快捷起步：**

```json
// 根 package.json
{
  "private": true,
  "workspaces": ["hub", "web", "packages/*"],
  "scripts": {
    "dev": "npm run dev --workspace=hub",
    "build": "npm run build --workspace=web"
  }
}
```

共享类型包放在 `packages/shared/`，其他包通过 `"@myapp/shared": "*"` 引用。

---

### 5. 基础设施技能

| 技能 | 工具 |
|------|------|
| PostgreSQL 数据建模 | 用户、Key、计费、日志等表设计 |
| Redis 使用 | 会话存储、速率限制、短期缓存 |
| 环境变量管理 | `.env` + `dotenv` / `dotenvy` |
| CORS 配置 | Axum `tower-http` CORS layer |
| JWT / Session 认证 | bcrypt 密码哈希、SHA-2 签名 |

---

## 二、最小可用原型（MVP）路径

要快速构建一个类似 OpenHub 的 LLM 网关，推荐按以下顺序搭建：

```
Week 1: 数据平面原型
  ├─ Axum 基础路由 + /v1/chat/completions 接口
  ├─ llm-connector 或 reqwest 直接对接 OpenAI
  └─ SSE 流式转发

Week 2: 控制平面基础
  ├─ Express + PostgreSQL 用户注册/登录
  ├─ API Key 生成与校验
  └─ Redis 会话管理

Week 3: 前端控制台
  ├─ Vite + React + Tailwind 脚手架
  ├─ 登录页 + API Key 管理页
  └─ 调用日志列表

Week 4: 集成 & 部署
  ├─ Monorepo 整合
  ├─ 计费 / 用量统计
  └─ Docker Compose（Gateway + Hub + Web + PG + Redis）
```

---

## 三、推荐的 Docker Compose 模板

```yaml
version: '3.9'
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: openhub
      POSTGRES_USER: openhub
      POSTGRES_PASSWORD: secret
    ports: ["5432:5432"]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  hub:
    build: ./hub
    ports: ["3322:3322"]
    environment:
      DATABASE_URL: postgresql://openhub:secret@postgres:5432/openhub
      REDIS_URL: redis://redis:6379
    depends_on: [postgres, redis]

  gateway:
    build: ./gateway
    ports: ["3000:3000"]
    depends_on: [postgres]

  web:
    build: ./web
    ports: ["80:80"]
    depends_on: [hub]
```

---

## 四、关键 Crate / Package 速查

### Rust Crates

```toml
axum = "0.7"
tokio = { version = "1", features = ["full"] }
tower-http = { version = "0.5", features = ["cors", "trace"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
serde_yaml = "0.9"
sqlx = { version = "0.8", features = ["runtime-tokio-rustls", "postgres", "sqlite", "migrate"] }
reqwest = { version = "0.11", features = ["json", "stream"] }
anyhow = "1"
thiserror = "1"
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter"] }
clap = { version = "4", features = ["derive"] }
uuid = { version = "1", features = ["v4"] }
chrono = { version = "0.4", features = ["serde"] }
bcrypt = "0.16"
dotenvy = "0.15"
```

### Node.js Packages

```bash
# Runtime
express pg ioredis dotenv

# Dev
typescript tsx @types/express @types/pg
```

### Frontend Packages

```bash
# UI & Routing
react react-dom react-router-dom
@headlessui/react lucide-react recharts motion

# Styling
tailwindcss @tailwindcss/vite clsx tailwind-merge

# i18n
i18next react-i18next i18next-browser-languagedetector

# Build
vite @vitejs/plugin-react typescript
```

---

## 五、参考文档

- [`docs/tech-stack.md`](tech-stack.md) — 本项目完整技术栈一览
- [`docs/hub-gateway-integration.md`](hub-gateway-integration.md) — Hub 与 Gateway 集成设计
- [`docs/allinone.md`](allinone.md) — 架构整合方案
- [`docs/billing.md`](billing.md) — 计费模型设计
- [`.github/copilot-instructions.md`](../.github/copilot-instructions.md) — AI 编码助手工作指南
