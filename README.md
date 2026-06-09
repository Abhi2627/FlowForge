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
       │ REST API                        │ writes ZapRunOutbox
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
                                │  Slack │ ...     │
                                └──────────────────┘
```

### How a workflow runs

1. An external service hits `POST /hooks/catch/:userId/:zapId` on the Hooks service
2. Hooks creates a `ZapRun` + `ZapRunOutbox` entry in PostgreSQL (transactional)
3. Processor polls the outbox every 3 seconds, publishes pending runs to Kafka, deletes processed outbox entries
4. Worker consumes from Kafka, looks up the zap's actions, executes them in order (stage 0 → 1 → 2 ...), and re-publishes to Kafka for each subsequent stage
5. Each action execution is logged to `ZapRunLog` with status, timestamp, and error details

---

## Services

| Service | Port | Tech | Responsibility |
|---|---|---|---|
| `frontend` | 3001 | Next.js 14, Tailwind CSS | UI — landing, auth, dashboard, zap builder, run history |
| `primary-backend` | 3000 | Express, Prisma, JWT | Auth, Zap CRUD, run history API |
| `hooks` | 3002 | Express | Webhook ingestion with rate limiting + idempotency |
| `processor` | — | Node.js, KafkaJS | Transactional outbox processor |
| `worker` | — | Node.js, KafkaJS | Pluggable action executor |

---

## Features

- **Webhook Triggers** — every zap gets a unique webhook URL; any external service can trigger it
- **Multi-step Actions** — chain multiple actions in sequence (email → webhook → Slack)
- **Pluggable Action Registry** — adding new action types requires zero changes to the execution pipeline
- **Execution History** — per-zap run logs with status (success/failed), timestamp, and error details
- **Email Verification** — users must verify their email before accessing the platform
- **Password Reset** — token-based password reset with 15-minute expiry
- **Rate Limiting** — webhook ingestion endpoint is rate-limited per IP
- **Idempotent Webhook Ingestion** — duplicate webhook deliveries are safely deduplicated
- **Dockerised** — entire stack (all services + PostgreSQL + Kafka) spins up with one command

---

## Tech Stack

**Backend:** Node.js, TypeScript, Express, Prisma ORM, PostgreSQL, Kafka (KafkaJS), JWT, bcrypt, Zod  
**Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Axios  
**Infrastructure:** Docker, Docker Compose, GitHub Actions (CI)  
**Email:** Resend API  

---

## Getting Started

### Prerequisites

- [Docker](https://www.docker.com/) and Docker Compose
- Node.js 18+
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

### 3. Start the full stack

```bash
docker-compose up --build
```

This starts PostgreSQL, Zookeeper, Kafka, and all five application services.

### 4. Run database migrations

In a separate terminal (after containers are up):

```bash
docker exec -it flowforge-primary-backend npx prisma migrate deploy
docker exec -it flowforge-primary-backend npx prisma db seed
```

### 5. Open the app

Navigate to [http://localhost:3001](http://localhost:3001)

---

## Environment Variables

### primary-backend

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/flowforge` |
| `JWT_PASSWORD` | JWT signing secret | `your-strong-secret-here` |
| `RESEND_API_KEY` | Resend API key for email verification | `re_xxxxxxxxxxxx` |
| `APP_URL` | Frontend URL for email links | `http://localhost:3001` |

### hooks

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | same as above |

### processor

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | same as above |
| `KAFKA_BROKER` | Kafka broker address | `localhost:9092` |

### worker

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | same as above |
| `KAFKA_BROKER` | Kafka broker address | `localhost:9092` |
| `RESEND_API_KEY` | Resend API key for sending action emails | `re_xxxxxxxxxxxx` |

---

## Project Structure

```
FlowForge/
├── primary-backend/        # Auth + Zap CRUD + history API
│   ├── prisma/             # Database schema and migrations
│   └── src/
│       ├── router/         # Route handlers (user, zap, action, trigger)
│       ├── middleware.ts   # JWT auth middleware
│       └── index.ts
├── hooks/                  # Webhook ingestion service
│   └── src/
├── processor/              # Outbox-to-Kafka processor
│   └── src/
├── worker/                 # Action executor
│   └── src/
│       ├── actions/        # Pluggable action handlers (email, webhook, slack)
│       └── index.ts
├── frontend/               # Next.js frontend
│   ├── app/
│   └── components/
├── docker-compose.yml
└── .github/
    └── workflows/
        └── ci.yml
```

---

## CI/CD

GitHub Actions runs on every push to `main` and every pull request:
- TypeScript typecheck across all services
- Build verification for all services

---

## Roadmap

- [ ] React Flow visual zap builder
- [ ] Parallel action branches
- [ ] Zap enable/disable toggle
- [ ] More trigger types (cron schedule, email received)
- [ ] More action types (Google Sheets, Notion, Discord)
- [ ] Usage dashboard with run counts and success rates

---

## License

MIT
