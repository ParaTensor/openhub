# OpenHub — AI Agent Instructions

> **Purpose:** Instructions for AI coding agents (GitHub Copilot, Cursor, etc.) working on this repository.  
> Describes architecture, conventions, tooling, and common workflows.

---

## Project Overview

**OpenHub** is a unified AI model gateway and management platform. It proxies LLM requests across multiple providers (OpenAI, Anthropic, Google Gemini, etc.) and provides a web console for managing users, API keys, pricing, and analytics.

### Monorepo Layout

```
openhub/
├── gateway/        # Data Plane — Rust (Axum/Tokio), OpenAI-compatible LLM proxy
├── hub/            # Control Plane — Node.js/Express (TypeScript), REST API on port 3322
├── web/            # Frontend Console — React 19 + Vite 6 + Tailwind CSS 4
├── packages/
│   └── shared/    # Shared TypeScript types used by hub and web
└── docs/          # Architecture and API documentation
```

---

## Technology Stack at a Glance

| Layer | Language | Key Frameworks |
|-------|----------|---------------|
| Data Plane (`gateway/`) | Rust (2021) | Axum 0.7, Tokio 1, SQLx 0.8, llm-connector 1.1.5 |
| Control Plane (`hub/`) | TypeScript 5.8 | Express 4, pg 8, ioredis 5 |
| Frontend (`web/`) | TypeScript 5.8 | React 19, Vite 6, Tailwind CSS 4, React Router 7 |
| Shared Types (`packages/shared/`) | TypeScript 5.8 | npm workspace |

Full details: see [`docs/tech-stack.md`](tech-stack.md).

---

## Development Conventions

### TypeScript (hub + web + shared)

- Use **TypeScript strict mode** — no `any` unless unavoidable.
- Shared types live in `packages/shared/` and are imported as `@openhub/shared`.
- The Hub uses **ES modules** (`"type": "module"` in `package.json`).
- Run TypeScript with `tsx` (no compile step in dev); production uses `tsc` for type-checking only.
- Linting is type-checking only: `npm run lint` runs `tsc -p tsconfig.json`.

### Rust (gateway)

- Follow standard Rust idioms: use `?` for error propagation, `thiserror` for library errors, `anyhow` for application errors.
- Async handlers use `axum` extractors; keep handlers thin, move logic to service functions.
- Database queries use `sqlx` compile-time checked macros where possible.
- All new routes must register CORS via `tower-http`.
- Run linting with `cargo clippy` and formatting with `cargo fmt`.

### React / Frontend

- Use **functional components** with hooks; no class components.
- Co-locate component styles using **Tailwind CSS** utility classes.
- Use `clsx` + `tailwind-merge` for conditional class names.
- Routing via `react-router-dom` v7 — use `createBrowserRouter` API.
- Internationalization: all user-visible strings go through `useTranslation()` from `react-i18next`.
- Icons from `lucide-react` only — don't add other icon libraries.
- Charts use `recharts`.
- Animation via `motion` (formerly Framer Motion).

---

## Common Workflows

### Start the full stack locally

```bash
# 1. Install JS/TS dependencies (run once)
npm install

# 2. Start the Control Plane Hub (port 3322)
npm run dev

# 3. Start the Gateway (new terminal)
cd gateway && cargo run

# 4. Start the Frontend dev server (new terminal, port 5173)
cd web && npm run dev
```

### Add a new Hub API endpoint

1. Add the route handler in `hub/server.ts` (or a new `hub/routes/*.ts` file).
2. Update shared types in `packages/shared/` if new request/response shapes are needed.
3. Update the corresponding frontend API call in `web/src/api/`.

### Add a new Gateway route (Rust)

1. Create a handler function in `gateway/src/handlers/`.
2. Register the route in the Axum router in `gateway/src/main.rs`.
3. Add any new SQLx queries in `gateway/src/db/`.

### Add a new frontend page

1. Create the page component in `web/src/pages/`.
2. Register the route in `web/src/App.tsx` (or the router config).
3. Add i18n keys to the translation files in `web/src/i18n/`.

---

## Environment Variables

### Hub (`hub/.env`)

```env
DATABASE_URL=postgresql://localhost:5432/openhub
REDIS_URL=redis://localhost:6379
```

### Web (`web/.env`)

```env
VITE_API_BASE_URL=http://127.0.0.1:3322
```

---

## Database

- PostgreSQL is the primary database (managed by Hub).
- Schema is initialized in `hub/db.ts` — add new tables/migrations there.
- Gateway uses SQLite (`gateway/gateway.db`) for its own lightweight local storage.
- Redis is used by Hub for session caching and rate limiting (via ioredis).

---

## Testing

- No formal test framework is configured yet; manual test scripts exist at `hub/test-mem.ts` and `hub/test-memtensor.js`.
- Rust unit tests can be run with `cargo test` inside the `gateway/` directory.
- When adding new features, add Rust `#[cfg(test)]` modules for pure logic and use `reqwest` blocking client for integration tests.

---

## Key Architectural Decisions

1. **Split data plane / control plane**: The Gateway (Rust) handles hot-path LLM traffic for performance; the Hub (Node.js) handles management APIs where developer velocity matters more than raw speed.
2. **OpenAI-compatible API**: The Gateway exposes `/v1/chat/completions` and translates requests to each backend provider, so clients don't need to change.
3. **Monorepo with npm workspaces**: Allows sharing TypeScript types between `hub` and `web` without publishing packages.
4. **Tailwind CSS v4**: Uses the new `@tailwindcss/vite` plugin (no `tailwind.config.js` required in v4).
5. **React 19**: Uses the new JSX transform; no need to import React in every file.
