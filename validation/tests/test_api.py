from fastapi.testclient import TestClient
from validation.api.app import app

client = TestClient(app)

def test_health_check_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["status"] == "healthy"
    assert json_data["validation_engine"] == "ReleaseChecklistAuditor"

def test_certify_endpoint():
    response = client.post("/certify?concurrency=100")
    
    assert response.status_code == 200
    data = response.json()
    
    assert "verdict" in data
    assert data["verdict"] == "NOT READY"
    assert data["checklist_passed"] is False
    
    # Check score structures are nested correctly
    scores = data["scores"]
    assert scores["security_score"] == 0.0
    assert scores["overall_score"] == 0.0
    assert len(data["blocking_issues"]) == 4
    
    # Check versions summary
    versions = data["active_versions"]
    assert "generator_model" in versions
    assert "ruleset_version" in versions
