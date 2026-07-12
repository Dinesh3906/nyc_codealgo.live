from validation.release.checklist import ReleaseChecklistAuditor

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
