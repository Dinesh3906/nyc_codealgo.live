# NYC Compliance Engine — Architecture

## Overview

The NYC Compliance Engine is a hybrid deterministic + AI verification system that analyzes architectural plan drawings against NYC Building Code, Fire Code, Plumbing Code, Mechanical Code, Electrical Code, Energy Code, Accessibility standards, and Zoning Resolution.

## System Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                        API Gateway (Express.js)                       │
│  ┌─────────┐  ┌──────────┐  ┌────────────┐  ┌──────────────────┐   │
│  │ Helmet   │  │ Rate     │  │ Auth       │  │ Input            │   │
│  │ (Headers)│  │ Limiter  │  │ (JWT/RBAC) │  │ Validation       │   │
│  └─────────┘  └──────────┘  └────────────┘  └──────────────────┘   │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────────┐   │
│  │ Request ID   │  │ Abuse        │  │ Structured Request       │   │
│  │ Generation   │  │ Detection    │  │ Logging                  │   │
│  └─────────────┘  └──────────────┘  └──────────────────────────┘   │
└────────────────────────────┬─────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     Queue Worker (Database-backed)                     │
│  ┌─────────────────┐  ┌──────────────────┐  ┌────────────────────┐ │
│  │ Idempotent       │  │ Retry Logic      │  │ Dead Letter Queue  │ │
│  │ Processing       │  │ (3 attempts)     │  │ (Failed Jobs)      │ │
│  └─────────────────┘  └──────────────────┘  └────────────────────┘ │
│  ┌─────────────────┐  ┌──────────────────┐  ┌────────────────────┐ │
│  │ Graceful         │  │ Backpressure     │  │ Job Recovery       │ │
│  │ Shutdown         │  │ Control          │  │ on Startup         │ │
│  └─────────────────┘  └──────────────────┘  └────────────────────┘ │
└────────────────────────────┬─────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│                   Compliance Pipeline Orchestrator                    │
│                                                                      │
│  ┌────────────────┐    ┌────────────────────────────────────┐       │
│  │ PDF Upload &    │    │ Gemini Vision Extraction            │       │
│  │ Parse           │───▶│ (ExtractedFacts JSON)               │       │
│  └────────────────┘    └──────────┬─────────────────────────┘       │
│                                   │                                  │
│                    ┌──────────────┴──────────────┐                   │
│                    ▼                             ▼                    │
│  ┌──────────────────────┐      ┌──────────────────────────────┐     │
│  │ Deterministic Engine  │      │ Gemini Pro AI Reasoning       │     │
│  │ (50 rules, <1ms)     │      │ (Dual Analysis + Challenger   │     │
│  │                      │      │  + Judge + Verifier)           │     │
│  └──────────┬───────────┘      └──────────────┬───────────────┘     │
│             │                                  │                     │
│             └──────────────┬───────────────────┘                     │
│                            ▼                                         │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ Evidence Graph + Confidence Metrics + Citation Validation     │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                            │                                         │
│                            ▼                                         │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ Version Stamping → Final Report → DB Storage → WebSocket     │   │
│  └──────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘

External Services:
  ┌──────────┐  ┌──────────┐  ┌──────────┐
  │ Gemini   │  │ Pinecone │  │ MySQL    │
  │ 2.5 Pro  │  │ (RAG)    │  │ (AWS RDS)│
  └──────────┘  └──────────┘  └──────────┘
  Circuit       Circuit        Connection
  Breaker       Breaker        Pooling
```

## Key Components

### Deterministic Rule Engine (`deterministic.engine.ts`)
- 50 rules across 8 NYC code disciplines
- Sub-millisecond execution, zero API cost
- Each rule has: code, section, formula, inputs, deduction

### AI Reasoning Pipeline (`scheduler.service.ts`)
- Dual independent Gemini Pro analyses (Strategy A + B)
- Adversarial Challenger/Judge debate
- Automated Verifier for low-confidence findings

### Evidence Graph (`evidence.graph.ts`)
- Traces every finding from drawing → object → measurement → code → verdict
- Supports explainability requirements

### Reliability Stack
- **Circuit Breaker**: Prevents cascading failures from Gemini/Pinecone outages
- **Retry with Backoff**: Exponential backoff + jitter for transient errors
- **Dead Letter Queue**: Captures permanently failed jobs for admin review
- **Partial Recovery**: Returns degraded report if some steps fail

### Observability Stack
- **Structured JSON Logging**: Every log has trace ID, audit ID, stage, latency
- **Prometheus Metrics**: Counters, histograms, gauges at `/metrics`
- **Health/Readiness**: `/health` and `/ready` endpoints for load balancers
- **Profiler**: Stage-by-stage timing for every audit run

### Security Stack
- **JWT Authentication** with role-based access control
- **PDF Magic Byte Validation** to prevent malicious uploads
- **Input Sanitization** on all request bodies
- **Abuse Detection** with IP-based threshold blocking
- **Helmet** security headers
- **Rate Limiting** on all API endpoints

## Data Flow

1. User uploads PDF → multer validates file type and size
2. PDF magic bytes validated → job queued in MySQL
3. Queue worker claims job (atomic lock)
4. PDF uploaded to Gemini File API
5. Page classification routes pages to disciplines
6. For each discipline:
   a. Deterministic rules evaluated on extracted facts
   b. Non-deterministic codes sent to Gemini Pro
   c. Results merged with evidence graph and confidence metrics
7. Citation validation rejects hallucinated code references
8. Final report stored in DB with version stamps
9. WebSocket notifies frontend in real-time

## Environment Variables

See `docs/deployment.md` for the complete list.
