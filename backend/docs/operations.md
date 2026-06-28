# NYC Compliance Engine — Operations Manual

## Monitoring

### Metrics Endpoint

Prometheus-compatible metrics are available at `GET /metrics`.

### Key Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `nyc_audits_total` | Counter | Total audit runs by status |
| `nyc_audits_failed_total` | Counter | Failed audits |
| `nyc_audits_partial_total` | Counter | Degraded/partial audits |
| `nyc_gemini_requests_total` | Counter | Gemini API calls by model |
| `nyc_pinecone_requests_total` | Counter | Pinecone API calls |
| `nyc_deterministic_checks_total` | Counter | Deterministic rule evaluations |
| `nyc_citation_rejections_total` | Counter | Rejected hallucinated citations |
| `nyc_circuit_breaker_trips_total` | Counter | Circuit breaker OPEN events |
| `nyc_retries_total` | Counter | Retry attempts by reason |
| `nyc_dlq_entries_total` | Counter | Dead letter queue entries |
| `nyc_audit_duration_seconds` | Histogram | End-to-end audit duration |
| `nyc_gemini_latency_seconds` | Histogram | Gemini API call latency |
| `nyc_pinecone_latency_seconds` | Histogram | Pinecone call latency |
| `nyc_queue_depth` | Gauge | Current queue depth |
| `nyc_active_audits` | Gauge | Currently running audits |
| `nyc_circuit_breaker_state` | Gauge | CB state (0=closed, 1=half-open, 2=open) |
| `nyc_memory_rss_bytes` | Gauge | Process RSS memory |
| `nyc_memory_heap_bytes` | Gauge | Process heap memory |

### Recommended Alerts

| Alert | Condition | Severity |
|-------|-----------|----------|
| High failure rate | `nyc_audits_failed_total` > 5 in 10 min | Critical |
| Circuit breaker open | `nyc_circuit_breaker_state` = 2 | Critical |
| Queue depth | `nyc_queue_depth` > 50 | Warning |
| High latency | `nyc_audit_duration_seconds` p99 > 300 | Warning |
| DLQ growing | `nyc_dlq_entries_total` > 10 in 1 hour | Warning |
| Memory pressure | `nyc_memory_rss_bytes` > 2GB | Warning |

## Troubleshooting

### Gemini API Errors

**429 Rate Limit**: The circuit breaker will automatically handle this. If persistent, check your spending cap at https://ai.studio/spend.

**Circuit Breaker OPEN**: The Gemini API is experiencing repeated failures. The circuit breaker will automatically recover after the timeout period (default 30 seconds). Check the Gemini API status page.

### Dead Letter Queue

List pending failed jobs:
```sql
SELECT * FROM dead_letter_queue WHERE status = 'pending' ORDER BY createdAt DESC;
```

Retry a failed job:
```sql
UPDATE dead_letter_queue SET status = 'retried' WHERE id = ?;
UPDATE plan SET status = 'queued', retryCount = 0 WHERE id = ?;
```

### Stuck Jobs

Jobs stuck in `processing` are automatically recovered on server restart. To manually reset:
```sql
UPDATE plan SET status = 'queued' WHERE status = 'processing';
```

### Structured Log Analysis

All logs are JSON. Use `jq` for filtering:
```bash
# Find all errors for a specific audit
cat logs.jsonl | jq 'select(.auditId == "abc123" and .severity == "ERROR")'

# Find slow stages
cat logs.jsonl | jq 'select(.latencyMs > 10000)'

# Find circuit breaker events
cat logs.jsonl | jq 'select(.stage == "circuit-breaker")'
```

## Backup & Recovery

### Database Backup
```bash
mysqldump -h $DB_HOST -u $DB_USER -p$DB_PASS $DB_NAME > backup_$(date +%Y%m%d).sql
```

### Restore
```bash
mysql -h $DB_HOST -u $DB_USER -p$DB_PASS $DB_NAME < backup_20260628.sql
```
