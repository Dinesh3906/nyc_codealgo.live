import pytest
from document_ingestion.models import BoundingBox
from spatial_reasoning.models import BuildingGraph, BuildingGraphNode, BuildingGraphEdge

@pytest.fixture
def mock_building_graph():
    """Generates a mock Building Graph from Phase 5."""
    
    # Floor 1: Office Room (200x200 pts)
    # Centroid: (200, 200). Exterior: (100,100) to (300,300)
    # With scale 1/4" = 1'-0" (1 pt = 0.666 inches):
    # Width = 200 pts * 0.666 in = 133.33 in = 11.11 ft.
    # Height = 133.33 in = 11.11 ft.
    # Area = 123.4 sq ft.
    r1 = BuildingGraphNode(
        id="room_1", object_class="ROOM", page_idx=0,
        coordinates=BoundingBox(xmin=100.0, ymin=100.0, xmax=300.0, ymax=300.0),
        attributes={
            "room_name": "OFFICE 101",
            "polygon": [[100, 100], [300, 100], [300, 300], [100, 300], [100, 100]]
        }
    )

    # Wall bounding room
    w1 = BuildingGraphNode(
        id="wall_1", object_class="WALL", page_idx=0,
        coordinates=BoundingBox(xmin=100.0, ymin=100.0, xmax=300.0, ymax=100.0),
        attributes={"polygon": [[100.0, 100.0], [300.0, 100.0]]}
    )

    # Door (width 54 pts -> 36 inches -> 3.0 ft)
    d1 = BuildingGraphNode(
        id="door_1", object_class="DOOR", page_idx=0,
        coordinates=BoundingBox(xmin=140.0, ymin=95.0, xmax=194.0, ymax=105.0),
        attributes={"swing_direction": "out"}
    )

    # Smoke Detector inside room
    sd1 = BuildingGraphNode(
        id="sd_1", object_class="SMOKE_DETECTOR", page_idx=0,
        coordinates=BoundingBox(xmin=150.0, ymin=150.0, xmax=160.0, ymax=160.0),
        attributes={}
    )

    nodes = {
        "room_1": r1,
        "wall_1": w1,
        "door_1": d1,
        "sd_1": sd1
    }

    # Add edges
    edges = [
        BuildingGraphEdge(
            id="edge-1", source_id="door_1", target_id="room_1",
            rel_type="connected_to", confidence=0.95, reason="door connects room", evidence={}
        ),
        BuildingGraphEdge(
            id="edge-2", source_id="wall_1", target_id="room_1",
            rel_type="bounds", confidence=0.90, reason="wall bounds room", evidence={}
        ),
        BuildingGraphEdge(
            id="edge-3", source_id="sd_1", target_id="room_1",
            rel_type="located_in", confidence=0.98, reason="sd inside room", evidence={}
        )
    ]

    return BuildingGraph(
        id="mock_doc_777",
        nodes=nodes,
        edges=edges,
        metadata={"scale": "1/4\" = 1'-0\""}
    )
