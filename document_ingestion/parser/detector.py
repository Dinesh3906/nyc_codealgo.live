import os
import pypdf
from typing import Tuple, List
from ..models import PDFType
from ..config import settings

class PDFTypeDetector:
    """
    Analyzes the internal stream structures of a PDF to classify it into:
    Vector, Raster, Hybrid, Scanned, or Mixed.
    """

    @staticmethod
    def detect_page_type(page: pypdf.PageObject) -> Tuple[PDFType, float]:
        """
        Analyzes a single PDF page structure to determine its type and confidence.
        """
        # 1. Extract raw stats from page content streams
        text = page.extract_text() or ""
        char_count = len(text.strip())

        # Check for image resources
        has_images = False
        image_count = 0
        if "/Resources" in page and "/XObject" in page["/Resources"]:
            xobjects = page["/Resources"]["/XObject"]
            for obj_key in xobjects:
                obj = xobjects[obj_key]
                if hasattr(obj, "get") and obj.get("/Subtype") == "/Image":
                    has_images = True
                    image_count += 1

        # Check for vector operators in content streams
        # Standard PDF vector operators: ' l ', ' m ', ' re ', ' c ', ' S ', ' f '
        has_vectors = False
        vector_op_count = 0
        try:
            contents = page.get_contents()
            if contents:
                # Concatenate contents data if it is an array
                if isinstance(contents, list):
                    stream_data = b"".join([c.get_data() for c in contents if hasattr(c, "get_data")])
                elif hasattr(contents, "get_data"):
                    stream_data = contents.get_data()
                else:
                    stream_data = b""

                # Count common path drawing operators
                vector_op_count += stream_data.count(b" l ")
                vector_op_count += stream_data.count(b" m ")
                vector_op_count += stream_data.count(b" re ")
                vector_op_count += stream_data.count(b" c ")
                vector_op_count += stream_data.count(b" S ")
                vector_op_count += stream_data.count(b" f ")

                if vector_op_count > 5:
                    has_vectors = True
        except Exception:
            # Fallback if stream parsing fails
            pass

        # 2. Apply Classification Logic based on stats
        # Case A: Only images, no vectors, no text -> Scanned
        if has_images and not has_vectors and char_count == 0:
            return PDFType.SCANNED, 0.95

        # Case B: Images and text, but no vectors -> Raster (likely a scanned PDF run through OCR software)
        if has_images and not has_vectors and char_count > 0:
            return PDFType.RASTER, 0.90

        # Case C: No images, substantial vectors, substantial text -> Vector
        if not has_images and has_vectors and char_count > 20:
            return PDFType.VECTOR, 0.98

        # Case D: Images and vectors present -> Hybrid
        if has_images and has_vectors:
            # If there are lots of characters, it's a solid hybrid vector-raster plan
            if char_count > 50:
                return PDFType.HYBRID, 0.95
            return PDFType.HYBRID, 0.85

        # Case E: Only vector geometry, no text and no images
        if not has_images and has_vectors and char_count <= 20:
            return PDFType.VECTOR, 0.80

        # Case F: Page has text only, no vectors and no images (e.g. simple text page)
        if not has_images and not has_vectors and char_count > 0:
            return PDFType.VECTOR, 0.85

        return PDFType.UNKNOWN, 0.50

    def detect_document_type(self, pdf_path: str) -> Tuple[PDFType, float, List[PDFType]]:
        """
        Processes all pages in the PDF to determine the overall document classification
        and returns the consolidated type, confidence, and page-level classification list.
        """
        if not os.path.exists(pdf_path):
            raise FileNotFoundError(f"PDF file not found: {pdf_path}")

        page_types: List[PDFType] = []
        confidences: List[float] = []

        try:
            with open(pdf_path, "rb") as f:
                reader = pypdf.PdfReader(f)
                num_pages = len(reader.pages)

                if num_pages == 0:
                    return PDFType.UNKNOWN, 1.0, []

                # Cap pages based on settings to protect memory
                pages_to_process = min(num_pages, settings.MAX_PAGES)

                for i in range(pages_to_process):
                    page = reader.pages[i]
                    p_type, p_conf = self.detect_page_type(page)
                    page_types.append(p_type)
                    confidences.append(p_conf)

        except Exception:
            # Handle corrupted or encrypted PDFs gracefully
            return PDFType.UNKNOWN, 0.0, []

        # Consolidate page classifications
        unique_types = set(page_types)

        if not unique_types:
            return PDFType.UNKNOWN, 1.0, []

        if len(unique_types) == 1:
            # All pages are of the same type
            consolidated_type = list(unique_types)[0]
            avg_confidence = sum(confidences) / len(confidences) if confidences else 1.0
            return consolidated_type, avg_confidence, page_types

        # If pages are a mixture of types
        # Check if the mixture is a combination of vector-based and raster-based pages
        has_vector_group = any(t in (PDFType.VECTOR, PDFType.HYBRID) for t in unique_types)
        has_raster_group = any(t in (PDFType.RASTER, PDFType.SCANNED) for t in unique_types)

        if has_vector_group and has_raster_group:
            consolidated_type = PDFType.MIXED
            confidence = 0.90
        elif has_vector_group:
            consolidated_type = PDFType.VECTOR
            confidence = 0.80
        else:
            consolidated_type = PDFType.RASTER
            confidence = 0.80

        return consolidated_type, confidence, page_types
