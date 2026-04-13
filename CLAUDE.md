# Wraith Gateway — API Gateway & Developer Platform

You are building the Wraith Gateway — the public-facing API layer for the Wraith Protocol managed platform. It handles developer auth, API key management, rate limiting, usage metering, billing, and proxies agent requests to Spectre (TEE).

This is a NestJS server with PostgreSQL and Redis.

## Reference Docs

Read ALL files in `reference/docs/gateway/` before writing code:

- `01-architecture.md` — System diagram, what gateway does vs Spectre
- `02-database-schema.md` — Full schema: developers, teams, API keys, usage logs, plans, webhooks
- `03-authentication.md` — Passport strategies (Google, GitHub, email), JWT, API key validation, internal auth
- `04-billing.md` — Stripe integration, plans, rate limiting, usage metering
- `05-api-endpoints.md` — Every endpoint (auth, teams, keys, billing, usage, proxy)
- `06-module-structure.md` — NestJS module layout, env vars, dependencies

## Implementation Steps

Commit after each step. Push after each step.

### Step 1 — Scaffold

- NestJS project with `package.json`, `tsconfig.json`, `nest-cli.json`
- Prettier, husky, commitlint (same config as other repos)
- `.github/workflows/ci.yml`
- Basic `AppModule`, health endpoint
- Docker compose: app + postgres + redis
- `.env.example` with all env vars from `06-module-structure.md`
- README.md

Verify: `pnpm build` compiles, `/health` responds.

### Step 2 — Database & Entities

TypeORM entities for all tables in `02-database-schema.md`:

- `DeveloperEntity`, `TeamEntity`, `TeamMemberEntity`
- `ApiKeyEntity`, `UsageLogEntity`, `PlanEntity`
- `WebhookEndpointEntity`, `RefreshTokenEntity`

Seed default plans (free, pro, enterprise).

Verify: server starts, tables auto-created.

### Step 3 — Auth Module

Passport.js with three strategies — see `03-authentication.md`:

- `LocalStrategy` — email/password with bcrypt
- `GoogleStrategy` — Google OAuth 2.0
- `GitHubStrategy` — GitHub OAuth
- `JwtStrategy` — JWT validation for protected routes
- JWT access tokens (1h) + refresh tokens (30d, httpOnly cookie)
- Auto-create default team on registration
- All auth endpoints from `03-authentication.md`

Verify: register → login → get `/auth/me` with JWT.

### Step 4 — Teams & API Keys

- Team CRUD with member management and roles (owner, admin, member)
- API key generation: `wraith_live_` and `wraith_test_` prefixes
- Key hashing with SHA-256 — full key returned only on creation
- `ApiKeyGuard` that validates Bearer token, checks revocation/expiration
- Key lookup, revocation, listing (shows prefix + name, never full key)

Verify: create team → create API key → use key in Authorization header → guard passes.

### Step 5 — Rate Limiting & Usage

- Redis sliding window rate limiter — see `04-billing.md` for limits per plan
- `RateLimitGuard` that checks against team's plan limits
- Rate limit headers on every response (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`)
- Usage logging service: logs every request to `usage_logs`
- Usage query endpoints: summary, daily, by-key, by-endpoint

Verify: make requests → hit rate limit → get 429 → usage shows in queries.

### Step 6 — Billing (Stripe)

- Stripe Checkout session creation for plan upgrades
- Stripe Customer Portal for subscription management
- Webhook handler for Stripe events (checkout complete, invoice paid/failed, subscription changes)
- Plan upgrade/downgrade logic
- Crypto payment support via Stripe Checkout

Verify: create checkout session → (Stripe test mode) complete → plan upgraded.

### Step 7 — Proxy to Spectre

- Proxy controller that forwards all `/v1/*` requests to Spectre
- Internal auth: `X-Gateway-Secret` header
- Forward `X-AI-Provider` and `X-AI-Key` headers for BYOM
- Read `X-Tokens-Used` from Spectre response for usage logging
- All proxied endpoints from `05-api-endpoints.md`

Verify: create API key → call `/v1/health` → proxied to Spectre → response returned.

### Step 8 — Webhooks

- Webhook endpoint CRUD per team
- Signing secret generation per endpoint
- Event delivery with retry logic (3 retries, exponential backoff)
- Test event endpoint
- Webhook payload signing: `HMAC-SHA256(payload, secret)`

Verify: register webhook → trigger test event → delivery received.

### Step 9 — Docker & Deployment

- Dockerfile (production build)
- `docker-compose.yml` with app + postgres + redis
- Health check includes DB + Redis + Spectre connectivity

Verify: `docker compose up` → all services healthy.

## Final Structure

```
gateway/
  package.json
  tsconfig.json
  nest-cli.json
  Dockerfile
  docker-compose.yml
  .env.example
  .prettierrc
  .prettierignore
  commitlint.config.js
  .github/workflows/ci.yml
  README.md
  src/
    main.ts
    app.module.ts
    config/configuration.ts
    auth/
      auth.module.ts
      auth.controller.ts
      auth.service.ts
      strategies/local.strategy.ts
      strategies/google.strategy.ts
      strategies/github.strategy.ts
      strategies/jwt.strategy.ts
      guards/jwt-auth.guard.ts
      guards/api-key.guard.ts
      guards/team-role.guard.ts
      decorators/current-developer.decorator.ts
      decorators/current-team.decorator.ts
    teams/
      teams.module.ts
      teams.controller.ts
      teams.service.ts
    keys/
      keys.module.ts
      keys.controller.ts
      keys.service.ts
    billing/
      billing.module.ts
      billing.controller.ts
      billing.service.ts
    usage/
      usage.module.ts
      usage.controller.ts
      usage.service.ts
    rate-limit/
      rate-limit.module.ts
      rate-limit.service.ts
      rate-limit.guard.ts
    proxy/
      proxy.module.ts
      proxy.controller.ts
      proxy.service.ts
    webhooks/
      webhooks.module.ts
      webhooks.controller.ts
      webhooks.service.ts
    storage/
      storage.module.ts
      database.service.ts
      entities/*.entity.ts
    health/
      health.module.ts
      health.controller.ts
  reference/              # DO NOT MODIFY
```

## Rules

- NEVER add Co-Authored-By lines to commits
- NEVER commit, modify, or delete anything in the reference/ folder — it is gitignored and read-only
- NEVER add numbered step comments in code
- All commit messages MUST follow conventional commits format
- Commit and push after each completed step
- Use bcrypt for passwords, SHA-256 for API key hashing
- API keys are returned in full ONLY on creation, never again
- Rate limit all proxied endpoints, not auth/dashboard endpoints
- Spectre internal URL must never be exposed to developers
