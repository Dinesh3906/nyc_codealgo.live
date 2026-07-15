import pytest

from document_ingestion.ocr.client import AzureOCRClient, GoogleOCRClient, get_ocr_client
from document_ingestion.config import settings, OCREngineType

def test_get_ocr_client_factory():
    previous_engine = settings.OCR_ENGINE

    try:
        settings.OCR_ENGINE = OCREngineType.AZURE
        client = get_ocr_client()
        assert isinstance(client, AzureOCRClient)

        settings.OCR_ENGINE = OCREngineType.GOOGLE
        client = get_ocr_client()
        assert isinstance(client, GoogleOCRClient)
    finally:
        settings.OCR_ENGINE = previous_engine

def test_azure_ocr_requires_credentials():
    client = AzureOCRClient(endpoint="", key="")

    with pytest.raises(ValueError, match="Azure OCR endpoint and key must be configured"):
        client.run_ocr(b"image", 0, 800.0, 600.0)

def test_google_ocr_requires_credentials(monkeypatch):
    monkeypatch.delenv("GOOGLE_API_KEY", raising=False)
    client = GoogleOCRClient(credentials_path="")

    with pytest.raises(ValueError, match="Google Cloud Vision API Key or credentials path must be set"):
        client.run_ocr(b"image", 0, 800.0, 600.0)
