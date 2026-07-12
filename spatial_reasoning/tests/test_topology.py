from spatial_reasoning.topology.engine import TopologyEngine

def test_topological_relationship_extraction(mock_building_objects):
    engine = TopologyEngine()
    
    # Extract page 0 (Floor 1) relations
    edges = engine.extract_topological_relations(mock_building_objects, 0)
    
    rel_types = [e.rel_type for e in edges]
    assert "connected_to" in rel_types # door_f1 to room_f1
    assert "bounds" in rel_types       # wall_f1 bounds room_f1
    assert "located_in" in rel_types    # fe_f1 in room_f1
    
    # Check door connection specifics
    door_edge = next(e for e in edges if e.rel_type == "connected_to")
    assert door_edge.source_id == "door_f1"
    assert door_edge.target_id == "room_f1"

def test_multi_sheet_vertical_alignment(mock_building_objects):
    engine = TopologyEngine()
    
    edges = engine.extract_multi_sheet_links(mock_building_objects)
    
    assert len(edges) == 1
    edge = edges[0]
    assert edge.rel_type == "connects_floors"
    assert edge.source_id == "stair_f1"
    assert edge.target_id == "stair_f2"
