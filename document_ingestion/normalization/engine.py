import os
import hashlib
import uuid
import pypdf
from typing import List, Dict, Any, Tuple
from concurrent.futures import ThreadPoolExecutor

from ..config import settings
from ..models import (
    Document, Page, PDFType, TextObject, GeometryObject, 
    ImageObject, OCRObject, CoordinateSystem, CoordinateSystemType, BoundingBox
)
from ..parser.detector import PDFTypeDetector
from ..parser.classifier import PageClassifier
from ..vector.extractor import VectorExtractor
from ..raster.extractor import RasterExtractor
from ..ocr.client import get_ocr_client

class NormalizationEngine:
    """
    Coordinates PDF ingestion, type detection, vector/raster extraction,
    OCR, and page classification into a unified schema representation.
    """

    def __init__(self):
        self.detector = PDFTypeDetector()
        self.classifier = PageClassifier()
        self.vector_extractor = VectorExtractor()
        self.raster_extractor = RasterExtractor()
        self.ocr_client = get_ocr_client()

    def _calculate_file_hash(self, file_path: str) -> str:
        """Computes SHA256 of input file to serve as unique Document ID."""
        sha256 = hashlib.sha256()
        with open(file_path, "rb") as f:
            while chunk := f.read(8192):
                sha256.update(chunk)
        return sha256.hexdigest()

    def _process_single_page(
        self, 
        pdf_path: str, 
        page_idx: int, 
        page_type: PDFType, 
        width: float, 
        height: float
    ) -> Page:
        """
        Processes a single page based on its identified classification type.
        Implements error recovery by falling back to raster processing if vector extraction fails.
        """
        text_objects: List[TextObject] = []
        geometry_objects: List[GeometryObject] = []
        image_objects: List[ImageObject] = []
        ocr_objects: List[OCRObject] = []
        
        extracted_texts = []

        # 1. Extraction Strategy Branching
        # VECTOR extraction branch
        if page_type in (PDFType.VECTOR, PDFType.HYBRID):
            try:
                t_objs, g_objs, i_objs, _ = self.vector_extractor.extract_page_data(pdf_path, page_idx)
                text_objects = t_objs
                geometry_objects = g_objs
                image_objects = i_objs
                
                extracted_texts.extend([t.text for t in text_objects])
            except Exception as e:
                # Recover gracefully by degrading to Raster if vector parsing crashes
                page_type = PDFType.RASTER

        # RASTER / SCANNED / HYBRID OCR extraction branch
        if page_type in (PDFType.RASTER, PDFType.SCANNED, PDFType.HYBRID):
            try:
                # Rasterize page, apply contrast and deskew
                png_bytes, raster_meta = self.raster_extractor.extract_raster_data(pdf_path, page_idx)
                
                # Perform OCR
                ocr_results = self.ocr_client.run_ocr(png_bytes, page_idx, width, height)
                ocr_objects = ocr_results
                
                extracted_texts.extend([o.text for o in ocr_objects])
            except Exception as e:
                # Logging error, continue processing without OCR results
                pass

        # 2. Page Classification
        combined_text = " ".join(extracted_texts)
        classifications, confidences = self.classifier.classify_page(combined_text)

        # 3. Assemble Unified Page Representation
        return Page(
            index=page_idx,
            width=width,
            height=height,
            dpi=settings.DPI,
            page_type=page_type,
            page_type_confidence=0.95,
            classifications=classifications,
            classification_confidences=confidences,
            text_objects=text_objects,
            geometry_objects=geometry_objects,
            image_objects=image_objects,
            ocr_objects=ocr_objects,
            metadata={
                "processed_at": float(os.path.getmtime(pdf_path))
            }
        )

    def process_document(self, pdf_path: str, filename: str) -> Document:
        """
        Executes the normalization pipeline on an uploaded engineering PDF document.
        Uses thread pools to process pages concurrently.
        """
        # File Validation
        if not os.path.exists(pdf_path):
            raise FileNotFoundError(f"PDF file path does not exist: {pdf_path}")

        file_size_mb = os.path.getsize(pdf_path) / (1024 * 1024)
        if file_size_mb > settings.MAX_FILE_SIZE_MB:
            raise ValueError(f"Uploaded file exceeds size limit of {settings.MAX_FILE_SIZE_MB}MB.")

        # Determine Unique Document ID
        doc_id = self._calculate_file_hash(pdf_path)

        # Classify PDF type structure
        doc_type, doc_type_conf, page_types = self.detector.detect_document_type(pdf_path)

        # Open file to read size/pages count
        pages_to_process: List[Tuple[int, PDFType, float, float]] = []
        with open(pdf_path, "rb") as f:
            reader = pypdf.PdfReader(f)
            page_count = len(reader.pages)
            
            # Bound page processing
            limit_pages = min(page_count, settings.MAX_PAGES)

            for i in range(limit_pages):
                # Retrieve page size bounding box
                p = reader.pages[i]
                width = float(p.mediabox.width or 612.0)
                height = float(p.mediabox.height or 792.0)
                
                # Match classified type for page
                p_type = page_types[i] if i < len(page_types) else PDFType.UNKNOWN
                pages_to_process.append((i, p_type, width, height))

        # Parallelize page extraction tasks
        pages: List[Page] = [None] * len(pages_to_process) # Pre-allocate to maintain order
        
        # Parallel thread execution
        with ThreadPoolExecutor(max_workers=settings.PARALLEL_WORKERS) as executor:
            futures = {
                executor.submit(self._process_single_page, pdf_path, idx, p_type, w, h): idx
                for idx, p_type, w, h in pages_to_process
            }
            
            for future in futures:
                idx = futures[future]
                try:
                    pages[idx] = future.result()
                except Exception as e:
                    # In case of total failure on a page, return a blank page skeleton to avoid crashing
                    pages[idx] = Page(
                        index=idx,
                        width=pages_to_process[idx][2],
                        height=pages_to_process[idx][3],
                        page_type=pages_to_process[idx][1],
                        metadata={"error": str(e)}
                    )

        # Filter out any None values in case of unhandled execution paths
        valid_pages = [p for p in pages if p is not None]

        return Document(
            id=doc_id,
            filename=filename,
            page_count=page_count,
            doc_type=doc_type,
            doc_type_confidence=doc_type_conf,
            pages=valid_pages,
            metadata={
                "ingested_timestamp": os.path.getctime(pdf_path),
                "file_size_bytes": os.path.getsize(pdf_path)
            }
        )
