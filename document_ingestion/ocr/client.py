import uuid
import time
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
import requests
from ..models import OCRObject, BoundingBox, CoordinateSystem, CoordinateSystemType
from ..config import settings, OCREngineType

class OCRClient(ABC):
    """
    Abstract Base Class for OCR Engine Integrations.
    """
    def __init__(self, source_name: str):
        self.source_name = source_name

    @abstractmethod
    def run_ocr(self, image_bytes: bytes, page_idx: int, page_width: float, page_height: float) -> List[OCRObject]:
        """
        Runs OCR on page image bytes and returns a list of normalized OCRObject entities.
        """
        pass

class MockOCRClient(OCRClient):
    """
    A mock OCR client for testing and local development without cloud credentials.
    Generates structured test text objects based on coordinates.
    """
    def __init__(self):
        super().__init__(source_name="mock_ocr_engine")

    def run_ocr(self, image_bytes: bytes, page_idx: int, page_width: float, page_height: float) -> List[OCRObject]:
        # Return a few default mock elements simulating typical blueprints
        coord_sys = CoordinateSystem(
            system_type=CoordinateSystemType.PDF,
            width=page_width,
            height=page_height,
            dpi=settings.DPI
        )

        objects = [
            OCRObject(
                id=f"ocr-{uuid.uuid4()}",
                page_idx=page_idx,
                coordinates=BoundingBox(
                    xmin=page_width * 0.1,
                    ymin=page_height * 0.1,
                    xmax=page_width * 0.3,
                    ymax=page_height * 0.15
                ),
                coordinate_system=coord_sys,
                confidence=0.98,
                source=self.source_name,
                processing_method="ocr_simulation",
                text="PROPOSED FIRST FLOOR PLAN",
                word_confidences=[0.99, 0.98, 0.98, 0.99],
                language="en",
                rotation_degrees=0.0
            ),
            OCRObject(
                id=f"ocr-{uuid.uuid4()}",
                page_idx=page_idx,
                coordinates=BoundingBox(
                    xmin=page_width * 0.8,
                    ymin=page_height * 0.05,
                    xmax=page_width * 0.95,
                    ymax=page_height * 0.25
                ),
                coordinate_system=coord_sys,
                confidence=0.95,
                source=self.source_name,
                processing_method="ocr_simulation",
                text="A-101\nSHEET INDEX",
                word_confidences=[0.96, 0.94],
                language="en",
                rotation_degrees=90.0  # Rotated title block text
            ),
            OCRObject(
                id=f"ocr-{uuid.uuid4()}",
                page_idx=page_idx,
                coordinates=BoundingBox(
                    xmin=page_width * 0.45,
                    ymin=page_height * 0.5,
                    xmax=page_width * 0.55,
                    ymax=page_height * 0.52
                ),
                coordinate_system=coord_sys,
                confidence=0.91,
                source=self.source_name,
                processing_method="ocr_simulation",
                text="3'-0\" CLEAR DOOR WIDTH",
                word_confidences=[0.92, 0.90, 0.93],
                language="en",
                rotation_degrees=0.0
            )
        ]
        return objects

