import pytest
from fastapi.testclient import TestClient
from aiops.api.app import app

client = TestClient(app)

def test_health_check_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["status"] == "healthy"
    assert json_data["governance_engine"] == "RegistryManager"

def test_governance_report_endpoint():
    response = client.get("/governance")
    assert response.status_code == 200
    data = response.json()
    
    assert data["drift_detected"] is False
    assert len(data["active_models"]) == 3
    assert len(data["active_prompts"]) == 2
    assert data["hard_examples_count"] == 0

def test_feedback_ingestion_endpoint():
    payload = {
        "job_id": "job_101",
        "user_id": "user_202",
        "user_role": "SME",
        "rating": 2,
        "corrections": {"room_1": {"failed_clearance": "55 in"}}
    }
    
    response = client.post(
        "/feedback?job_id=job_101&user_id=user_202&user_role=SME&rating=2",
        json={"room_1": {"failed_clearance": "55 in"}}
    )
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["is_hard_example"] is True
    assert data["rating"] == 2
    
    # Check governance report count updates
    gov_res = client.get("/governance")
    assert gov_res.json()["hard_examples_count"] == 1
