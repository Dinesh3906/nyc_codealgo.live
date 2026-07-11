import pytest
from document_ingestion.models import (
    Document as IngestionDocument, Page as IngestionPage, 
    TextObject, BoundingBox, CoordinateSystem, CoordinateSystemType, PDFType, PageClassificationType
)

@pytest.fixture
def mock_ingestion_document():
    """Generates a mock normalized Document representation."""
    coord_sys = CoordinateSystem(
        system_type=CoordinateSystemType.PDF,
        width=792.0,
        height=612.0
    )

    # Page 1: Floor plan page containing a title block and drawing canvas references
    page_1_texts = [
        # Title block texts
        TextObject(
            id="t1", page_idx=0, coordinates=BoundingBox(xmin=700.0, ymin=50.0, xmax=780.0, ymax=70.0),
            coordinate_system=coord_sys, text="A-101", font_name="Arial", font_size=12.0,
            source="test", processing_method="test"
        ),
        TextObject(
            id="t2", page_idx=0, coordinates=BoundingBox(xmin=700.0, ymin=200.0, xmax=780.0, ymax=220.0),
            coordinate_system=coord_sys, text="FIRST FLOOR PLAN", font_name="Arial", font_size=14.0,
            source="test", processing_method="test"
        ),
        TextObject(
            id="t3", page_idx=0, coordinates=BoundingBox(xmin=700.0, ymin=100.0, xmax=780.0, ymax=115.0),
            coordinate_system=coord_sys, text="SCALE: 1/4\" = 1'-0\"", font_name="Arial", font_size=10.0,
            source="test", processing_method="test"
        ),
        TextObject(
            id="t4", page_idx=0, coordinates=BoundingBox(xmin=700.0, ymin=120.0, xmax=780.0, ymax=135.0),
            coordinate_system=coord_sys, text="DATE: 12/15/2025", font_name="Arial", font_size=10.0,
            source="test", processing_method="test"
        ),
        # Detail view references on canvas pointing to Sheet A-501
        TextObject(
            id="t5", page_idx=0, coordinates=BoundingBox(xmin=200.0, ymin=300.0, xmax=280.0, ymax=315.0),
            coordinate_system=coord_sys, text="SEE DETAIL 5 / A-501 FOR WALL CONNECTIONS", font_name="Arial", font_size=8.0,
            source="test", processing_method="test"
        )
    ]

    # Page 2: Detail page containing title block matching A-501
    page_2_texts = [
        TextObject(
            id="t6", page_idx=1, coordinates=BoundingBox(xmin=700.0, ymin=50.0, xmax=780.0, ymax=70.0),
            coordinate_system=coord_sys, text="A-501", font_name="Arial", font_size=12.0,
            source="test", processing_method="test"
        ),
        TextObject(
            id="t7", page_idx=1, coordinates=BoundingBox(xmin=700.0, ymin=200.0, xmax=780.0, ymax=220.0),
            coordinate_system=coord_sys, text="WALL DETAILS AND SECTIONS", font_name="Arial", font_size=14.0,
            source="test", processing_method="test"
        ),
        TextObject(
            id="t8", page_idx=1, coordinates=BoundingBox(xmin=100.0, ymin=400.0, xmax=150.0, ymax=415.0),
            coordinate_system=coord_sys, text="DETAIL 5", font_name="Arial", font_size=10.0,
            source="test", processing_method="test"
        )
    ]

    page_1 = IngestionPage(
        index=0, width=792.0, height=612.0, dpi=300,
        page_type=PDFType.VECTOR,
        classifications=[PageClassificationType.FLOOR_PLAN],
        classification_confidences={PageClassificationType.FLOOR_PLAN: 0.95},
        text_objects=page_1_texts
    )

    page_2 = IngestionPage(
        index=1, width=792.0, height=612.0, dpi=300,
        page_type=PDFType.VECTOR,
        classifications=[PageClassificationType.NOTES],
        classification_confidences={PageClassificationType.NOTES: 0.90},
        text_objects=page_2_texts
    )

    return IngestionDocument(
        id="mock_hash_12345",
        filename="project_set.pdf",
        page_count=2,
        doc_type=PDFType.VECTOR,
        doc_type_confidence=0.98,
        pages=[page_1, page_2]
    )
