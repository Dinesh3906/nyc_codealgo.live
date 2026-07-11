import pytest
from knowledge_model.occupancy.occupancy_engine import OccupancyEngine

def test_occupancy_classification():
    engine = OccupancyEngine()
    
    assert engine.determine_classification("ROOM OFFICE 102") == "business"
    assert engine.determine_classification("CLASSROOM 301") == "educational_classroom"
    assert engine.determine_classification("STORAGE CLOSETS") == "storage"

def test_occupant_load_factor_math():
    engine = OccupancyEngine()
    
    # Office (Business factor = 100 sq ft)
    # Area = 150 sq ft -> Load = ceiling(150 / 100) = 2 people
    res = engine.calculate_occupancy_load(150.0, "business")
    assert res["occupant_load"] == 2
    assert res["required_exit_width_inches"] == 0.4 # 2 * 0.2 in
    
    # Classroom (educational_classroom factor = 20 sq ft)
    # Area = 150 sq ft -> Load = ceiling(150 / 20) = 8 people
    res = engine.calculate_occupancy_load(150.0, "educational_classroom")
    assert res["occupant_load"] == 8
