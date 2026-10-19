# Production Readiness Runbook

This runbook defines the runtime configuration and release evidence required
before PermitIQ can be marked production ready. The worker startup gate and the
release checklist both fail closed when required inputs are missing.

## Worker Startup Readiness Gate

The production analysis worker runs this command before starting Celery:

```bash
python -m backend.workers.readiness
```

`backend/Dockerfile.worker` and
`backend/k8s/analysis-worker-deployment.yaml` chain the command with `&&`, so
Celery accepts no jobs unless the check exits successfully. The production
checks are enabled only when `APP_ENV=production`.

The gate verifies:

- `DATABASE_URL` and `REDIS_URL` are configured, do not use SQLite, and do not
  point to `localhost`, `127.0.0.1`, or `::1`.
- `STORAGE_PROVIDER=s3` and `S3_BUCKET_NAME` is set so API and worker pods use
  shared document storage.
- `OCR_ENGINE` is `azure` or `google` and the selected provider credentials are
  present. A configured `GOOGLE_APPLICATION_CREDENTIALS` path must be a
  non-empty file.
- `PINECONE_API_KEY`, `PINECONE_INDEX_HOST`, and `EMBEDDING_ENDPOINT` are set.
- `CODE_CORPUS_PATH` and every evidence path listed below point to regular,
  non-empty files.

Run the command in the same image, environment, and mount context that the
worker will use. A successful preflight prints:

```text
PermitIQ production readiness check passed.
```

On failure, the command exits with status `1` and prints every blocking item to
stderr. Do not bypass the check or change `APP_ENV` to start a production
worker.

This is a deterministic startup check. It does not make network calls or
validate JSON schemas and release thresholds. Dependency reachability and
evidence contents must still be verified by the deployment probes and release
certification process.

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

- `DATABASE_URL` for the Python API and analysis workers
- `REDIS_URL` for the Celery broker and result backend
- `DB_SSL_CA_PATH=../certs/ca-bundle.pem`
- `DB_CONNECTION_LIMIT=50` or higher
- `DB_QUERY_TIMEOUT_MS=5000`
- `DB_CONNECT_TIMEOUT_MS=5000`
- Mount the CA bundle as `/app/certs/ca-bundle.pem` in production containers

## Release Evidence Files

All six files below are mandatory for production worker startup. The Kubernetes
worker manifest mounts them read-only from `permit-iq-release-evidence`.

| Environment variable | Kubernetes path | Required JSON payload |
|----------------------|-----------------|-----------------------|
| `GOLDEN_DATASET_PATH` | `/app/evidence/golden_dataset.json` | Non-empty list of SME-reviewed rows containing numeric `precision`, `recall`, `iou`, `ndcg`, and `citation_accuracy` values. |
| `LOAD_TEST_RESULTS_PATH` | `/app/evidence/load_test_results.json` | Object containing `avg_api_latency_ms`, `avg_job_creation_ms`, `max_concurrency_users`, and `load_failure_rate`. |
| `CHAOS_DRILL_RESULTS_PATH` | `/app/evidence/chaos_drill_results.json` | Object containing `redis_recovery_status`, `db_pool_health`, and `pinecone_fallback_ok`. |
| `DRIFT_BASELINE_EMBEDDINGS_PATH` | `/app/evidence/drift_baseline_embeddings.json` | Non-empty embedding-vector list, or an object with a non-empty `embeddings` list, generated with the active embedding model. |
| `DRIFT_CURRENT_EMBEDDINGS_PATH` | `/app/evidence/drift_current_embeddings.json` | Non-empty embedding-vector list, or an object with a non-empty `embeddings` list, using the same model and dimensions as the baseline. |
| `REGULATION_UPDATES_PATH` | `/app/evidence/regulation_updates.json` | A list of discovered regulatory updates, or an object with an `updates` list. Use `{"updates":[]}` for a measured no-change result. |

`CODE_CORPUS_PATH=/app/corpus/code-corpus.jsonl` is also required by the
startup gate, but it is a runtime retrieval corpus rather than a release
evidence file.

Evidence files must be measured, reviewable artifacts from the candidate
release. Do not use empty files, generated placeholders, or test fixtures for a
production rollout. Validate each file as JSON before packaging it, retain its
checksum with the release record, and keep the baseline/current drift artifacts
on the same embedding model and vector dimensions.

The first three files are consumed by
`validation.release.checklist.ReleaseChecklistAuditor`. Required certification
gates are:

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

## Kubernetes Rollout Procedure

Create or update the corpus and evidence ConfigMaps with keys that match the
filenames referenced by the worker deployment:

```bash
kubectl create configmap permit-iq-code-corpus \
  --from-file=code-corpus.jsonl=release/code-corpus.jsonl \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl create configmap permit-iq-release-evidence \
  --from-file=golden_dataset.json=release/evidence/golden_dataset.json \
  --from-file=load_test_results.json=release/evidence/load_test_results.json \
  --from-file=chaos_drill_results.json=release/evidence/chaos_drill_results.json \
  --from-file=drift_baseline_embeddings.json=release/evidence/drift_baseline_embeddings.json \
  --from-file=drift_current_embeddings.json=release/evidence/drift_current_embeddings.json \
  --from-file=regulation_updates.json=release/evidence/regulation_updates.json \
  --dry-run=client -o yaml | kubectl apply -f -
```

The current manifest uses ConfigMaps, so the corpus and evidence bundles must
fit within the cluster's ConfigMap size limit. Use a read-only persistent or
object-storage-backed mount and preserve the configured paths if the measured
artifacts are larger.

Deploy the immutable worker image, restart workers after ConfigMap changes, and
wait for the rollout:

```bash
kubectl apply -f backend/k8s/analysis-worker-deployment.yaml
kubectl rollout restart deployment/permit-iq-analysis-worker
kubectl rollout status deployment/permit-iq-analysis-worker
kubectl logs deployment/permit-iq-analysis-worker \
  -c analysis-worker --tail=100
```

Confirm the logs contain `PermitIQ production readiness check passed.` before
allowing producers to enqueue work. A missing setting or artifact causes the
container to exit before Celery starts and normally appears as a restarting or
`CrashLoopBackOff` pod. Correct the Secret, ConfigMap, or volume mount and
restart the deployment; do not remove the gate from the container command.

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
  analysis worker with a `4000m` CPU limit, `4Gi` memory limit, and the
  fail-closed startup readiness gate.
- Replace image placeholders with immutable digests before deploy.
- Provide `permit-iq-db-ca-bundle`, `permit-iq-secrets`, and the referenced
  ConfigMaps through the environment's configuration and secret management
  process.
