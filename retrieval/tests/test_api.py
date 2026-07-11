import pytest
from fastapi.testclient import TestClient
from retrieval.api.app import app

client = TestClient(app)

def test_health_check_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["status"] == "healthy"
    assert json_data["semantic_retriever"] == "PineconeRetriever"

def test_retrieve_endpoint(mock_retrieval_plan):
    # Serialize ComplianceRetrievalPlan to dict
    payload = mock_retrieval_plan.dict()
    
    response = client.post("/retrieve", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["query"] == mock_retrieval_plan.query
    
    # Check that candidates are returned and ranked
    candidates = data["candidates"]
    assert len(candidates) > 0
    
    first = candidates[0]
    assert first["fusion_rank"] == 1
    assert first["fusion_score"] > 0.0
    
    # Retrieve confidence check
    assert data["retrieval_confidence"] > 0.0
