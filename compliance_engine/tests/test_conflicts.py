import pytest
from compliance_engine.schemas.models import ComplianceFinding
from compliance_engine.conflicts.resolution import ConflictResolver

def test_revision_conflict_override():
    resolver = ConflictResolver()
    
    finding = ComplianceFinding(
        finding_id="FIND-01", category="accessibility", component="toilet", decision="PASS",
        severity="INFO", measurement="WC clearance", required_value="60", actual_value="72",
        difference="12", applicable_code_book="Building Code", applicable_section="1109.2",
        verified_citation_id="CIT-01",
        evidence="wc clearance ok", confidence=1.0, explanation="ok", recommendation="none"
    )
    
    context = {
        "conflict_metadata": {
            "chunk_toilet_1": {
                "has_conflict": True,
                "description": "Conflict detected for section 1109.2 between 2014 and 2022 codes."
            }
        }
    }
    
    findings = [finding]
    conflict_report = resolver.resolve_conflicts(findings, context)
    
    assert conflict_report["has_conflicts"] is True
    # The finding decision should be overridden to human review due to the revision collision
    assert findings[0].decision == "REQUIRES_HUMAN_REVIEW"
