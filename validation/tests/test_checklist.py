import pytest
from validation.release.checklist import ReleaseChecklistAuditor

def test_release_certification_verdict_pass(mock_good_headers):
    auditor = ReleaseChecklistAuditor()
    report = auditor.generate_certification_report(
        simulated_concurrency=100,
        custom_headers=mock_good_headers
    )
    
    assert report.verdict == "ENTERPRISE READY"
    assert report.checklist_passed is True
    assert report.scores.overall_score >= 95.0

def test_release_certification_verdict_fail(mock_insecure_headers):
    auditor = ReleaseChecklistAuditor()
    report = auditor.generate_certification_report(
        simulated_concurrency=5000, # Large load drops performance score
        custom_headers=mock_insecure_headers
    )
    
    # Verdict should drop because of missing HTTP headers and increased latency
    assert report.verdict in ["PRODUCTION READY", "LIMITED PRODUCTION", "NOT READY"]
    assert report.scores.security_score == 70.0
