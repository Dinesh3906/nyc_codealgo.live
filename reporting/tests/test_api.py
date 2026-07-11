import pytest
from fastapi.testclient import TestClient
from reporting.api.app import app

client = TestClient(app)

def test_health_check_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["status"] == "healthy"
    assert json_data["report_engine"] == "ReportEngine"

def test_report_endpoint(mock_compliance_report, mock_project_metadata):
    payload = {
        "compliance_report": mock_compliance_report,
        "project_metadata": mock_project_metadata,
        "template_type": "full_compliance"
    }
    
    response = client.post("/report", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["report_title"] == mock_project_metadata["report_title"]
    assert data["verdict"] == "FAIL"
    assert data["findings_scorecard"]["PASS"] == 1
    assert data["findings_scorecard"]["FAIL"] == 1
    
    # Check rendered structures are included
    assert "<!DOCTYPE html>" in data["html_report"]
    assert "# Empire State Access Compliance Audit" in data["markdown_report"]
    assert "FIND-001,accessibility,toilet" in data["csv_report"]
    
    # Check audit trail logs
    assert data["audit_trail"]["decision_verdict"] == "FAIL"
    assert data["audit_trail"]["findings_count"] == 2
    assert "system_version" in data["audit_trail"]
