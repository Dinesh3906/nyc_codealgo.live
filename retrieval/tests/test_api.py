import json

from fastapi.testclient import TestClient
import retrieval.api.app as retrieval_app
from retrieval.api.app import app
from retrieval.config import settings
from retrieval.schemas.models import RetrievalCandidate

client = TestClient(app)

def test_health_check_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["status"] == "healthy"
    assert json_data["semantic_retriever"] == "PineconeRetriever"

def test_retrieve_endpoint(mock_retrieval_plan, fixture_corpus, tmp_path, monkeypatch):
    corpus_path = tmp_path / "code_corpus.json"
    corpus_path.write_text(json.dumps(fixture_corpus), encoding="utf-8")

    previous_app_env = settings.APP_ENV
    previous_corpus_path = settings.CODE_CORPUS_PATH

    settings.APP_ENV = "test"
    settings.CODE_CORPUS_PATH = str(corpus_path)

    async def fake_semantic_query(query, filters, top_k):
        item = fixture_corpus[0]
        return [
            RetrievalCandidate(
                chunk_id=item["chunk_id"],
                chunk_text=item["chunk_text"],
                document_id=item["document_id"],
                filename=item["filename"],
                page_number=item["page_number"],
                code_book=item["code_book"],
                chapter=item["chapter"],
                section=item["section"],
                subsection=item["subsection"],
                discipline=item["discipline"],
                occupancy_type=item["occupancy_type"],
                jurisdiction=item["jurisdiction"],
                revision_year=item["revision_year"],
                pinecone_rank=1,
                fusion_score=0.0,
                confidence=0.91,
                retrieval_sources=["pinecone"],
            )
        ]

    monkeypatch.setattr(retrieval_app.pinecone_client, "query_semantic_index", fake_semantic_query)
    try:
        # Serialize ComplianceRetrievalPlan to dict
        payload = mock_retrieval_plan.model_dump()
        
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
    finally:
        settings.APP_ENV = previous_app_env
        settings.CODE_CORPUS_PATH = previous_corpus_path

def test_retrieve_endpoint_requires_semantic_retrieval_in_production(mock_retrieval_plan, fixture_corpus, tmp_path):
    corpus_path = tmp_path / "code_corpus.json"
    corpus_path.write_text(json.dumps(fixture_corpus), encoding="utf-8")

    previous_app_env = settings.APP_ENV
    previous_corpus_path = settings.CODE_CORPUS_PATH
    previous_key = settings.PINECONE_API_KEY
    previous_host = settings.PINECONE_INDEX_HOST
    previous_embedding = settings.EMBEDDING_ENDPOINT

    settings.APP_ENV = "production"
    settings.CODE_CORPUS_PATH = str(corpus_path)
    settings.PINECONE_API_KEY = ""
    settings.PINECONE_INDEX_HOST = ""
    settings.EMBEDDING_ENDPOINT = ""

    try:
        response = client.post("/retrieve", json=mock_retrieval_plan.model_dump())

        assert response.status_code == 503
        assert "Semantic retrieval unavailable in production" in response.json()["detail"]
    finally:
        settings.APP_ENV = previous_app_env
        settings.CODE_CORPUS_PATH = previous_corpus_path
        settings.PINECONE_API_KEY = previous_key
        settings.PINECONE_INDEX_HOST = previous_host
        settings.EMBEDDING_ENDPOINT = previous_embedding
