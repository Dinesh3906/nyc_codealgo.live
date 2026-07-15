from typing import Dict
import datetime
from ..schemas.models import (
    CertificationReport, ReadinessScores
)
from ..benchmark.suite import AIBenchmarkSuite
from ..security.audit import SecurityAuditScanner
from ..performance.load_chaos import LoadChaosEvidenceLoader
from ..mlops.manager import MLOpsVersionRegistry
from ..config import settings

class ReleaseChecklistAuditor:
    """
    Compiles final readiness scores, audits release checkpoints,
    and issues the enterprise certification.
    """

    def __init__(self):
        self.benchmark_suite = AIBenchmarkSuite()
        self.security_scanner = SecurityAuditScanner()
        self.performance_load = LoadChaosEvidenceLoader()
        self.mlops_registry = MLOpsVersionRegistry()

    def generate_certification_report(
        self,
        simulated_concurrency: int = 100,
        custom_headers: Dict[str, str] = None
    ) -> CertificationReport:
        """
        Executes complete verification pipeline.
        """
        timestamp = datetime.datetime.utcnow().isoformat() + "Z"
        
        # 1. Run benchmarks
        bench = self.benchmark_suite.run_benchmark_evaluations()

        # 2. Audit headers
        headers_provided = custom_headers is not None
        sec_summary = self.security_scanner.scan_headers(custom_headers or {})

        # 3. Benchmark load & run chaos drills
        perf = self.performance_load.read_concurrency_load_evidence(simulated_concurrency)
        chaos = self.performance_load.run_chaos_drills()

        # 4. Extract active registry version information
        versions = self.mlops_registry.get_active_registry()

        # 5. Compute scores and fail closed if any evidence is missing.
        blocking_issues = []
        if not bench.evaluated:
            blocking_issues.append("AI benchmark has not been run against a configured golden dataset.")
        if not perf.measured:
            blocking_issues.append("Load test evidence is not configured or has not been measured.")
        if not chaos.measured:
            blocking_issues.append("Chaos drill evidence is not configured or has not been measured.")
        if not headers_provided:
            blocking_issues.append("Security headers were not supplied from a real deployment response.")
        if bench.evaluated:
            if bench.precision < settings.TARGET_PRECISION:
                blocking_issues.append(f"AI benchmark precision {bench.precision:.3f} is below target {settings.TARGET_PRECISION:.3f}.")
            if bench.recall < settings.TARGET_RECALL:
                blocking_issues.append(f"AI benchmark recall {bench.recall:.3f} is below target {settings.TARGET_RECALL:.3f}.")
            if bench.iou < settings.TARGET_IOU:
                blocking_issues.append(f"Spatial IoU {bench.iou:.3f} is below target {settings.TARGET_IOU:.3f}.")
        if perf.measured:
            if perf.load_failure_rate > 0.01:
                blocking_issues.append(f"Load failure rate {perf.load_failure_rate:.3f} exceeds 0.010.")
            if perf.avg_api_latency_ms > settings.MAX_LATENCY_MS:
                blocking_issues.append(f"Average API latency {perf.avg_api_latency_ms:.1f}ms exceeds target {settings.MAX_LATENCY_MS:.1f}ms.")
        if chaos.measured:
            if chaos.redis_recovery_status != "SUCCESS":
                blocking_issues.append("Redis recovery drill did not report SUCCESS.")
            if chaos.db_pool_health != "HEALTHY":
                blocking_issues.append("Database pool health drill did not report HEALTHY.")

        sec_score = 100.0 if headers_provided and all([
            sec_summary.content_security_policy,
            sec_summary.strict_transport_security,
            sec_summary.x_content_type_options,
            sec_summary.x_frame_options
        ]) else 0.0

        rel_score = 100.0 if chaos.measured and chaos.redis_recovery_status == "SUCCESS" else 0.0
        
        # Latency performance score
        if perf.measured and perf.load_failure_rate <= 0.01:
            if perf.avg_api_latency_ms <= settings.MAX_LATENCY_MS:
                perf_score = 100.0
            else:
                overage_ratio = (perf.avg_api_latency_ms - settings.MAX_LATENCY_MS) / settings.MAX_LATENCY_MS
                perf_score = max(0.0, 100.0 - (overage_ratio * 100.0))
        else:
            perf_score = 0.0
        
        # Quality score
        quality_score = bench.f1 * 100.0 if bench.evaluated else 0.0

        overall = (sec_score + rel_score + perf_score + quality_score) / 4.0

        # Determine verdict
        if blocking_issues:
            verdict = "NOT READY"
        elif overall >= 95.0:
            verdict = "ENTERPRISE READY"
        elif overall >= 85.0:
            verdict = "PRODUCTION READY"
        elif overall >= 70.0:
            verdict = "LIMITED PRODUCTION"
        else:
            verdict = "NOT READY"

        checklist_passed = (not blocking_issues and overall >= 85.0)

        return CertificationReport(
            verdict=verdict,
            timestamp=timestamp,
            scores=ReadinessScores(
                security_score=round(sec_score, 2),
                reliability_score=round(rel_score, 2),
                performance_score=round(perf_score, 2),
                ai_quality_score=round(quality_score, 2),
                overall_score=round(overall, 2)
            ),
            benchmark=bench,
            security=sec_summary,
            performance=perf,
            chaos=chaos,
            active_versions=versions,
            checklist_passed=checklist_passed,
            blocking_issues=blocking_issues
        )
