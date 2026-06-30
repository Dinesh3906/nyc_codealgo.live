# NYC Compliance Engine — API Reference

## Base URL

```
Production: https://nyccodes.permitiq.live/api
Local:      http://localhost:5000/api
```

## Authentication

All protected endpoints require a Bearer token:
```
Authorization: Bearer <jwt_token>
```

## Infrastructure Endpoints

### Health Check
```
GET /health
```
Returns 200 if the process is running.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-06-28T12:00:00.000Z",
  "uptime": 3600,
  "version": "1.0.0"
}
```

### Readiness Check
```
GET /ready
```
Returns 200 if all dependencies are reachable.

**Response:**
```json
{
  "status": "ready",
  "checks": {
    "database": "ok",
    "gemini_circuit": "CLOSED",
    "pinecone_circuit": "CLOSED"
  }
}
```

### Metrics
```
GET /metrics
```
Returns Prometheus text exposition format. See `docs/operations.md` for metric details.

---

## Auth Endpoints

### Register
```
POST /api/auth/register
Content-Type: application/json

{
  "name": "string",
  "email": "string",
  "password": "string"
}
```

### Login
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "token": "jwt_token",
  "user": {
    "id": "uuid",
    "name": "string",
    "email": "string"
  }
}
```

---

## Plan Endpoints

### Upload Plan
```
POST /api/plans/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <pdf_file>
selectedSteps: ["step_building_code", "step_fire_code"]  (optional)
```

**Response:**
```json
{
  "id": "plan_uuid",
  "status": "queued",
  "message": "Plan uploaded and queued for analysis"
}
```

### Get Plan Result
```
GET /api/plans/:id
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "plan_uuid",
  "status": "analyzed | partial | failed | queued | processing",
  "analysisResult": {
    "compliant": true,
    "score": 85,
    "status": "complete | partial",
    "issues": [...],
    "steps": [...],
    "versions": {
      "PROMPT_VERSION": "2.1.0",
      "RULE_ENGINE_VERSION": "2.0.0",
      "NYC_CODE_EDITION": "2022",
      "GEMINI_MODEL_VERSION": "gemini-2.5-pro"
    },
    "auditMetadata": {
      "completedSteps": 8,
      "totalSteps": 8,
      "degraded": false,
      "failedSteps": []
    }
  }
}
```

### List Plans
```
GET /api/plans
Authorization: Bearer <token>
```

---

## WebSocket Events

### Connection
```javascript
const socket = io('wss://nyccodes.permitiq.live');
```

### Events

| Event | Direction | Payload |
|-------|-----------|---------|
| `analysis-status` | Server → Client | `{ planId, status, progress, message }` |

**Status values:** `INITIALIZING`, `GENERATING_REPORT`, `COMPLETE`, `FAILED`, `RETRYING`

---

## Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| General API | 1000 requests | 15 minutes |
| Auth endpoints | 10 requests | 15 minutes |
| Plan uploads | 25 requests | 1 hour |

## Error Responses

All errors follow this format:
```json
{
  "message": "Human-readable error description",
  "error": "ERROR_CODE"
}
```

| Status | Error Code | Description |
|--------|------------|-------------|
| 400 | `INVALID_FILE` | Invalid PDF file |
| 401 | `JWT_ERROR` | Invalid or expired token |
| 413 | `FILE_TOO_LARGE` | Upload exceeds 10MB limit |
| 429 | `RATE_LIMIT` | Too many requests |
| 500 | `INTERNAL_ERROR` | Server error |
| 503 | `SERVICE_UNAVAILABLE` | Dependencies unavailable |
