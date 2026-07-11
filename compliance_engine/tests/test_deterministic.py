import pytest
from compliance_engine.rules.deterministic import DeterministicRuleEngine

def test_restroom_clearance_pass(mock_building_model_pc):
    engine = DeterministicRuleEngine()
    
    findings = engine.evaluate_building_model(mock_building_model_pc, "Verify toilet clearances")
    
    # Restroom clearance 72 inches (PASS) and door width 36 inches (PASS)
    assert len(findings) == 2
    assert findings[0].decision == "PASS"
    assert findings[1].decision == "PASS"

def test_restroom_clearance_fail(mock_building_model_fail):
    engine = DeterministicRuleEngine()
    
    findings = engine.evaluate_building_model(mock_building_model_fail, "Verify toilet clearances")
    
    # Restroom clearance 48 inches (FAIL) and door width 28 inches (FAIL)
    assert len(findings) == 2
    assert findings[0].decision == "FAIL"
    assert findings[0].severity == "HIGH"
    assert findings[1].decision == "FAIL"
    assert findings[1].severity == "HIGH"
