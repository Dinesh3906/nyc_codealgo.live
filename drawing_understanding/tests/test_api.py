from fastapi.testclient import TestClient
from drawing_understanding.api.app import app

client = TestClient(app)

def test_health_check_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["status"] == "healthy"
    assert json_data["classifier"] == "SheetClassifierEngine"

def test_understand_endpoint(mock_ingestion_document):
    # Serialize Document representation to dict
    doc_payload = mock_ingestion_document.model_dump()
    
    response = client.post("/understand", json=doc_payload)
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["id"] == mock_ingestion_document.id
    assert len(data["pages"]) == 2
    
    # Page 0 should have TitleBlock A-101
    assert data["pages"][0]["title_block"]["sheet_number"] == "A-101"
    
    # Relationship parsing: Page 0 has reference to A-501 (which is page index 1)
    # So we expect 2 relationships (referenced_by and detail_on)
    assert len(data["relationships"]) == 2
    types = [r["rel_type"] for r in data["relationships"]]
    assert "referenced_by" in types
    assert "detail_on" in types
    
    # Check details of the detail_on relationship
    detail_rel = next(r for r in data["relationships"] if r["rel_type"] == "detail_on")
    assert detail_rel["source_id"] == "page_0"
    assert detail_rel["target_id"] == "page_1"
    assert "A-501" in detail_rel["citation_text"]
