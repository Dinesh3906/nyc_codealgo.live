import io
import pypdfium2 as pdfium
from PIL import Image
from typing import Tuple, Dict, Any
from ..config import settings
from ..preprocessing.filters import ImagePreprocessor

class RasterExtractor:
    """
    Renders PDF pages to raster images using pypdfium2 and applies pre-processing.
    """
    def __init__(self, dpi: int = None):
        self.dpi = dpi or settings.DPI

    def rasterize_page(self, pdf_path: str, page_idx: int) -> Image.Image:
        """
        Renders a PDF page to a high-resolution PIL image.
        Uses pypdfium2 pre-compiled library for fast, poppler-free execution.
        """
        doc = pdfium.PdfDocument(pdf_path)
        if page_idx < 0 or page_idx >= len(doc):
            raise IndexError(f"Page index {page_idx} is out of bounds for PDF with {len(doc)} pages.")

        page = doc[page_idx]
        
        # Calculate scale factor based on DPI (Standard PDF points are 72 DPI)
        scale = self.dpi / 72.0
        
        # Render the page to a PIL image
        bitmap = page.render(scale=scale)
        pil_img = bitmap.to_pil()
        
        # Explicit clean-up to prevent memory leaks
        page.close()
        doc.close()
        
        return pil_img

    def extract_raster_data(
        self, 
        pdf_path: str, 
        page_idx: int, 
        run_deskew: bool = True, 
        run_enhancement: bool = True
    ) -> Tuple[bytes, Dict[str, Any]]:
        """
        Rasterizes the page, applies pre-processing filters, and returns
        the cleaned PNG image bytes and layout metadata.
        """
        # 1. Render raw page
        raw_image = self.rasterize_page(pdf_path, page_idx)
        
        # Save raw dimensions before any deskew changes page size
        raw_width, raw_height = raw_image.size

        # 2. Preprocess page image
        processed_image = ImagePreprocessor.preprocess_sheet(
            raw_image, 
            run_deskew=run_deskew, 
            run_enhancement=run_enhancement
        )

        final_width, final_height = processed_image.size

        # 3. Export to PNG bytes
        buffer = io.BytesIO()
        processed_image.save(buffer, format="PNG")
        png_bytes = buffer.getvalue()

        metadata = {
            "raw_width_pixels": raw_width,
            "raw_height_pixels": raw_height,
            "processed_width_pixels": final_width,
            "processed_height_pixels": final_height,
            "dpi": self.dpi,
            "scale_factor": self.dpi / 72.0
        }

        return png_bytes, metadata
