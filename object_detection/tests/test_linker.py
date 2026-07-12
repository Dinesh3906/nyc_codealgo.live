from document_ingestion.models import BoundingBox
from drawing_understanding.models import ParsedTable
from object_detection.models import SemanticBuildingObject
from object_detection.schedules.linker import ScheduleLinker

def test_schedule_object_linking():
    linker = ScheduleLinker()
    
    # Door schedule row D-1 width 36", height 84"
    table = ParsedTable(
        table_type="door_schedule",
        headers=["DOOR NO", "WIDTH", "HEIGHT"],
        rows=[["D-1", "36\"", "84\""]]
    )

    # Detected door object
    door = SemanticBuildingObject(
        id="d1", object_class="DOOR",
        coordinates=BoundingBox(xmin=10, ymin=10, xmax=20, ymax=20),
        page_idx=0,
        attributes={"tag": "D-1"}
    )

    updated_objs = linker.link_schedules_to_objects([door], [table])
    
    assert len(updated_objs) == 1
    matched_door = updated_objs[0]
    
    # Check that schedule row attributes are merged
    assert matched_door.schedule_ref == "door_schedule_row_0"
    assert matched_door.attributes["width"] == "36\""
    assert matched_door.attributes["height"] == "84\""
