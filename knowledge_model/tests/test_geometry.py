import pytest
from knowledge_model.geometry.measurement_engine import MeasurementEngine

def test_scale_parsing():
    engine = MeasurementEngine()
    
    # 1/4" scale: 1 point = 0.666 inches
    assert round(engine.parse_scale_factor("1/4\" = 1'-0\""), 3) == 0.667
    # 1/8" scale: 1 point = 1.333 inches
    assert round(engine.parse_scale_factor("1/8\" = 1'-0\""), 3) == 1.333
    # Default fallback
    assert engine.parse_scale_factor(None) == 1.0

def test_space_metrics_calculations():
    engine = MeasurementEngine()
    
    # A box polygon of 200x200 pts
    poly_points = [[100, 100], [300, 100], [300, 300], [100, 300], [100, 100]]
    # Using scale 1/4" (factor = 0.6666)
    scale_factor = 2.0 / 3.0
    
    metrics = engine.calculate_space_metrics(poly_points, scale_factor)
    
    # Area = (200 * 2/3)^2 / 144 = 123.456 sq ft -> approx 123.46 sq ft
    assert metrics["area_sq_ft"] == 123.46
    
    # Perimeter = 800 * 2/3 / 12 = 44.44 ft
    assert metrics["perimeter_ft"] == 44.44
    
    # Turning clearance = 2 * centroid distance (100 pts) * 2/3 = 133.33 in
    assert metrics["turning_clearance_inches"] == 133.33