class AzureOCRClient(OCRClient):
    """
    Production client for Azure AI Document Intelligence (formerly Form Recognizer).
    Uses REST API calls directly to avoid heavy Azure SDK requirements.
    """
    def __init__(self, endpoint: str = None, key: str = None):
        super().__init__(source_name="azure_document_intelligence")
        self.endpoint = endpoint or settings.AZURE_OCR_ENDPOINT
        self.key = key or settings.AZURE_OCR_KEY

    def run_ocr(self, image_bytes: bytes, page_idx: int, page_width: float, page_height: float) -> List[OCRObject]:
        if not self.endpoint or not self.key:
            raise ValueError("Azure OCR endpoint and key must be configured.")

        # Strip trailing slash from endpoint if present
        base_url = self.endpoint.rstrip("/")
        # Using pre-built read layout model API
        url = f"{base_url}/formrecognizer/documentModels/prebuilt-layout:analyze?api-version=2023-07-31"

        headers = {
            "Ocp-Apim-Subscription-Key": self.key,
            "Content-Type": "application/octet-stream"
        }

        # Step 1: Submit processing request
        response = requests.post(url, headers=headers, data=image_bytes, timeout=settings.TIMEOUT_SECONDS)
        if response.status_code != 202:
            raise Exception(f"Azure OCR submission failed: {response.text}")

        operation_location = response.headers.get("Operation-Location")
        if not operation_location:
            raise Exception("Azure OCR did not return Operation-Location header.")

        # Step 2: Poll for results
        headers = {"Ocp-Apim-Subscription-Key": self.key}
        for _ in range(int(settings.TIMEOUT_SECONDS / settings.RETRY_BACKOFF_SECONDS)):
            poll_resp = requests.get(operation_location, headers=headers, timeout=5)
            if poll_resp.status_code != 200:
                raise Exception(f"Azure OCR polling failed: {poll_resp.text}")

            result_json = poll_resp.json()
            status = result_json.get("status")

            if status == "succeeded":
                return self._parse_azure_result(result_json, page_idx, page_width, page_height)
            elif status == "failed":
                raise Exception(f"Azure OCR processing failed: {result_json}")

            time.sleep(settings.RETRY_BACKOFF_SECONDS)

        raise TimeoutError("Azure OCR processing timed out.")

    def _parse_azure_result(self, result_json: Dict[str, Any], page_idx: int, page_width: float, page_height: float) -> List[OCRObject]:
        objects: List[OCRObject] = []
        analyze_result = result_json.get("analyzeResult", {})
        
        # Read page dimensions returned by Azure to map coordinates correctly
        # Azure typically returns dimensions in inches or pixels.
        azure_pages = analyze_result.get("pages", [])
        if not azure_pages:
            return []

        # Assuming single image page upload, parse the first page item
        azure_page = azure_pages[0]
        az_width = azure_page.get("width", page_width)
        az_height = azure_page.get("height", page_height)
        unit = azure_page.get("unit", "pixel") # "inch" or "pixel"

        # Conversion factor to PDF points
        x_scale = page_width / az_width
        y_scale = page_height / az_height

        coord_sys = CoordinateSystem(
            system_type=CoordinateSystemType.PDF,
            width=page_width,
            height=page_height,
            dpi=settings.DPI
        )

        # Extract lines
        lines = azure_page.get("lines", [])
        for i, line in enumerate(lines):
            text = line.get("content", "")
            polygon = line.get("polygon", []) # [x1, y1, x2, y2, x3, y3, x4, y4]
            
            if len(polygon) < 8:
                continue

            # Scale and map polygon to PDF coordinate bounds
            xs = [polygon[j] * x_scale for j in range(0, len(polygon), 2)]
            ys = [polygon[j] * y_scale for j in range(1, len(polygon), 2)]

            # Convert from image coordinate system (origin top-left) to PDF (origin bottom-left)
            ys_pdf = [page_height - y for y in ys]

            xmin, xmax = min(xs), max(xs)
            ymin, ymax = min(ys_pdf), max(ys_pdf)

            # Estimate rotation
            # Angle of vector from top-left (p1) to top-right (p2)
            import math
            dx = polygon[2] - polygon[0]
            dy = polygon[3] - polygon[1]
            rotation = math.degrees(math.atan2(dy, dx))

            # Retrieve word confidences
            spans = line.get("spans", [])
            word_confidences = [0.95] # Default fallback

            objects.append(
                OCRObject(
                    id=f"ocr-azure-{uuid.uuid4()}",
                    page_idx=page_idx,
                    coordinates=BoundingBox(xmin=xmin, ymin=ymin, xmax=xmax, ymax=ymax),
                    coordinate_system=coord_sys,
                    confidence=sum(word_confidences)/len(word_confidences),
                    source=self.source_name,
                    processing_method="azure_layout_api",
                    text=text,
                    word_confidences=word_confidences,
                    language="en",
                    rotation_degrees=rotation
                )
            )

        return objects

