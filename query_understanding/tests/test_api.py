from fastapi.testclient import TestClient
from query_understanding.api.app import app

client = TestClient(app)

def test_health_check_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["status"] == "healthy"
    assert json_data["planner"] == "ComplianceRetrievalPlanner"

def test_plan_endpoint(mock_knowledge_model_dict):
    payload = {
        "query": "Verify toilet clearances in bathrooms",
        "knowledge_model": mock_knowledge_model_dict
    }
    
    response = client.post("/plan", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["query"] == payload["query"]
    assert data["retrieval_strategy"] == "hybrid"
    assert "Plumbing Code" in data["applicable_codes"]
    assert "Chapter 4" in data["applicable_chapters"]
    
    # Check that metadata filters were serialized
    filters = data["metadata_filters"]
    assert len(filters) >= 3
    filter_keys = [f["key"] for f in filters]
    assert "jurisdiction" in filter_keys
    assert "code_book" in filter_keys
    assert "occupancy_classification" in filter_keys
