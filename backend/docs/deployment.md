# NYC Compliance Engine — Deployment Guide

## Prerequisites

- Node.js 20+
- MySQL 8.0+
- Gemini API key (paid tier)
- Pinecone API key and index

## Environment Variables

### Required

| Variable | Description |
|----------|-------------|
| `GOOGLE_AI_STUDIO_KEY` | Gemini API key (supports comma-separated rotation) |
| `PINECONE_API_KEY` | Pinecone vector database API key |
| `PINECONE_ENVIRONMENT` | Pinecone region (default: `us-east-1`) |
| `PINECONE_INDEX` | Pinecone index name (default: `codealgo`) |
| `DB_HOST` | MySQL host |
| `DB_USER` | MySQL username |
| `DB_PASS` | MySQL password |
| `DB_NAME` | MySQL database name |
| `JWT_SECRET` | JWT signing secret (must be unique in production) |

### Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `5000` | Server port |
| `NODE_ENV` | `development` | Environment (`production` enables strict checks) |
| `GEMINI_CONCURRENCY` | `5` | Max concurrent Gemini API calls |
| `WORKER_CONCURRENCY` | `8` | Max concurrent pipeline workers |
| `GEMINI_MAX_RETRIES` | `5` | Max retry attempts for Gemini calls |
| `GEMINI_TIMEOUT_MS` | `120000` | Gemini request timeout in ms |
| `CACHE_TTL_MINUTES` | `30` | Gemini content cache TTL |
| `LOG_LEVEL` | `INFO` | Minimum log level: DEBUG, INFO, WARN, ERROR |
| `QUEUE_MAX_RETRIES` | `3` | Max retries per job before DLQ |
| `QUEUE_POLL_INTERVAL_MS` | `3000` | Queue polling interval |
| `QUEUE_MAX_DEPTH` | `100` | Max queue depth (backpressure) |
| `CB_GEMINI_FAILURE_THRESHOLD` | `5` | Circuit breaker failure threshold |
| `CB_GEMINI_RECOVERY_MS` | `30000` | Circuit breaker recovery timeout |
| `MAX_UPLOAD_SIZE_MB` | `10` | Maximum PDF upload size |
| `ABUSE_WINDOW_MS` | `600000` | Abuse detection window (10 min) |
| `MAX_FAILED_AUDITS` | `5` | Max failed audits before flagging abuse |

## Database Migration

Before first deployment, run the migration:

```bash
npx tsx migrations/add_production_tables.ts
```

This creates:
- `retryCount` column on the `plan` table
- `dead_letter_queue` table

## Local Development

```bash
cd backend
npm install
npm run build
npm start
```

## Docker Deployment

```bash
cd backend
docker build -t nyc-compliance-engine .
docker run -p 5000:5000 --env-file .env nyc-compliance-engine
```

## Health Checks

| Endpoint | Purpose |
|----------|---------|
| `GET /health` | Liveness probe — returns 200 if process is running |
| `GET /ready` | Readiness probe — checks DB and circuit breaker states |
| `GET /metrics` | Prometheus-compatible metrics scrape endpoint |

## Graceful Shutdown

The server handles `SIGTERM` and `SIGINT`:
1. Stops accepting new HTTP connections
2. Waits for current audit job to complete (max 5 minutes)
3. Closes database connections
4. Exits cleanly

## Disaster Recovery

### Queue Recovery
On startup, any jobs stuck in `processing` state are automatically reset to `queued`.

### Dead Letter Queue
Failed jobs (after max retries) are captured in `dead_letter_queue` table with full error context. Admin can inspect and retry via the admin API.

### Partial Reports
If some discipline steps fail but others succeed, the system generates a partial/degraded report instead of failing completely.

## Monitoring

See `docs/operations.md` for monitoring setup and alert configuration.
