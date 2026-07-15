import os
import sys
from pathlib import Path
from typing import Mapping, Optional
from urllib.parse import urlparse

from backend.config import settings as backend_settings


LOCAL_HOSTNAMES = {"localhost", "127.0.0.1", "::1"}


def _env(env: Mapping[str, str], name: str, default: str = "") -> str:
    value = env.get(name)
    return value if value is not None else default


def _require_value(errors: list[str], env: Mapping[str, str], name: str, description: Optional[str] = None) -> str:
    value = _env(env, name).strip()
    if not value:
        errors.append(f"{name} is required" + (f" for {description}" if description else "") + ".")
    return value


def _require_file(errors: list[str], name: str, value: str) -> None:
    if not value:
        errors.append(f"{name} is required and must point to a real file.")
        return

    path = Path(value).expanduser()
    if not path.exists():
        errors.append(f"{name} does not exist: {path}")
    elif not path.is_file():
        errors.append(f"{name} must point to a file, got: {path}")
    elif path.stat().st_size == 0:
        errors.append(f"{name} points to an empty file: {path}")


def _require_not_local_url(errors: list[str], name: str, value: str) -> None:
    if not value:
        errors.append(f"{name} is required.")
        return

    parsed = urlparse(value)
    if parsed.scheme == "sqlite" or value.startswith("sqlite"):
        errors.append(f"{name} must not use SQLite in production.")
    if parsed.hostname in LOCAL_HOSTNAMES:
        errors.append(f"{name} must not point at localhost in production.")


def collect_readiness_errors(env: Optional[Mapping[str, str]] = None) -> list[str]:
    """
    Validate production worker dependencies before Celery accepts jobs.

    The check is intentionally local and deterministic: it verifies required
    credentials, service endpoints, and evidence artifact paths. It does not
    make network calls because Kubernetes startup should fail quickly and
    predictably when configuration is incomplete.
    """
    active_env = env or os.environ
    app_env = _env(active_env, "APP_ENV", backend_settings.APP_ENV).lower()
    if app_env != "production":
        return []

    errors: list[str] = []

    database_url = _env(active_env, "DATABASE_URL", backend_settings.DATABASE_URL)
    redis_url = _env(active_env, "REDIS_URL", backend_settings.REDIS_URL)
    _require_not_local_url(errors, "DATABASE_URL", database_url)
    _require_not_local_url(errors, "REDIS_URL", redis_url)

    storage_provider = _env(active_env, "STORAGE_PROVIDER", backend_settings.STORAGE_PROVIDER).lower()
    if storage_provider != "s3":
        errors.append("STORAGE_PROVIDER must be s3 in production so API and worker pods share uploaded documents.")
    if storage_provider == "s3":
        _require_value(errors, active_env, "S3_BUCKET_NAME", "shared document storage")

    ocr_engine = _env(active_env, "OCR_ENGINE", "azure").lower()
    if ocr_engine == "azure":
        _require_value(errors, active_env, "AZURE_OCR_ENDPOINT", "Azure OCR")
        _require_value(errors, active_env, "AZURE_OCR_KEY", "Azure OCR")
    elif ocr_engine == "google":
        google_api_key = _env(active_env, "GOOGLE_API_KEY")
        google_credentials = _env(active_env, "GOOGLE_APPLICATION_CREDENTIALS")
        if not google_api_key and not google_credentials:
            errors.append("GOOGLE_API_KEY or GOOGLE_APPLICATION_CREDENTIALS is required when OCR_ENGINE=google.")
        if google_credentials:
            _require_file(errors, "GOOGLE_APPLICATION_CREDENTIALS", google_credentials)
    else:
        errors.append("OCR_ENGINE must be azure or google in production.")

    _require_value(errors, active_env, "PINECONE_API_KEY", "semantic retrieval")
    _require_value(errors, active_env, "PINECONE_INDEX_HOST", "semantic retrieval")
    _require_value(errors, active_env, "EMBEDDING_ENDPOINT", "query embedding generation")
    _require_file(errors, "CODE_CORPUS_PATH", _env(active_env, "CODE_CORPUS_PATH"))

    _require_file(errors, "GOLDEN_DATASET_PATH", _env(active_env, "GOLDEN_DATASET_PATH"))
    _require_file(errors, "LOAD_TEST_RESULTS_PATH", _env(active_env, "LOAD_TEST_RESULTS_PATH"))
    _require_file(errors, "CHAOS_DRILL_RESULTS_PATH", _env(active_env, "CHAOS_DRILL_RESULTS_PATH"))

    _require_file(errors, "DRIFT_BASELINE_EMBEDDINGS_PATH", _env(active_env, "DRIFT_BASELINE_EMBEDDINGS_PATH"))
    _require_file(errors, "DRIFT_CURRENT_EMBEDDINGS_PATH", _env(active_env, "DRIFT_CURRENT_EMBEDDINGS_PATH"))
    _require_file(errors, "REGULATION_UPDATES_PATH", _env(active_env, "REGULATION_UPDATES_PATH"))

    return errors


def main() -> int:
    errors = collect_readiness_errors()
    if errors:
        print("PermitIQ production readiness check failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1

    print("PermitIQ production readiness check passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
