import pytest
from document_ingestion.models import (
    TextObject, GeometryObject, BoundingBox, CoordinateSystem, CoordinateSystemType, PDFType, PageClassificationType
)
from drawing_understanding.models import (
    SemanticDocumentModel, SemanticPage, TitleBlockMetadata, ParsedTable, ParsedLegend
)

@pytest.fixture
def mock_semantic_document():
    """Generates a mock semantic document model from Phase 3."""
    coord_sys = CoordinateSystem(
        system_type=CoordinateSystemType.PDF,
        width=800.0,
        height=600.0
    )

    # 1. Coordinate Geometry Primitives representing walls
    # Let's draw a closed box room: walls from (100,100) to (300,100), (300,300), (100,300), and (100,100)
    geom_objs = [
        GeometryObject(
            id="g_w1", page_idx=0, coordinates=BoundingBox(xmin=100, ymin=100, xmax=300, ymax=100),
            coordinate_system=coord_sys, source="test", processing_method="test",
            geom_type="line", points=[[100.0, 100.0], [300.0, 100.0]]
        ),
        GeometryObject(
            id="g_w2", page_idx=0, coordinates=BoundingBox(xmin=300, ymin=100, xmax=300, ymax=300),
            coordinate_system=coord_sys, source="test", processing_method="test",
            geom_type="line", points=[[300.0, 100.0], [300.0, 300.0]]
        ),
        GeometryObject(
            id="g_w3", page_idx=0, coordinates=BoundingBox(xmin=100, ymin=300, xmax=300, ymax=300),
            coordinate_system=coord_sys, source="test", processing_method="test",
            geom_type="line", points=[[300.0, 300.0], [100.0, 300.0]]
        ),
        GeometryObject(
            id="g_w4", page_idx=0, coordinates=BoundingBox(xmin=100, ymin=100, xmax=100, ymax=300),
            coordinate_system=coord_sys, source="test", processing_method="test",
            geom_type="line", points=[[100.0, 300.0], [100.0, 100.0]]
        )
    ]

    # 2. Text Objects representing labels
    text_objs = [
        # Room Name label inside room boundaries
        TextObject(
            id="t_rm", page_idx=0, coordinates=BoundingBox(xmin=180, ymin=180, xmax=220, ymax=200),
            coordinate_system=coord_sys, text="OFFICE 101", source="test", processing_method="test"
        ),
        # Door Swing label D-1
        TextObject(
            id="t_dr", page_idx=0, coordinates=BoundingBox(xmin=150, ymin=95, xmax=170, ymax=105),
            coordinate_system=coord_sys, text="D-1", source="test", processing_method="test"
        ),
        # Fire alarm symbol indicator 'SD' matching legend
        TextObject(
            id="t_sd", page_idx=0, coordinates=BoundingBox(xmin=250, ymin=250, xmax=260, ymax=260),
            coordinate_system=coord_sys, text="SD", source="test", processing_method="test"
        )
    ]

    # 3. Schedule Table
    door_schedule = ParsedTable(
        table_type="door_schedule",
        headers=["DOOR", "WIDTH", "HEIGHT", "FIRE RATING"],
        rows=[["D-1", "36\"", "84\"", "20 MIN"]]
    )

    # 4. Legend Abbreviations
    legend = ParsedLegend(
        symbol_dictionary={},
        abbreviation_dictionary={"SD": "SMOKE DETECTOR"},
        notes=[]
    )

    sem_page = SemanticPage(
        index=0, width=800.0, height=600.0,
        page_type=PDFType.VECTOR,
        classifications=[PageClassificationType.FLOOR_PLAN],
        classification_confidences={PageClassificationType.FLOOR_PLAN: 0.98},
        regions=[],
        title_block=TitleBlockMetadata(sheet_number="A-101", drawing_title="FLOOR PLAN"),
        schedules=[door_schedule],
        legends=[legend],
        hierarchy=[],
        metadata={
            "text_objects": text_objs,
            "geometry_objects": geom_objs
        }
    )

    return SemanticDocumentModel(
        id="mock_doc_999",
        filename="permit_set.pdf",
        doc_type=PDFType.VECTOR,
        pages=[sem_page],
        relationships=[]
    )