class GoogleOCRClient(OCRClient):
    """
    Production client for Google Cloud Vision OCR.
    """
    def __init__(self, credentials_path: str = None):
        super().__init__(source_name="google_cloud_vision")
        self.credentials_path = credentials_path or settings.GOOGLE_APPLICATION_CREDENTIALS

    def run_ocr(self, image_bytes: bytes, page_idx: int, page_width: float, page_height: float) -> List[OCRObject]:
        # Implementation using Google Cloud Vision REST endpoint
        # For simplicity and ease of use, we utilize standard requests.
        url = "https://vision.googleapis.com/v1/images:annotate"
        
        # In a real environment, read authentication token or use API Key
        # Let's implement dynamic credentials check
        import base64
        image_b64 = base64.b64encode(image_bytes).decode("utf-8")

        # Fallback to Mock if credentials are missing
        if not os.environ.get("GOOGLE_API_KEY") and not self.credentials_path:
            raise ValueError("Google Cloud Vision API Key or credentials path must be set.")

        api_key = os.environ.get("GOOGLE_API_KEY", "")
        params = {"key": api_key} if api_key else None

        payload = {
            "requests": [
                {
                    "image": {"content": image_b64},
                    "features": [{"type": "DOCUMENT_TEXT_DETECTION"}]
                }
            ]
        }

        response = requests.post(url, json=payload, params=params, timeout=settings.TIMEOUT_SECONDS)
        if response.status_code != 200:
            raise Exception(f"Google Cloud Vision OCR failed: {response.text}")

        return self._parse_google_result(response.json(), page_idx, page_width, page_height)

    def _parse_google_result(self, result_json: Dict[str, Any], page_idx: int, page_width: float, page_height: float) -> List[OCRObject]:
        objects: List[OCRObject] = []
        responses = result_json.get("responses", [])
        if not responses:
            return []

        annotations = responses[0].get("fullTextAnnotation", {})
        pages = annotations.get("pages", [])
        if not pages:
            return []

        coord_sys = CoordinateSystem(
            system_type=CoordinateSystemType.PDF,
            width=page_width,
            height=page_height,
            dpi=settings.DPI
        )

        google_page = pages[0]
        # In Google Cloud Vision, coordinates are pixels on the uploaded image boundary
        g_width = google_page.get("width", page_width)
        g_height = google_page.get("height", page_height)

        x_scale = page_width / g_width
        y_scale = page_height / g_height

        for block in google_page.get("blocks", []):
            for paragraph in block.get("paragraphs", []):
                text_parts = []
                word_confidences = []
                
                # Combine words into paragraph line equivalent
                for word in paragraph.get("words", []):
                    word_text = "".join([symbol.get("text", "") for symbol in word.get("symbols", [])])
                    text_parts.append(word_text)
                    word_confidences.append(word.get("confidence", 0.95))

                combined_text = " ".join(text_parts)
                if not combined_text:
                    continue

                vertices = paragraph.get("boundingBox", {}).get("vertices", [])
                if len(vertices) < 4:
                    continue

                # Scale boundaries and map top-left origin to bottom-left PDF coordinate system
                xs = [v.get("x", 0) * x_scale for v in vertices]
                ys = [v.get("y", 0) * y_scale for v in vertices]

                ys_pdf = [page_height - y for y in ys]

                xmin, xmax = min(xs), max(xs)
                ymin, ymax = min(ys_pdf), max(ys_pdf)

                objects.append(
                    OCRObject(
                        id=f"ocr-google-{uuid.uuid4()}",
                        page_idx=page_idx,
                        coordinates=BoundingBox(xmin=xmin, ymin=ymin, xmax=xmax, ymax=ymax),
                        coordinate_system=coord_sys,
                        confidence=sum(word_confidences) / len(word_confidences) if word_confidences else 0.95,
                        source=self.source_name,
                        processing_method="google_cloud_vision_api",
                        text=combined_text,
                        word_confidences=word_confidences,
                        language="en",
                        rotation_degrees=0.0
                    )
                )

        return objects

def get_ocr_client() -> OCRClient:
    """
    Factory function to retrieve the configured OCRClient instance.
    """
    engine = settings.OCR_ENGINE
    if engine == OCREngineType.AZURE:
        return AzureOCRClient()
    elif engine == OCREngineType.GOOGLE:
        return GoogleOCRClient()
    return MockOCRClient()
