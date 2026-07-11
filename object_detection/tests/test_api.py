import pytest
from fastapi.testclient import TestClient
from object_detection.api.app import app

client = TestClient(app)

def test_health_check_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["status"] == "healthy"
    assert json_data["detector"] == "GeometryBuildingDetector"

def test_detect_endpoint(mock_semantic_document):
    # Serialize SemanticDocumentModel to dict
    payload = mock_semantic_document.dict()
    
    response = client.post("/detect", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["id"] == mock_semantic_document.id
    
    # Verify detected building objects
    objects = data["objects"]
    classes = [o["object_class"] for o in objects]
    
    assert "ROOM" in classes
    assert "WALL" in classes
    assert "DOOR" in classes
    assert "SMOKE_DETECTOR" in classes  # Symbol recognizer
    
    # Check that room name was associated
    room = next(o for o in objects if o["object_class"] == "ROOM")
    assert room["attributes"]["room_name"] == "OFFICE 101"
    
    # Check that door schedule was linked
    door = next(o for o in objects if o["object_class"] == "DOOR")
    assert door["schedule_ref"] == "door_schedule_row_0"
    assert door["attributes"]["width"] == "36\""
    
    # Verify relationships
    assert len(data["relationships"]) == 2  # door is IN_ROOM, SD is IN_ROOM
    rel_types = [r["rel_type"] for r in data["relationships"]]
    assert "in_room" in rel_types
