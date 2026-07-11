import pytest
from fastapi.testclient import TestClient
from knowledge_model.api.app import app

client = TestClient(app)

def test_health_check_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["status"] == "healthy"
    assert json_data["ifc_alignment"] == "light IFC"

def test_knowledge_endpoint(mock_building_graph):
    # Serialize BuildingGraph to dict
    payload = mock_building_graph.dict()
    
    response = client.post("/knowledge", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    
    # Verify calculated metrics
    assert "total_occupant_load" in data["calculated_metrics"]
    assert "total_area_sq_ft" in data["calculated_metrics"]
    
    # Storey checking
    storey = data["project"]["storeys"]["storey-0"]
    assert storey["name"] == "Floor Level 1"
    
    space = storey["spaces"]["room_1"]
    assert space["space_type"] == "ROOM"
    assert space["name"] == "OFFICE 101"
    
    # Measurements checking
    assert space["area_sq_feet"] == 123.46
    assert space["perimeter_feet"] == 44.44
    assert space["occupancy_classification"] == "business"
    assert space["occupant_load"] == 2
    
    # Nested door checking (width 54 pts * 2/3 = 36 inches)
    assert len(space["doors"]) == 1
    door = space["doors"][0]
    assert door["id"] == "door_1"
    assert door["width_inches"] == 36.0
    assert door["accessible"] is True
    
    # Sensor checking
    assert len(space["sensors"]) == 1
    sensor = space["sensors"][0]
    assert sensor["sensor_type"] == "SMOKE_DETECTOR"
