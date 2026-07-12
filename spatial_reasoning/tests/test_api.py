from fastapi.testclient import TestClient
from spatial_reasoning.api.app import app

client = TestClient(app)

def test_health_check_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["status"] == "healthy"
    assert json_data["grounding"] == "GroundingEngine"

def test_graph_endpoint(mock_building_object_model):
    # Serialize SemanticBuildingObjectModel to dict
    payload = mock_building_object_model.model_dump()
    
    response = client.post("/graph", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["id"] == mock_building_object_model.id
    
    # Check graph properties
    nodes = data["nodes"]
    assert "room_f1" in nodes
    assert "wall_f1" in nodes
    assert "door_f1" in nodes
    assert "t_dim_1" in nodes  # Grounded annotation text node
    
    edges = data["edges"]
    rel_types = [e["rel_type"] for e in edges]
    assert "connected_to" in rel_types
    assert "bounds" in rel_types
    assert "measures" in rel_types       # Dimension link
    assert "connects_floors" in rel_types # Vertical alignment link
