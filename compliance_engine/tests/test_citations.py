import pytest
from compliance_engine.schemas.models import ComplianceFinding
from compliance_engine.citations.verifier import CitationVerifier

def test_citation_verification_mismatch():
    verifier = CitationVerifier()
    
    finding = ComplianceFinding(
        finding_id="FIND-01", category="egress", component="stair", decision="PASS",
        severity="INFO", measurement="width", required_value="44", actual_value="44",
        difference="0", applicable_code_book="Building Code", applicable_section="1011.2",
        verified_citation_id="CIT-99", # CIT-99 does not exist in context package!
        evidence="stair width check", confidence=1.0, explanation="ok", recommendation="none"
    )
    
    context = {"citations": [{"citation_id": "CIT-01", "code_book": "BC", "section": "1011.2"}]}
    
    verified = verifier.verify_findings_citations([finding], context)
    
    # Mismatch should demote to human review and drop confidence
    assert verified[0].decision == "REQUIRES_HUMAN_REVIEW"
    assert verified[0].confidence == 0.50
