from fastapi import FastAPI
from shared.cors import configure_cors
from document_ingestion.models import Document as IngestionDocument
from ..models import (
    SemanticDocumentModel, SemanticPage, ParsedTable, ParsedLegend, RegionType
)
from ..sheet_classifier.engine import SheetClassifierEngine
from ..regions.segmentor import LayoutSegmentor
from ..metadata.extractor import TitleBlockMetadataExtractor
from ..schedules.parser import ScheduleTableParser
from ..legends.parser import LegendParser
from ..hierarchy.engine import HierarchyRelationshipEngine

app = FastAPI(
    title="PermitIQ Drawing Understanding API",
    description="Extracts semantic structure, regions, tables, and relationships from drawings",
    version="1.0.0"
)

configure_cors(app)

# Instantiate engines
sheet_classifier = SheetClassifierEngine()
layout_segmentor = LayoutSegmentor()
metadata_extractor = TitleBlockMetadataExtractor()
schedule_parser = ScheduleTableParser()
legend_parser = LegendParser()
hierarchy_engine = HierarchyRelationshipEngine()

@app.post("/understand", response_model=SemanticDocumentModel, summary="Analyze and understand drawing layout")
async def understand_document(doc: IngestionDocument):
    """
    Takes a Unified Document Representation and extracts semantic page classifications,
    segmented layout regions, schedules, legend dictionaries, and cross-sheet relationships.
    """
    semantic_pages: List[SemanticPage] = []
    sheet_id_to_page_idx: Dict[str, int] = {}

    # Step 1: First pass over pages to extract regions, classifications, and sheet numbers
    for page in doc.pages:
        # Segment regions
        regions = layout_segmentor.segment_page(page)
        
        # Locate Title Block
        tb_region = next((r for r in regions if r.region_type == RegionType.TITLE_BLOCK), None)
        
        # Extract title block metadata
        tb_meta = None
        if tb_region:
            tb_meta = metadata_extractor.extract_metadata(page, tb_region)
            if tb_meta.sheet_number:
                sheet_id_to_page_idx[tb_meta.sheet_number] = page.index

        # Sheet Classifications
        classifications, confs = sheet_classifier.classify_sheet(page)

        # Extract Tables & Legends from their respective regions
        schedules: List[ParsedTable] = []
        legends: List[ParsedLegend] = []
        
        for region in regions:
            if region.region_type == RegionType.SCHEDULE:
                parsed_table = schedule_parser.parse_table(page, region)
                schedules.append(parsed_table)
            elif region.region_type == RegionType.LEGEND:
                parsed_leg = legend_parser.parse_legend(page, region)
                legends.append(parsed_leg)

        # Build local page viewports tree
        page_id = f"page_{page.index}"
        hierarchy_nodes = hierarchy_engine.extract_page_hierarchy(page, page_id)

        # Keep a list of all raw text for relationship parsing
        raw_text_list = [t.text for t in page.text_objects] + [o.text for o in page.ocr_objects]

        semantic_pages.append(
            SemanticPage(
                index=page.index,
                width=page.width,
                height=page.height,
                page_type=page.page_type,
                classifications=[c.value for c in page.classifications], # Map to matching type values
                classification_confidences=page.classification_confidences,
                regions=regions,
                title_block=tb_meta,
                schedules=schedules,
                legends=legends,
                hierarchy=hierarchy_nodes,
                metadata={
                    "raw_text_list": raw_text_list
                }
            )
        )

    # Step 2: Extract cross-sheet relationship mappings using resolved sheet references
    relationships = hierarchy_engine.extract_relationships(semantic_pages, sheet_id_to_page_idx)

    # Clean up large text lists from page metadata before returning to client
    for sp in semantic_pages:
        sp.metadata.pop("raw_text_list", None)

    return SemanticDocumentModel(
        id=doc.id,
        filename=doc.filename,
        doc_type=doc.doc_type,
        pages=semantic_pages,
        relationships=relationships,
        metadata={
            "sheets_found_count": len(sheet_id_to_page_idx)
        }
    )

@app.get("/health", summary="Health check")
async def health_check():
    return {
        "status": "healthy",
        "classifier": "SheetClassifierEngine",
        "segmentor": "LayoutSegmentor"
    }
from typing import List, Dict
