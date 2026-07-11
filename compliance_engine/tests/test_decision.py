import pytest
from compliance_engine.decision.engine import ComplianceDecisionEngine

def test_decision_engine_pipeline(mock_building_model_pc, mock_context_package_toilet):
    engine = ComplianceDecisionEngine()
    
    report = engine.generate_compliance_report(
        mock_building_model_pc,
        mock_context_package_toilet
    )
    
    # Verdict should be PASS because all measurements satisfy limits and citations exist
    assert report.verdict == "PASS"
    assert len(report.findings) == 2
    assert report.overall_confidence == 1.0

def test_decision_engine_pipeline_fail(mock_building_model_fail, mock_context_package_toilet):
    engine = ComplianceDecisionEngine()
    
    report = engine.generate_compliance_report(
        mock_building_model_fail,
        mock_context_package_toilet
    )
    
    # Verdict should be FAIL because of failing door and turning clearance dimensions
    assert report.verdict == "FAIL"
    assert report.findings[0].decision == "FAIL"

def test_decision_engine_pipeline_conflict(mock_building_model_pc, mock_context_package_conflict):
    engine = ComplianceDecisionEngine()
    
    report = engine.generate_compliance_report(
        mock_building_model_pc,
        mock_context_package_conflict
    )
    
    # Verdict should be REQUIRES_HUMAN_REVIEW because of version conflicts
    assert report.verdict == "REQUIRES_HUMAN_REVIEW"
    assert report.conflict_report["has_conflicts"] is True
