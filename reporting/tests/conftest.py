import pytest

@pytest.fixture
def mock_compliance_report():
    """Generates a mock Compliance Report output from Phase 11."""
    return {
        "verdict": "FAIL",
        "overall_confidence": 0.85,
        "explanation_summary": "One or more quantitative measurements violated code limits.",
        "conflict_report": {},
        "findings": [
            {
                "finding_id": "FIND-001",
                "category": "accessibility",
                "component": "toilet",
                "decision": "PASS",
                "severity": "INFO",
                "measurement": "wheelchair turning radius",
                "required_value": "60.0 inches",
                "actual_value": "72.0 inches",
                "difference": "+12.0 inches",
                "applicable_code_book": "Building Code",
                "applicable_section": "1109.2",
                "verified_citation_id": "CIT-01",
                "evidence": "Restroom turning space is 72.0 inches.",
                "confidence": 1.0,
                "explanation": "Compliant toilet clearance.",
                "recommendation": "none"
            },
            {
                "finding_id": "FIND-002",
                "category": "accessibility",
                "component": "door",
                "decision": "FAIL",
                "severity": "HIGH",
                "measurement": "door clear opening width",
                "required_value": "32.0 inches",
                "actual_value": "28.0 inches",
                "difference": "-4.0 inches",
                "applicable_code_book": "Building Code",
                "applicable_section": "1105.1",
                "verified_citation_id": "CIT-02",
                "evidence": "Door clear opening measures 28.0 inches.",
                "confidence": 0.70,
                "explanation": "Non-compliant door width.",
                "recommendation": "Widen frame."
            }
        ]
    }

@pytest.fixture
def mock_project_metadata():
    """Generates mock project properties."""
    return {
        "project_name": "Empire State Office Complex",
        "address": "350 5th Ave, New York, NY 10118",
        "report_title": "Empire State Access Compliance Audit"
    }
