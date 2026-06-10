# FlowForge

A production-grade workflow automation platform — build automated pipelines by connecting triggers to actions across services. Think of it as your self-hosted Zapier.

---

## Architecture

FlowForge is a distributed, event-driven system composed of five independent services communicating via a Kafka message queue and a shared PostgreSQL database.

```
┌─────────────┐     webhook      ┌───────────────┐
│   Frontend  │ ─────────────── ▶│  Hooks Service│
│  (Next.js)  │                  │   (port 3002) │
└──────┬──────┘                  └───────┬───────┘
       │ REST API                        │ writes ZapRun + ZapRunOutbox
       ▼                                 ▼
┌─────────────────┐            ┌──────────────────┐
│ Primary Backend │            │    PostgreSQL     │
│   (port 3000)   │◀──────────▶│    (port 5432)   │
│  Auth + Zap     │            └────────┬─────────┘
│  CRUD + History │                     │ polls every 3s
└─────────────────┘            ┌────────▼─────────┐
                                │    Processor     │
                                │  (outbox worker) │
                                └────────┬─────────┘
                                         │ publishes
                                         ▼
                                ┌──────────────────┐
                                │      Kafka       │
                                │   zap-events     │
                                └────────┬─────────┘
                                         │ consumes
                                         ▼
                                ┌──────────────────┐
                                │     Worker       │
                                │  Action Executor │
                                │  Email │ Webhook │
                                │  Slack │ Solana  │
                                └──────────────────┘
```

### How a workflow runs

1. An external service hits `POST /hooks/catch/:userId/:zapId` on the Hooks service
2. Hooks validates the zap ownership, checks idempotency key, creates a `ZapRun` + `ZapRunOutbox` entry in PostgreSQL atomically
3. Processor polls the outbox every 3 seconds, publishes pending runs to Kafka, deletes processed outbox entries
4. Worker consumes from Kafka, looks up the zap's actions, executes them in order (stage 0 → 1 → 2 ...), and re-publishes to Kafka for each subsequent stage
5. Each action execution is logged to `ZapRunLog` with status (SUCCESS/FAILED), timestamp, and error details

---

## Services

| Service | Port | Tech | Responsibility |
|---|---|---|---|
| `frontend` | 3001 | Next.js 14, Tailwind CSS | UI — landing, auth, dashboard, zap builder, run history |
| `primary-backend` | 3000 | Express, Prisma, JWT, bcrypt | Auth, Zap CRUD, run history API |
| `hooks` | 3002 | Express, express-rate-limit | Webhook ingestion with rate limiting + idempotency |
| `processor` | — | Node.js, KafkaJS | Transactional outbox processor |
| `worker` | — | Node.js, KafkaJS, Resend | Pluggable action executor |

---

## Features

- **Webhook Triggers** — every zap gets a unique webhook URL; any external service can trigger it
- **Multi-step Actions** — chain multiple actions in sequence (email → webhook → Slack)
- **Pluggable Action Registry** — adding a new action type requires zero changes to the execution pipeline; drop a file in `actions/` and register one line
- **Execution History** — per-zap run logs with status (SUCCESS/FAILED), stage, timestamp, and error details visible in the UI
- **Email Verification** — users must verify their email before accessing the platform (via Resend)
- **Password Reset** — token-based password reset with 15-minute expiry
- **Bcrypt Password Hashing** — passwords hashed with 10 salt rounds, never stored in plaintext
- **Rate Limiting** — webhook ingestion limited to 30 requests/minute per IP
- **Idempotent Webhook Ingestion** — duplicate webhook deliveries safely deduplicated via `X-Idempotency-Key` header
- **Transactional Outbox Pattern** — ZapRun and ZapRunOutbox created atomically; guarantees no run is lost even if Kafka is temporarily down
- **Dockerised** — entire stack (all services + PostgreSQL + Kafka) spins up with one command

---

## Tech Stack

**Backend:** Node.js, TypeScript, Express, Prisma ORM, PostgreSQL, Kafka (KafkaJS), JWT, bcrypt, Zod, dotenv  
**Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Axios  
**Infrastructure:** Docker, Docker Compose, GitHub Actions (CI)  
**Email:** Resend API  

---

## Getting Started

### Prerequisites

