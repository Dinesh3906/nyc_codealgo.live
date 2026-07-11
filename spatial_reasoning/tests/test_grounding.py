import pytest
from spatial_reasoning.grounding.engine import GroundingEngine

def test_dimension_grounding(mock_building_object_model):
    engine = GroundingEngine()
    
    links = engine.ground_annotations(
        mock_building_object_model.objects,
        mock_building_object_model.metadata["text_objects"],
        []
    )
    
    assert len(links) == 1
    text_id, object_id, confidence, details = links[0]
    
    assert text_id == "t_dim_1"
    assert object_id == "wall_f1"
    assert confidence > 0.70
    assert details["text_val"] == "12'-0\""
