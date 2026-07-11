import pytest
from fastapi.testclient import TestClient
from context_engine.api.app import app

client = TestClient(app)

def test_health_check_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["status"] == "healthy"
    assert json_data["context_compressor"] == "ContextCompressor"

def test_context_endpoint(mock_evidence_package, mock_building_model):
    payload = {
        "query": "Verify stair width requirements",
        "building_model": mock_building_model,
        "evidence_package": mock_evidence_package,
        "template_type": "compliance_review"
    }
    
    response = client.post("/context", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["query"] == payload["query"]
    assert "## System Context" in data["system_prompt"]
    assert "## Building Facts" in data["system_prompt"]
    
    # Check that duplication was cleaned (2 mock inputs -> 1 compressed output)
    assert len(data["citations"]) == 1
    assert data["citations"][0]["citation_id"] == "CIT-01"
    
    # Verify expected output JSON schema is included
    assert "compliant" in data["expected_output_schema"]["properties"]
    assert "reasoning" in data["expected_output_schema"]["properties"]
    
    # Check validation report
    assert data["validation_report"]["valid"] is True
    assert len(data["validation_report"]["errors"]) == 0
