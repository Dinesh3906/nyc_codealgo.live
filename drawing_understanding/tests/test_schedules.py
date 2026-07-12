from document_ingestion.models import (
    Page as IngestionPage, TextObject, BoundingBox, CoordinateSystem, CoordinateSystemType, PDFType
)
from drawing_understanding.models import SemanticRegion, RegionType
from drawing_understanding.schedules.parser import ScheduleTableParser

def test_schedule_table_reconstruction():
    coord_sys = CoordinateSystem(
        system_type=CoordinateSystemType.PDF,
        width=800.0,
        height=600.0
    )
    
    # Create text objects forming a door schedule grid:
    # Header row at y = 500: "MARK", "WIDTH", "HEIGHT"
    # Row 1 at y = 480: "D-1", "36\"", "84\""
    # Row 2 at y = 460: "D-2", "32\"", "80\""
    text_objs = [
        # Schedule Title
        TextObject(id="title", page_idx=0, coordinates=BoundingBox(xmin=100, ymin=530, xmax=200, ymax=545), coordinate_system=coord_sys, text="DOOR SCHEDULE", source="test", processing_method="test"),
        # Headers
        TextObject(id="h1", page_idx=0, coordinates=BoundingBox(xmin=100, ymin=500, xmax=120, ymax=510), coordinate_system=coord_sys, text="MARK", source="test", processing_method="test"),
        TextObject(id="h2", page_idx=0, coordinates=BoundingBox(xmin=150, ymin=500, xmax=180, ymax=510), coordinate_system=coord_sys, text="WIDTH", source="test", processing_method="test"),
        TextObject(id="h3", page_idx=0, coordinates=BoundingBox(xmin=200, ymin=500, xmax=230, ymax=510), coordinate_system=coord_sys, text="HEIGHT", source="test", processing_method="test"),
        # Row 1
        TextObject(id="r1c1", page_idx=0, coordinates=BoundingBox(xmin=100, ymin=480, xmax=115, ymax=490), coordinate_system=coord_sys, text="D-1", source="test", processing_method="test"),
        TextObject(id="r1c2", page_idx=0, coordinates=BoundingBox(xmin=150, ymin=480, xmax=165, ymax=490), coordinate_system=coord_sys, text="36\"", source="test", processing_method="test"),
        TextObject(id="r1c3", page_idx=0, coordinates=BoundingBox(xmin=200, ymin=480, xmax=215, ymax=490), coordinate_system=coord_sys, text="84\"", source="test", processing_method="test"),
        # Row 2
        TextObject(id="r2c1", page_idx=0, coordinates=BoundingBox(xmin=100, ymin=460, xmax=115, ymax=470), coordinate_system=coord_sys, text="D-2", source="test", processing_method="test"),
        TextObject(id="r2c2", page_idx=0, coordinates=BoundingBox(xmin=150, ymin=460, xmax=165, ymax=470), coordinate_system=coord_sys, text="32\"", source="test", processing_method="test"),
        TextObject(id="r2c3", page_idx=0, coordinates=BoundingBox(xmin=200, ymin=460, xmax=215, ymax=470), coordinate_system=coord_sys, text="80\"", source="test", processing_method="test"),
    ]
    
    page = IngestionPage(
        index=0, width=800.0, height=600.0, dpi=300, page_type=PDFType.VECTOR,
        text_objects=text_objs
    )
    
    region = SemanticRegion(
        id="r1", region_type=RegionType.SCHEDULE,
        coordinates=BoundingBox(xmin=90, ymin=450, xmax=250, ymax=550),
        confidence=1.0
    )
    
    parser = ScheduleTableParser()
    table = parser.parse_table(page, region)
    
    assert table.table_type == "door_schedule"
    assert "MARK" in table.headers
    assert "WIDTH" in table.headers
    assert len(table.rows) == 2
    assert table.rows[0] == ["D-1", "36\"", "84\""]
    assert table.rows[1] == ["D-2", "32\"", "80\""]
