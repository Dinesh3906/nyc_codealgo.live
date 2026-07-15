import pytest
from fastapi.testclient import TestClient
from aiops.api.app import app
from aiops.config import settings
import json

client = TestClient(app)

def configure_drift_evidence(tmp_path, monkeypatch):
    baseline_path = tmp_path / "baseline_embeddings.json"
    current_path = tmp_path / "current_embeddings.json"
    baseline_path.write_text(json.dumps({"embeddings": [[0.1, 0.2, 0.3]]}), encoding="utf-8")
    current_path.write_text(json.dumps({"embeddings": [[0.1, 0.2, 0.3]]}), encoding="utf-8")
    monkeypatch.setattr(settings, "DRIFT_BASELINE_EMBEDDINGS_PATH", str(baseline_path))
    monkeypatch.setattr(settings, "DRIFT_CURRENT_EMBEDDINGS_PATH", str(current_path))

def test_health_check_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["status"] == "healthy"
    assert json_data["governance_engine"] == "RegistryManager"

def test_governance_report_endpoint(tmp_path, monkeypatch):
    configure_drift_evidence(tmp_path, monkeypatch)

    response = client.get("/governance")
    assert response.status_code == 200
    data = response.json()
    
    assert data["drift_detected"] is False
    assert len(data["active_models"]) == 3
    assert len(data["active_prompts"]) == 2
    assert data["hard_examples_count"] == 0

def test_feedback_ingestion_endpoint(tmp_path, monkeypatch):
    configure_drift_evidence(tmp_path, monkeypatch)

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