- [Docker](https://www.docker.com/) and Docker Compose
- Node.js 20+
- A [Resend](https://resend.com) account (free tier is sufficient)

### 1. Clone the repository

```bash
git clone https://github.com/Abhi2627/FlowForge.git
cd FlowForge
```

### 2. Configure environment variables

Copy the example env files for each service and fill in your values:

```bash
cp primary-backend/.env.example primary-backend/.env
cp hooks/.env.example hooks/.env
cp processor/.env.example processor/.env
cp worker/.env.example worker/.env
cp frontend/.env.example frontend/.env
```

Key values to fill in:
- `JWT_PASSWORD` — any strong random string
- `RESEND_API_KEY` — from your Resend dashboard
- `APP_URL` — set to `http://localhost:3000` for local dev (used in verification email links)

### 3. Start the full stack (Docker)

```bash
docker-compose up --build
```

This starts PostgreSQL, Zookeeper, Kafka, and all five application services.

### 4. Run database migrations and seed

```bash
docker exec -it flowforge-primary-backend npx prisma migrate deploy
docker exec -it flowforge-primary-backend npx prisma db seed
```

### 5. Open the app

Navigate to [http://localhost:3001](http://localhost:3001)

---

## Local Development (without Docker)

Use the provided dev script to start all services locally with PostgreSQL running in Docker:

```bash
chmod +x dev.sh stop.sh
./dev.sh       # starts everything
./stop.sh      # stops everything
```

Logs for each service are written to `./logs/<service>.log`.

---

## Triggering a Zap

Once you've created a zap via the dashboard, trigger it using curl:

```bash
curl -X POST http://localhost:3002/hooks/catch/<userId>/<zapId> \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}'
```

With idempotency (safe to retry):

```bash
curl -X POST http://localhost:3002/hooks/catch/<userId>/<zapId> \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: unique-request-id-123" \
  -d '{"key": "value"}'
```

---

## Environment Variables

### primary-backend

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/flowforge` |
| `JWT_PASSWORD` | JWT signing secret | `your-strong-secret-here` |
| `RESEND_API_KEY` | Resend API key for email verification | `re_xxxxxxxxxxxx` |
| `APP_URL` | Backend URL for email verification links | `http://localhost:3000` |

### hooks

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |

### processor

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `KAFKA_BROKER` | Kafka broker address (`localhost:9092`) |

### worker

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `KAFKA_BROKER` | Kafka broker address (`localhost:9092`) |
| `RESEND_API_KEY` | Resend API key for sending action emails |

---

## Project Structure

```
FlowForge/
├── primary-backend/        # Auth + Zap CRUD + history API
│   ├── prisma/             # Database schema and migrations
│   └── src/
│       ├── router/         # Route handlers (user, zap, action, trigger)
│       ├── middleware.ts   # JWT auth + global error handler
│       ├── email.ts        # Resend email helpers
│       └── index.ts
├── hooks/                  # Webhook ingestion (rate limiting + idempotency)
│   └── src/
├── processor/              # Transactional outbox → Kafka publisher
│   └── src/
├── worker/                 # Action executor
│   └── src/
│       ├── actions/        # Pluggable handlers: email, webhook, slack, solana
│       │   └── registry.ts # Maps action IDs to handlers
│       └── index.ts
├── frontend/               # Next.js 14 frontend
│   ├── app/
│   │   ├── dashboard/      # Zap list with real createdAt dates
│   │   ├── zap/
│   │   │   ├── create/     # Zap builder
│   │   │   └── [zapId]/    # Execution history per zap
│   │   ├── login/
│   │   └── signup/
│   └── components/
├── docker-compose.yml
├── dev.sh                  # Local dev startup script
├── stop.sh                 # Local dev stop script
└── .github/
    └── workflows/
        └── ci.yml          # TypeScript typecheck + frontend build on every push
```

---

## CI/CD

GitHub Actions runs on every push to `main` and every pull request:
- TypeScript typecheck across all 4 backend services
- Production build verification for the frontend

---

## Supported Action Types

| Action ID | Description | Required Metadata |
|---|---|---|
| `email` | Send email via Resend | `email`, `body` |
| `webhook` | HTTP POST to any URL | `url`, `body` (optional) |
| `slack` | Slack Incoming Webhook notification | `webhookUrl`, `message` |
| `send-sol` | Send Solana (SOL) | `address`, `amount` |

To add a new action: create a handler in `worker/src/actions/`, import it in `registry.ts`, add one line. Zero changes to the execution pipeline.

---

## Roadmap

- [ ] React Flow visual zap builder
- [ ] Zap enable/disable toggle
- [ ] More trigger types (cron schedule)
- [ ] More action types (Google Sheets, Notion, Discord)
- [ ] Usage dashboard with run counts and success rates

---

## License

MIT
