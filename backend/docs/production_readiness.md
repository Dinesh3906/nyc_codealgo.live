# Production Readiness Runbook

This runbook defines the minimum evidence required before PermitIQ can be
marked production ready. The release checklist must fail closed when any item is
missing.

## Required Runtime Configuration

### OCR

- `OCR_ENGINE=azure` or `OCR_ENGINE=google`
- Azure: `AZURE_OCR_ENDPOINT`, `AZURE_OCR_KEY`
- Google: `GOOGLE_API_KEY` or `GOOGLE_APPLICATION_CREDENTIALS`
- Mock OCR engines are not available in runtime code. Tests must patch OCR
  client boundaries explicitly.

### Retrieval

- `PINECONE_API_KEY`
- `PINECONE_INDEX_HOST`
- `PINECONE_INDEX_NAME`
- `EMBEDDING_ENDPOINT`
- `CODE_CORPUS_PATH` for BM25 lexical retrieval
- Semantic retrieval must use the configured embedding endpoint and Pinecone
  data-plane host. Local semantic fixtures are not available in runtime code.

### Node RAG Service

- `PINECONE_API_KEY`
- `PINECONE_INDEX`
- `EMBEDDING_API_URL` for production embedding generation
- `ALLOW_LOCAL_EMBEDDINGS=true` only after capacity testing approves in-process
  embeddings

### Database

- `DB_SSL_CA_PATH=../certs/ca-bundle.pem`
- `DB_CONNECTION_LIMIT=50` or higher
- `DB_QUERY_TIMEOUT_MS=5000`
- `DB_CONNECT_TIMEOUT_MS=5000`
- Mount the CA bundle as `/app/certs/ca-bundle.pem` in production containers

## Release Evidence Files

Set these variables for `validation.release.checklist.ReleaseChecklistAuditor`:

- `GOLDEN_DATASET_PATH`: JSON list of SME-reviewed evaluation rows with
  `precision`, `recall`, `iou`, `ndcg`, and `citation_accuracy`.
- `LOAD_TEST_RESULTS_PATH`: JSON object with `avg_api_latency_ms`,
  `avg_job_creation_ms`, `max_concurrency_users`, and `load_failure_rate`.
- `CHAOS_DRILL_RESULTS_PATH`: JSON object with `redis_recovery_status`,
  `db_pool_health`, and `pinecone_fallback_ok`.

Required gates:

- Precision >= `TARGET_PRECISION`
- Recall >= `TARGET_RECALL`
- Spatial IoU >= `TARGET_IOU`
- Average API latency <= `MAX_LATENCY_MS`
- Load failure rate <= 1%
- Redis recovery status is `SUCCESS`
- Database pool health is `HEALTHY`
- Security headers are captured from a real deployment response

## Enterprise Benchmark Evidence

Run the TypeScript evidence report with:

```bash
cd backend
npx tsx src/tests/enterprise.benchmark.ts path/to/benchmark-evidence.json
```

The evidence JSON must contain measured scenario rows. Randomly generated or
simulated rows are not acceptable for release approval.

## Incident Response

1. Declare severity and freeze new deployments.
2. Check `/health`, `/ready`, `/health/ai`, `/health/kb`, and `/metrics`.
3. Inspect circuit breaker state and provider cooldowns.
4. Drain queued jobs if database, OCR, Pinecone, or embedding services are
   degraded.
5. Retry dead-letter jobs only after the dependency is healthy and root cause is
   recorded.
6. File a post-incident report with timeline, blast radius, root cause,
   corrective action, and owner.

## Disaster Recovery

- Database backups must be restorable into a clean environment before release.
- Pinecone indexes must have reproducible ingestion manifests and source checksums.
- Regulatory corpus artifacts referenced by `CODE_CORPUS_PATH` must be versioned
  alongside Pinecone ingestion metadata.
- Recovery drills must prove Redis recovery, DB connection pool recovery, and
  retrieval degradation behavior.

## Kubernetes

- `backend/k8s/deployment.yaml` defines the rootless API coordinator with a
  `1000m` CPU limit and `1536Mi` memory limit.
- `backend/k8s/analysis-worker-deployment.yaml` defines the rootless Python
  analysis worker with a `4000m` CPU limit and `4Gi` memory limit.
- Replace image placeholders with immutable digests before deploy.
- Provide `permit-iq-db-ca-bundle`, `permit-iq-secrets`, and the referenced
  config maps through the environment's secret manager.
