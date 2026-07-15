from validation.release.checklist import ReleaseChecklistAuditor
from validation.config import settings
import json

def test_release_certification_fails_closed_without_evidence(mock_good_headers):
    auditor = ReleaseChecklistAuditor()
    report = auditor.generate_certification_report(
        simulated_concurrency=100,
        custom_headers=mock_good_headers
    )
    
    assert report.verdict == "NOT READY"
    assert report.checklist_passed is False
    assert report.scores.ai_quality_score == 0.0
    assert report.scores.performance_score == 0.0
    assert report.scores.reliability_score == 0.0
    assert len(report.blocking_issues) == 3

def test_release_certification_verdict_fail(mock_insecure_headers):
    auditor = ReleaseChecklistAuditor()
    report = auditor.generate_certification_report(
        simulated_concurrency=5000, # Large load drops performance score
        custom_headers=mock_insecure_headers
    )
    
    assert report.verdict == "NOT READY"
    assert report.scores.security_score == 0.0

def test_release_certification_passes_with_measured_evidence(mock_good_headers, tmp_path):
    golden_path = tmp_path / "golden_dataset.json"
    load_path = tmp_path / "load_results.json"
    chaos_path = tmp_path / "chaos_results.json"

    golden_path.write_text(json.dumps([
        {
            "precision": 1.0,
            "recall": 1.0,
            "iou": 1.0,
            "ndcg": 1.0,
            "citation_accuracy": 1.0
        }
    ]), encoding="utf-8")
    load_path.write_text(json.dumps({
        "avg_api_latency_ms": 250.0,
        "avg_job_creation_ms": 40.0,
        "max_concurrency_users": 100,
        "load_failure_rate": 0.0
    }), encoding="utf-8")
    chaos_path.write_text(json.dumps({
        "redis_recovery_status": "SUCCESS",
        "db_pool_health": "HEALTHY",
        "pinecone_fallback_ok": True
    }), encoding="utf-8")

    previous_golden = settings.GOLDEN_DATASET_PATH
    previous_load = settings.LOAD_TEST_RESULTS_PATH
    previous_chaos = settings.CHAOS_DRILL_RESULTS_PATH

    try:
        settings.GOLDEN_DATASET_PATH = str(golden_path)
        settings.LOAD_TEST_RESULTS_PATH = str(load_path)
        settings.CHAOS_DRILL_RESULTS_PATH = str(chaos_path)

        auditor = ReleaseChecklistAuditor()
        report = auditor.generate_certification_report(
            simulated_concurrency=100,
            custom_headers=mock_good_headers
        )

        assert report.verdict == "ENTERPRISE READY"
        assert report.checklist_passed is True
        assert report.scores.overall_score == 100.0
        assert report.blocking_issues == []
    finally:
        settings.GOLDEN_DATASET_PATH = previous_golden
        settings.LOAD_TEST_RESULTS_PATH = previous_load
        settings.CHAOS_DRILL_RESULTS_PATH = previous_chaos
