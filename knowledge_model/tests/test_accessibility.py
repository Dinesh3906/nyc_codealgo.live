import pytest
from knowledge_model.accessibility.accessibility_engine import AccessibilityEngine

def test_room_turning_clearance():
    engine = AccessibilityEngine()
    
    # Needs turning space (e.g. toilet)
    # 72 inches clearance >= 60 inches limit -> True
    doors = [{"width_inches": 36.0}]
    res = engine.evaluate_room_accessibility("Restroom", 72.0, doors)
    assert res["turning_clearance_satisfied"] is True
    assert res["accessible"] is True

    # 48 inches clearance < 60 inches limit -> False
    res = engine.evaluate_room_accessibility("Restroom", 48.0, doors)
    assert res["turning_clearance_satisfied"] is False
    assert res["accessible"] is False

def test_ramp_slopes():
    engine = AccessibilityEngine()
    
    # 6% slope <= 8.33% -> True
    res = engine.evaluate_ramp_accessibility(6.0)
    assert res["accessible"] is True
    
    # 10% slope > 8.33% -> False
    res = engine.evaluate_ramp_accessibility(10.0)
    assert res["accessible"] is False
