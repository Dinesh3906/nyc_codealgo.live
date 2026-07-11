import pytest
from document_ingestion.ocr.client import MockOCRClient, get_ocr_client
from document_ingestion.config import settings, OCREngineType

def test_mock_ocr_client():
    client = MockOCRClient()
    results = client.run_ocr(b"dummy_image_data", 0, 800.0, 600.0)
    
    assert len(results) == 3
    assert results[0].text == "PROPOSED FIRST FLOOR PLAN"
    assert results[0].page_idx == 0
    assert results[1].rotation_degrees == 90.0
    assert results[2].coordinates.xmin == 800.0 * 0.45

def test_get_ocr_client_factory():
    settings.OCR_ENGINE = OCREngineType.MOCK
    client = get_ocr_client()
    assert isinstance(client, MockOCRClient)
