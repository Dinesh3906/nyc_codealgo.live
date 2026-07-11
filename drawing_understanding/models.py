from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from enum import Enum
from document_ingestion.models import BoundingBox, PageClassificationType, PDFType

class RegionType(str, Enum):
    DRAWING_CANVAS = "drawing_canvas"  # Viewport region where graphics reside
    TITLE_BLOCK = "title_block"
    REVISION_BLOCK = "revision_block"
    NOTES = "notes"
    SCHEDULE = "schedule"
    LEGEND = "legend"
    NORTH_ARROW = "north_arrow"
    SCALE_BAR = "scale_bar"
    PAGE_BORDER = "page_border"

class DocumentRelationshipType(str, Enum):
    REFERENCED_BY = "referenced_by"   # e.g., Detail tag pointing to sheet
    APPLIES_TO = "applies_to"         # e.g., Schedule applying to drawing plan
    DETAIL_ON = "detail_on"           # e.g., Detail viewport on sheet
    REVISED_BY = "revised_by"

class SemanticRegion(BaseModel):
    id: str
    region_type: RegionType
    coordinates: BoundingBox
    polygon: List[List[float]] = Field(default_factory=list, description="Polygon vertices defining boundary")
    confidence: float

class TitleBlockMetadata(BaseModel):
    sheet_number: Optional[str] = None
    revision: Optional[str] = None
    drawing_title: Optional[str] = None
    scale: Optional[str] = None
    discipline: Optional[str] = None
    project: Optional[str] = None
    date: Optional[str] = None
    engineer: Optional[str] = None
    architect: Optional[str] = None
    consultant: Optional[str] = None
    version_id: Optional[str] = None

class ParsedTable(BaseModel):
    table_type: str = Field(..., description="e.g. door_schedule, window_schedule")
    headers: List[str] = Field(default_factory=list)
    rows: List[List[str]] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)

class ParsedLegend(BaseModel):
    symbol_dictionary: Dict[str, str] = Field(default_factory=dict, description="Symbol name/ID to description")
    abbreviation_dictionary: Dict[str, str] = Field(default_factory=dict, description="Abbreviation to meaning")
    notes: List[str] = Field(default_factory=list)

class DrawingHierarchyNode(BaseModel):
    id: str
    node_type: str = Field(..., description="sheet, viewport, drawing, detail, callout")
    label: str
    coordinates: BoundingBox
    parent_id: Optional[str] = None
    children_ids: List[str] = Field(default_factory=list)

class DocumentRelationship(BaseModel):
    id: str
    source_id: str = Field(..., description="Source node/page ID")
    target_id: str = Field(..., description="Target node/page ID")
    rel_type: DocumentRelationshipType
    confidence: float
    citation_text: str = Field(..., description="Sourced text triggering relationship")

class SemanticPage(BaseModel):
    index: int
    width: float
    height: float
    page_type: PDFType
    classifications: List[PageClassificationType]
    classification_confidences: Dict[PageClassificationType, float]
    regions: List[SemanticRegion] = Field(default_factory=list)
    title_block: Optional[TitleBlockMetadata] = None
    schedules: List[ParsedTable] = Field(default_factory=list)
    legends: List[ParsedLegend] = Field(default_factory=list)
    hierarchy: List[DrawingHierarchyNode] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)

class SemanticDocumentModel(BaseModel):
    id: str
    filename: str
    doc_type: PDFType
    pages: List[SemanticPage] = Field(default_factory=list)
    relationships: List[DocumentRelationship] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)
