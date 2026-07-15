from fastapi.testclient import TestClient
from unittest.mock import patch
from document_ingestion.api.app import app
from document_ingestion.models import Document, PDFType

client = TestClient(app)

def test_health_check_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["status"] == "healthy"
    assert json_data["ocr_engine"] == "azure"

@patch("document_ingestion.api.app.normalization_engine")
def test_ingest_endpoint(mock_engine):
    # Setup mock parsed document
    mock_doc = Document(
        id="dummy_sha256_hash_code",
        filename="floorplan.pdf",
        page_count=1,
        doc_type=PDFType.VECTOR,
        doc_type_confidence=0.98,
        pages=[]
    )
    mock_engine.process_document.return_value = mock_doc

    # Create dummy file bytes representing a PDF
    pdf_bytes = b"%PDF-1.7\n%dummy contents"
    
    response = client.post(
        "/ingest",
        files={"file": ("floorplan.pdf", pdf_bytes, "application/pdf")}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "dummy_sha256_hash_code"
    assert data["filename"] == "floorplan.pdf"
    assert data["doc_type"] == "vector"
