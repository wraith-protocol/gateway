# Wraith Gateway

API Gateway & Developer Platform for the Wraith Protocol managed platform. Handles developer authentication, API key management, rate limiting, usage metering, billing, and proxies agent requests to Spectre (TEE).

## Stack

- **Framework:** NestJS
- **Database:** PostgreSQL
- **Cache:** Redis
- **Auth:** Passport.js (Google OAuth, GitHub OAuth, email/password)
- **Billing:** Stripe
- **Proxy:** HTTP proxy to Spectre TEE

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm 9+
- PostgreSQL 16+
- Redis 7+

### Install

```bash
pnpm install
```

### Configure

```bash
cp .env.example .env
# Edit .env with your values
```

### Development

```bash
# Start dependencies
docker compose up db redis -d

# Start dev server
pnpm start:dev
```

### Build

```bash
pnpm build
```

### Test

```bash
pnpm test
```

### Docker

```bash
docker compose up
```

## API

- `GET /health` — Health check
- `POST /auth/register` — Register
- `POST /auth/login` — Login
- `GET /auth/me` — Current developer profile
- `GET /teams` — List teams
- `POST /teams/:id/keys` — Create API key
- `GET /billing/plans` — List plans
- `GET /usage/summary` — Usage summary
- `/v1/*` — Proxied to Spectre (API key auth)
