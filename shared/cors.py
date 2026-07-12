import os
import json
import logging
import time
import uuid
from collections import defaultdict, deque
from threading import Lock
from typing import Iterable, List

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware


DEFAULT_DEV_ORIGINS = (
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
)

SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
}

_rate_limit_lock = Lock()
_rate_limit_buckets = defaultdict(deque)
_logger = logging.getLogger("permitiq.python_api")


def _configure_logging() -> None:
    if _logger.handlers:
        return
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(message)s"))
    _logger.addHandler(handler)
    _logger.setLevel(os.getenv("LOG_LEVEL", "INFO").upper())
    _logger.propagate = False


def _split_origins(raw_value: str) -> List[str]:
    return [origin.strip() for origin in raw_value.split(",") if origin.strip()]


def get_allowed_origins() -> List[str]:
    raw_origins = os.getenv("CORS_ALLOWED_ORIGINS") or os.getenv("CORS_ORIGIN") or ""
    origins = _split_origins(raw_origins) if raw_origins else list(DEFAULT_DEV_ORIGINS)

    if "*" in origins:
        environment = os.getenv("ENVIRONMENT", "development").lower()
        if environment in {"production", "prod", "staging"}:
            raise RuntimeError("Wildcard CORS origins are not allowed outside local development.")

    return origins


def configure_cors(app: FastAPI, allow_methods: Iterable[str] = ("*",)) -> None:
    _configure_logging()
    _configure_request_hardening(app)

    origins = get_allowed_origins()
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials="*" not in origins,
        allow_methods=list(allow_methods),
        allow_headers=["*"],
    )


def _client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _is_rate_limited(request: Request) -> bool:
    if request.url.path in {"/health", "/ready", "/metrics"}:
        return False

    limit = int(os.getenv("PY_API_RATE_LIMIT_PER_MINUTE", "300"))
    if limit <= 0:
        return False

    now = time.monotonic()
    window_start = now - 60.0
    bucket_key = f"{_client_ip(request)}:{request.url.path}"

    with _rate_limit_lock:
        bucket = _rate_limit_buckets[bucket_key]
        while bucket and bucket[0] < window_start:
            bucket.popleft()
        if len(bucket) >= limit:
            return True
        bucket.append(now)

    return False


def _configure_request_hardening(app: FastAPI) -> None:
    if getattr(app.state, "permitiq_request_hardening_configured", False):
        return

    @app.middleware("http")
    async def request_hardening_middleware(request: Request, call_next):
        request_id = request.headers.get("x-request-id")
        if not request_id or len(request_id) > 128:
            request_id = str(uuid.uuid4())

        start = time.perf_counter()

        if _is_rate_limited(request):
            response = JSONResponse(
                status_code=429,
                content={"detail": "Rate limit exceeded.", "request_id": request_id},
            )
        else:
            try:
                response = await call_next(request)
            except Exception:
                latency_ms = round((time.perf_counter() - start) * 1000, 2)
                _logger.exception(json.dumps({
                    "event": "unhandled_exception",
                    "request_id": request_id,
                    "method": request.method,
                    "path": request.url.path,
                    "latency_ms": latency_ms,
                }))
                response = JSONResponse(
                    status_code=500,
                    content={"detail": "Internal server error.", "request_id": request_id},
                )

        latency_ms = round((time.perf_counter() - start) * 1000, 2)
        for key, value in SECURITY_HEADERS.items():
            response.headers.setdefault(key, value)

        if os.getenv("ENVIRONMENT", "development").lower() in {"production", "prod", "staging"}:
            response.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")

        response.headers["X-Request-ID"] = request_id

        _logger.info(json.dumps({
            "event": "http_request",
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "latency_ms": latency_ms,
        }))

        return response

    app.state.permitiq_request_hardening_configured = True
