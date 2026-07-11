import pytest
from knowledge_model.fire.fire_protection_engine import FireProtectionEngine

def test_fire_device_densities():
    engine = FireProtectionEngine()
    
    # Area = 450 sq ft
    # 1 smoke detector (coverage: 450 sq ft <= 900 sq ft) -> True
    # 2 sprinklers (coverage: 225 sq ft <= 225 sq ft) -> True
    res = engine.analyze_room_fire_protection(450.0, 1, 2)
    assert res["smoke_detectors_satisfied"] is True
    assert res["sprinklers_satisfied"] is True
    
    # 0 smoke detectors -> False
    res = engine.analyze_room_fire_protection(450.0, 0, 2)
    assert res["smoke_detectors_satisfied"] is False

def test_exit_separation_checking():
    engine = FireProtectionEngine()
    
    # Room size 200x200 pts. Bounding diagonal = 282.8 pts
    # With scale factor = 0.5: Diagonal = 141.4 inches.
    # Required separation = 141.4 / 3 = 47.1 inches.
    room_poly = [[100, 100], [300, 100], [300, 300], [100, 300], [100, 100]]
    
    # Exits centroids: D1 (120, 100), D2 (280, 100) -> Dist = 160 pts -> 80 inches.
    # 80 inches >= 47.1 inches -> True
    exits = [(120, 100), (280, 100)]
    res = engine.verify_exit_separation(room_poly, exits, 0.5)
    assert res["exit_separation_satisfied"] is True
    
    # Exits centroids: D1 (120, 100), D2 (150, 100) -> Dist = 30 pts -> 15 inches.
    # 15 inches < 47.1 inches -> False
    exits_close = [(120, 100), (150, 100)]
    res = engine.verify_exit_separation(room_poly, exits_close, 0.5)
    assert res["exit_separation_satisfied"] is False
