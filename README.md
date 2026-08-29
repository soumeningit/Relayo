# Relayo

Reliable webhook delivery for your application's events — ingest once, deliver everywhere.

Relayo is a full-stack webhook delivery platform. Point an API key at a single HTTP endpoint, and Relayo fans your events out to every configured destination with signed payloads, retries and exponential backoff, per-key rate limiting, and a full delivery dashboard.

Built as a **Turborepo monorepo**: an Express 5 API, a React 19 dashboard, a Prisma/Postgres data layer, a Redis-backed rate limiter, and a BullMQ delivery pipeline.

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)
![Express 5](https://img.shields.io/badge/Express_5-000000?logo=express)
![React 19](https://img.shields.io/badge/React_19-61DAFB?logo=react&logoColor=000)
![Prisma](https://img.shields.io/badge/Prisma_7-2D3748?logo=prisma)
![Postgres](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?logo=redis&logoColor=white)
![BullMQ](https://img.shields.io/badge/BullMQ-FE7A16?logo=redis)
![Turborepo](https://img.shields.io/badge/Turborepo-EF4444?logo=turborepo&logoColor=white)
![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)

---

## Features

**Ingest**
- One endpoint (`POST /api/v1/event/accept-event`) for all your application events
- Auth via API keys (hashed + scoped, with rotation, revocation and MFA support)
- Fan-out to every active destination, or to a specific one via `destinationId`
- Sliding-window rate limiting per API key / IP / user with full audit logs

**Delivery**
- HMAC-SHA256 signed payloads (`X-Relayo-Signature`) so receivers can verify authenticity
- BullMQ + Redis queue with 5 attempts and exponential backoff (`2s · 2^n`)
- Automatic destination pausing after 10 consecutive failures (circuit breaker)
- Per-delivery status tracking, response codes, and manual replay from the dashboard

**Platform**
- Auth: email verification, MFA (TOTP), password reset, refresh tokens
- Teams: orgs, roles (owner/admin/member/viewer), invitations
- Recent events, deliveries and dashboard stats with pagination + search
- Cloudinary avatar uploads, encrypted-at-rest signing secrets

---

## Architecture

```
                   ┌──────────────────────────────────────────────┐
                   │ apps/frontend  (React 19 + Vite dashboard)   │
                   └──────────────────────┬───────────────────────┘
                                          │ HTTPS / JSON
                   ┌──────────────────────▼───────────────────────┐
                   │ apps/backend  (Express 5 API)                │
                   │  • extractIdentity → rateLimit middleware    │
                   │  • validateTenant (API key → org)            │
                   │  • accept-event → Event + Delivery rows      │
                   └───────┬───────────────────────┬──────────────┘
                           │                       │
                 ┌─────────▼─────────┐   ┌─────────▼──────────────┐
                 │  Postgres (Prisma) │   │ Redis (ioredis)        │
                 │  events,deliveries │   │ • rate-limiter windows │
                 │  orgs, keys, users │   │ • BullMQ queue         │
                 └────────────────────┘   │ • signing-secret cache │
                                          └────────────────────────┘
                                           ▲
                                           │ fetch
                 ┌─────────────────────────┴─────────────────────────┐
                 │ workers/deliveryWorker (BullMQ consumer)          │
                 │  sign → POST destination.url → retry/backoff      │
                 └───────────────────────────────────────────────────┘
```

The rate limiter, Redis client, and queue connection are extracted into shared packages so API and workers always use the same knobs.

## Repository layout

```
apps/
  backend/    Express 5 API + controllers/services/workers
  frontend/   React 19 + Vite dashboard
packages/
  database/            Prisma schema, migrations, seed, generated client
  infrastructure/redis ioredis singleton + BullMQ connection helpers
  rate-limiter/        middleware, strategies, config cache, audit workers
  ui/ eslint-config/   shared components & configs
tools/
  load/                k6 + autocannon load-test scripts (see Benchmarks)
```

---

## Getting started

Prerequisites: **Node 20+**, **pnpm 8.15+**, a local **Postgres**, and a local **Redis** (Redis 6+).

```bash
# 1. Install workspace dependencies
pnpm install

# 2. Configure environment (copy-edit the examples — never commit `.env`)
cp apps/backend/.env.example        apps/backend/.env
cp apps/frontend/.env.example       apps/frontend/.env
cp packages/database/.env.example   packages/database/.env

# 3. Apply the database schema and seed the rate-limit configs
pnpm --filter @repo/db db:migrate
pnpm --filter @repo/db db:seed:rate-limit

# 4. Run everything (API + rate-limiter workers + delivery worker)
pnpm --filter backend dev:all

# 5. Run the dashboard (separate terminal)
pnpm --filter frontend dev
```

- Dashboard → http://localhost:5173
- API → http://localhost:5000 (health at `/health`)

### Backend env (see `apps/backend/.env.example`)

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection (`?sslmode=require` for Supabase) |
| `JWT_SECRET` | yes | Auth token signing |
| `ENCRYPTION_KEY` | yes | AES-256-GCM key (exactly 64 hex chars) for signing secrets at rest |
| `REDIS_HOST` / `REDIS_PORT` | yes | Rate limiter + BullMQ + secret cache |
| `REDIS_PASSWORD` / `REDIS_TLS` | no | Auth / TLS-enabled Redis (Upstash) |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | no* | One-time 30-day plan payments (lazy: backend boots without them) |
| `RAZORPAY_WEBHOOK_SECRET` | no | Signature verification for the `POST /webhooks/razorpay` reconciliation endpoint |
| `MAIL_*` / `CLOUDINARY_*` / `CLIENT_URL` / `FRONTEND_URL` | no | Email, avatars, frontend links |
| `RATE_LIMIT_ENABLED=false` | no | Run without throttling (baseline load tests) |

### Frontend env (see `apps/frontend/.env.example`)

| Variable | Purpose |
|---|---|
| `VITE_BACKEND_BASE_URL` | Base URL of the API |
| `VITE_RAZORPAY_KEY_ID` | Razorpay Key ID for the checkout modal (public) |
| `VITE_ENCRYPT_STORAGE_KEY` | (Optional) at-rest localStorage obfuscation; ships to the browser |

---

## API reference

### Send an event

```
POST /api/v1/event/accept-event
Authorization: Bearer <api-key>      # org authentication
x-api-key: <api-key>                 # rate-limit identity (keys get 1000 req/min)
Content-Type: application/json
```

```json
{
  "eventType": "user.signed_up",
  "payload": { "userId": "u_123", "email": "ada@example.com" },
  "destinationId": "d_abc123"
}
```

`destinationId` is optional — omit it to fan out to all active destinations.

```json
{
  "success": true,
  "message": "Event accepted successfully",
  "data": {
    "eventId": "6f0b2f52-…",
    "queued_for_delivery": 1
  }
}
```

### Billing (one-time payments, no subscriptions)

Every successful payment grants one 30-day period. When it lapses, the billing
worker returns the organization to Free (data is kept) until you pay once again.

```
PATCH /api/v1/org/:identifier/payment
Authorization: Bearer <jwt>
{ "planType": "PRO" }              # FREE | PRO | SCALE
```

`FREE` activates immediately. Paid plans return a Razorpay order for the
checkout modal:

```json
{
  "success": true,
  "data": {
    "id": "ORG-…",
    "paymentType": "PRO",
    "paymentStatus": "PENDING",
    "currentPeriodEnd": null,
    "order": { "orderId": "order_Nxxx", "amount": 99900, "currency": "INR", "keyId": "rzp_test_…" }
  }
}
```

After the customer pays in the modal, verify the payment server-side:

```
POST /api/v1/org/:identifier/payment/verify
{ "razorpayOrderId": "order_Nxxx", "razorpayPaymentId": "pay_Nxxx", "razorpaySignature": "…" }
```

Razorpay also notifies your webhook (`POST /webhooks/razorpay`, HMAC verified
against `RAZORPAY_WEBHOOK_SECRET`, mounted before the JSON body parser) so
payments are reconciled even if the browser closes mid-flow.

The event is persisted and queued for delivery cases in the same request path; you get an `eventId` (also usable as your idempotency key).

### Outgoing webhook request (delivery)

```http
POST {destination.url} HTTP/1.1
Content-Type: application/json
X-Relayo-Signature: t=1720000000,v1=6f0b2f52…

{ "userId": "u_123", "email": "ada@example.com" }
```

The signature is `HMAC-SHA256(signingSecret, "${timestamp}.${JSON.stringify(payload)}")` where `timestamp` is the epoch seconds claim. Verify it like this:

```js
import crypto from "node:crypto";

function verify(payload, rawBody, signingSecret) {
  const { t, v1 } = Object.fromEntries(
    rawBody.split(",").map((p) => p.split("=")),
  );
  const expected = crypto
    .createHmac("sha256", signingSecret)
    .update(`${t}.${JSON.stringify(payload)}`)
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(v1), Buffer.from(expected));
}
```

### Delivery & retry semantics

| Setting | Value |
|---|---|
| Max attempts per delivery | 5 |
| Backoff | `2s · 2ᵃᵗᵗᵉᵐᵖᵗ` (2s, 4s, 8s, 16s, …) |
| Timeout per attempt | 10s |
| Status counts as success | HTTP `< 500` (4xx is terminal, 5xx retries) |
| Auto-pause destination | after 10 consecutive failures |
| Replay | from the failed-deliveries dashboard page |

### Rate limiting

The limiter sits in front of all `/api/v1` routes and is identity-aware. Seed configs (`pnpm --filter @repo/db db:seed:rate-limit`):

| Config | Identity | Strategy | Limit |
|---|---|---|---|
| `api-key-limit` | API key | sliding window | 1000 req/min |
| `global-ip-limit` | IP | sliding window | 100 req/min |

Allowed responses carry `X-RateLimit-Limit`, `X-RateLimit-Remaining` and `X-RateLimit-Strategy`. Exceeded requests get HTTP `429` with `Retry-After`. `RATE_LIMIT_ENABLED=false` disables the limiter entirely; if Redis is unreachable in dev the middleware fails open (degraded mode, reported by `/health`).

---

## Load testing

Reproducible load scripts live in [`tools/load`](tools/load) (`config.js` is shared between k6 and autocannon). Install [k6](https://grafana.com/k6/) and [autocannon](https://github.com/mcollina/autocannon), then:

```bash
# Steady ingest — below the api-key limit; expects ~0 429s
$env:LOAD_TARGET="http://localhost:5000"; $env:API_KEY="REL-…"; pnpm --filter backend load:k6:steady

# Over-limit ingest — expects the limiter to admit ~1000/min and 429 the rest
pnpm --filter backend load:k6:overlimit

# autocannon readout (30s default), with per-status breakdown
pnpm --filter backend load:autocannon
```

Set `EXPECT_RATE_LIMIT=false` when the server runs without a limiter (it gates header assertions and the 429 threshold).

### Benchmarks

Local development machine, API + workers in separate processes (`pnpm dev:all`).

**Hot-path optimization: before → after** (steady ingest, limiter off)

| Metric | Before | After |
|---|---|---|
| p95 latency | 6.19 s | **41 ms** |
| Failed requests | ~72% | **0** |

The bottleneck was shared-Pg-pool starvation + an in-process worker competing with request handoff. Fixes: separated the worker process, sized the Prisma pool, coalesced failure writes into a single transaction, and mapped transient DB errors to HTTP 503 with `Retry-After`.

**Rate limiter behavior** (over-limit, 2400 req/min)

| Result | Count |
|---|---|
| `200` admitted | 1000 (41.7%) |
| `429` rejected | 1367 (57.8%) |
| `5xx` / connection errors | 0 |
| Admitted/km | exactly the 1000/min api-key window |

---

## Deployment on a $0 stack

The whole system runs free-tier: **Vercel** (frontend) → **Render** (API web service) → **Supabase** (Postgres) + **Upstash** (Redis, BullMQ, rate limiter).

Key facts to know first:

- **Render free** has no background-worker service type. Set `RUN_WORKERS=true` in the single web service so the API process also boots the delivery + rate-limiter workers.
- Free web services **spin down after 15 minutes idle** (≈1 min cold start). A free monitor (e.g. UptimeRobot) hitting `/health` every 5 min keeps it warm.
- **Upstash Redis is TLS-only** → set `REDIS_TLS=true`; free tier caps at 500K commands/mo — BullMQ and the limiter consume it, so watch the dashboard.
- **Supabase** needs `sslmode=require` in `DATABASE_URL` and pauses after 7 idle days (re-enable from the dashboard).

Build (`prisma generate` is required — the generated client is gitignored):

```bash
pnpm install
pnpm --filter @repo/db db:generate       # also run db:deploy against the remote DB
```

---

## Roadmap

- Destination-level event-type subscriptions (filter which events reach which URL)
- Stripe billing (free / pro / scale tiers)
- Automated unit + integration test suite

## Security notes

- `.env` files are gitignored; only `.env.example` placeholders are committed.
- Signing secrets are encrypted at rest with AES-256-GCM (`ENCRYPTION_KEY`).
- API keys are stored hashed, with optional per-key MFA.
- Enabling GitHub Secret Scanning on this public repo is recommended.

## License

[MIT](LICENSE) © 2026 soumeningit