import pytest
from reporting.report_engine.engine import ReportEngine

def test_scorecard_calculation(mock_compliance_report):
    engine = ReportEngine()
    
    scorecard = engine.generate_findings_scorecard(mock_compliance_report["findings"])
    
    assert scorecard["PASS"] == 1
    assert scorecard["FAIL"] == 1
    assert scorecard["WARNING"] == 0

def test_executive_summary_generation(mock_project_metadata):
    engine = ReportEngine()
    
    scorecard = {"PASS": 1, "FAIL": 1, "WARNING": 0, "REQUIRES_HUMAN_REVIEW": 0}
    summary = engine.generate_executive_summary("FAIL", scorecard, mock_project_metadata)
    
    assert "Empire State Office Complex" in summary
    assert "overall compliance audit verdict is assessed as 'FAIL'" in summary
    assert "1 violations were detected" in summary
