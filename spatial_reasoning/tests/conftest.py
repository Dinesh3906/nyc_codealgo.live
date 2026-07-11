import pytest
from document_ingestion.models import BoundingBox
from object_detection.models import SemanticBuildingObjectModel, SemanticBuildingObject

@pytest.fixture
def mock_building_objects():
    """Generates a list of mock semantic building objects representing a 2-floor layout."""
    
    # Floor 1: Room, Wall, Door, Fire Extinguisher, Stair
    r1 = SemanticBuildingObject(
        id="room_f1", object_class="ROOM", page_idx=0,
        coordinates=BoundingBox(xmin=100, ymin=100, xmax=300, ymax=300),
        polygon=[[100, 100], [300, 100], [300, 300], [100, 300]],
        attributes={"room_name": "OFFICE 101"}
    )
    
    # Wall bounding room
    w1 = SemanticBuildingObject(
        id="wall_f1", object_class="WALL", page_idx=0,
        coordinates=BoundingBox(xmin=100, ymin=100, xmax=300, ymax=100),
        polygon=[[100, 100], [300, 100]]
    )

    # Door intersecting room boundary
    d1 = SemanticBuildingObject(
        id="door_f1", object_class="DOOR", page_idx=0,
        coordinates=BoundingBox(xmin=140, ymin=95, xmax=160, ymax=105),
        polygon=[[140, 95], [160, 95], [160, 105], [140, 105]]
    )

    # Fire Extinguisher inside room
    fe1 = SemanticBuildingObject(
        id="fe_f1", object_class="FIRE_EXTINGUISHER", page_idx=0,
        coordinates=BoundingBox(xmin=150, ymin=150, xmax=160, ymax=160),
        polygon=[[150, 150], [160, 150], [160, 160], [150, 160]]
    )

    # Stair for vertical circulation
    st1 = SemanticBuildingObject(
        id="stair_f1", object_class="STAIR", page_idx=0,
        coordinates=BoundingBox(xmin=250, ymin=250, xmax=280, ymax=280),
        polygon=[[250, 250], [280, 250], [280, 280], [250, 280]]
    )

    # Floor 2: Stair matching floor 1 coordinates for multi-sheet link check
    st2 = SemanticBuildingObject(
        id="stair_f2", object_class="STAIR", page_idx=1,
        coordinates=BoundingBox(xmin=252, ymin=252, xmax=282, ymax=282),
        polygon=[[252, 252], [282, 252], [282, 282], [252, 282]]
    )

    # Corridor room connecting stair
    c1 = SemanticBuildingObject(
        id="corr_f1", object_class="CORRIDOR", page_idx=0,
        coordinates=BoundingBox(xmin=240, ymin=240, xmax=290, ymax=290),
        polygon=[[240, 240], [290, 240], [290, 290], [240, 290]]
    )

    return [r1, w1, d1, fe1, st1, st2, c1]

@pytest.fixture
def mock_building_object_model(mock_building_objects):
    """Wraps mock building objects inside SemanticBuildingObjectModel payload."""
    
    # Mock raw text representing dimensions
    raw_texts = [
        {
            "id": "t_dim_1",
            "text": "12'-0\"",
            "coordinates": {"xmin": 200, "ymin": 90, "xmax": 220, "ymax": 98} # Parallel to wall_f1 (y=100)
        }
    ]

    return SemanticBuildingObjectModel(
        id="mock_doc_777",
        filename="project_set.pdf",
        objects=mock_building_objects,
        relationships=[],
        metadata={
            "text_objects": raw_texts,
            "geometry_objects": []
        }
    )
