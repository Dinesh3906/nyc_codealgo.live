import pytest
from fastapi.testclient import TestClient
from compliance_engine.api.app import app

client = TestClient(app)

def test_health_check_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["status"] == "healthy"
    assert json_data["decision_engine"] == "ComplianceDecisionEngine"

def test_verify_endpoint(mock_building_model_pc, mock_context_package_toilet):
    payload = {
        "building_model": mock_building_model_pc,
        "context_package": mock_context_package_toilet
    }
    
    response = client.post("/verify", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["verdict"] == "PASS"
    assert len(data["findings"]) == 2
    
    finding = data["findings"][0]
    assert finding["finding_id"] == "FIND-001"
    assert finding["decision"] == "PASS"
    assert finding["verified_citation_id"] == "CIT-01"
    assert "turning space" in finding["evidence"].lower()
