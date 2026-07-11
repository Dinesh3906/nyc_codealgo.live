import pytest
from autonomous_gov.impact.analyzer import RegulatoryImpactAnalyzer
from autonomous_gov.schemas.models import ChangeDelta

def test_regulatory_impact_accessibility():
    analyzer = RegulatoryImpactAnalyzer()
    
    delta = ChangeDelta(
        section_id="1109.2",
        action="MODIFIED",
        old_text="60 inches WC turn",
        new_text="72 inches WC turn",
        diff_summary="CRITICAL: shifted from 60.0 to 72.0"
    )
    
    report = analyzer.analyze_impact(delta)
    
    # Restroom edits map to restroom rule calculations and layout drawings
    assert len(report.affected_rules) == 1
    assert "DeterministicRuleEngine.evaluate_wc_turning_clearance" in report.affected_rules
    assert len(report.affected_queries) == 2
    assert "Verify toilet turning clearances" in report.affected_queries
    assert report.severity == "HIGH"
