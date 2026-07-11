from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from enum import Enum

class PDFType(str, Enum):
    VECTOR = "vector"
    RASTER = "raster"
    HYBRID = "hybrid"
    SCANNED = "scanned"
    MIXED = "mixed"
    UNKNOWN = "unknown"

class CoordinateSystemType(str, Enum):
    PDF = "pdf"          # Origin bottom-left (Standard PDF coordinate system)
    IMAGE = "image"      # Origin top-left (Raster image processing coordinate system)

class GeometryObjectType(str, Enum):
    LINE = "line"
    POLYLINE = "polyline"
    CURVE = "curve"
    RECTANGLE = "rectangle"
    PATH = "path"

class PageClassificationType(str, Enum):
    FLOOR_PLAN = "floor_plan"
    ELEVATION = "elevation"
    SECTION = "section"
    SCHEDULE = "schedule"
    LEGEND = "legend"
    COVER_SHEET = "cover_sheet"
    NOTES = "notes"
    STRUCTURAL = "structural"
    MEP = "mep"
    FIRE_PROTECTION = "fire_protection"
    UNKNOWN = "unknown"

class BoundingBox(BaseModel):
    xmin: float = Field(..., description="Minimum x coordinate")
    ymin: float = Field(..., description="Minimum y coordinate")
    xmax: float = Field(..., description="Maximum x coordinate")
    ymax: float = Field(..., description="Maximum y coordinate")

class CoordinateSystem(BaseModel):
    system_type: CoordinateSystemType
    width: float
    height: float
    dpi: Optional[int] = None

class BaseDocumentObject(BaseModel):
    id: str = Field(..., description="Unique object identifier")
    page_idx: int = Field(..., description="0-indexed page number")
    coordinates: BoundingBox
    coordinate_system: CoordinateSystem
    confidence: float = Field(1.0, description="Extraction confidence score (0.0 to 1.0)")
    source: str = Field(..., description="Extractor module or API name")
    processing_method: str = Field(..., description="Method used to extract this object (e.g. 'pdf_stream', 'ocr')")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional custom metadata fields")

class TextObject(BaseDocumentObject):
    text: str
    font_name: Optional[str] = None
    font_size: Optional[float] = None

class GeometryObject(BaseDocumentObject):
    geom_type: GeometryObjectType
    points: List[List[float]] = Field(..., description="List of [x, y] coordinates defining the geometry")

class ImageObject(BaseDocumentObject):
    image_format: str
    width: int
    height: int
    storage_path: Optional[str] = None

class OCRObject(BaseDocumentObject):
    text: str
    word_confidences: List[float] = Field(default_factory=list)
    language: Optional[str] = None
    rotation_degrees: float = 0.0

class Page(BaseModel):
    index: int = Field(..., description="0-indexed page index")
    width: float = Field(..., description="Page width in points")
    height: float = Field(..., description="Page height in points")
    dpi: int = Field(300, description="Rasterization resolution")
    page_type: PDFType = Field(PDFType.UNKNOWN, description="Identified page structure type")
    page_type_confidence: float = Field(1.0, description="Confidence of page type detection")
    classifications: List[PageClassificationType] = Field(default_factory=list)
    classification_confidences: Dict[PageClassificationType, float] = Field(default_factory=dict)
    text_objects: List[TextObject] = Field(default_factory=list)
    geometry_objects: List[GeometryObject] = Field(default_factory=list)
    image_objects: List[ImageObject] = Field(default_factory=list)
    ocr_objects: List[OCRObject] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)

class Document(BaseModel):
    id: str = Field(..., description="Unique document hash or identifier")
    filename: str
    page_count: int
    doc_type: PDFType = Field(PDFType.UNKNOWN, description="Consolidated document classification type")
    doc_type_confidence: float = Field(1.0, description="Overall type classification confidence")
    pages: List[Page] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)
