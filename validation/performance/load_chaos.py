import json
from pathlib import Path
from ..schemas.models import PerformanceBaseline, ChaosReport
from ..config import settings

class LoadChaosSimulator:
    """
    Simulates high-user concurrency benchmarks and mocks broker/database partition crashes.
    """

    def simulate_concurrency_load(
        self,
        concurrency: int
    ) -> PerformanceBaseline:
        """
        Runs API request benchmarks simulating concurrent client queries.
        """
        if not settings.LOAD_TEST_RESULTS_PATH:
            return PerformanceBaseline(
                avg_api_latency_ms=0.0,
                avg_job_creation_ms=0.0,
                max_concurrency_users=concurrency,
                load_failure_rate=1.0,
                measured=False,
                warnings=["LOAD_TEST_RESULTS_PATH is not configured; load performance is unverified."]
            )

        results_path = Path(settings.LOAD_TEST_RESULTS_PATH)
        if not results_path.exists():
            return PerformanceBaseline(
                avg_api_latency_ms=0.0,
                avg_job_creation_ms=0.0,
                max_concurrency_users=concurrency,
                load_failure_rate=1.0,
                measured=False,
                evidence_source=str(results_path),
                warnings=["Configured load test result file does not exist."]
            )

        with results_path.open("r", encoding="utf-8") as fh:
            data = json.load(fh)

        return PerformanceBaseline(
            avg_api_latency_ms=float(data.get("avg_api_latency_ms", 0.0)),
            avg_job_creation_ms=float(data.get("avg_job_creation_ms", 0.0)),
            max_concurrency_users=int(data.get("max_concurrency_users", concurrency)),
            load_failure_rate=float(data.get("load_failure_rate", 1.0)),
            measured=True,
            evidence_source=str(results_path)
        )

    def run_chaos_drills(self) -> ChaosReport:
        """
        Triggers simulation of connection pool dropouts and Redis partition recovery checks.
        """
        if not settings.CHAOS_DRILL_RESULTS_PATH:
            return ChaosReport(
                redis_recovery_status="UNVERIFIED",
                db_pool_health="UNVERIFIED",
                pinecone_fallback_ok=False,
                measured=False,
                warnings=["CHAOS_DRILL_RESULTS_PATH is not configured; resilience is unverified."]
            )

        results_path = Path(settings.CHAOS_DRILL_RESULTS_PATH)
        if not results_path.exists():
            return ChaosReport(
                redis_recovery_status="UNVERIFIED",
                db_pool_health="UNVERIFIED",
                pinecone_fallback_ok=False,
                measured=False,
                evidence_source=str(results_path),
                warnings=["Configured chaos drill result file does not exist."]
            )

        with results_path.open("r", encoding="utf-8") as fh:
            data = json.load(fh)

        return ChaosReport(
            redis_recovery_status=str(data.get("redis_recovery_status", "UNVERIFIED")),
            db_pool_health=str(data.get("db_pool_health", "UNVERIFIED")),
            pinecone_fallback_ok=bool(data.get("pinecone_fallback_ok", False)),
            measured=True,
            evidence_source=str(results_path)
        )
