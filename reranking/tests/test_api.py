from fastapi.testclient import TestClient
from reranking.api.app import app

client = TestClient(app)

def test_health_check_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["status"] == "healthy"
    assert json_data["reranker"] == "RerankingPipeline"

def test_rerank_endpoint(mock_candidate_set):
    # Serialize CandidateEvidenceSet to dict
    payload = mock_candidate_set.model_dump()
    
    response = client.post("/rerank", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["query"] == mock_candidate_set.query
    assert len(data["evidence_chunks"]) == 3
    
    first = data["evidence_chunks"][0]
    assert first["colbert_score"] > 0.0
    assert first["combined_score"] > 0.0
    assert "selection_reason" in first
    
    # Metadata metrics check
    assert data["overall_confidence"] > 0.0
    assert data["metadata"]["output_evidence_count"] == 3
