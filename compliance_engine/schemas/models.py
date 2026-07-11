from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class ComplianceFinding(BaseModel):
    finding_id: str
    category: str # accessibility, egress, plumbing, fire
    component: str # door, stair, toilet, ramp
    decision: str # PASS, FAIL, WARNING, REQUIRES_HUMAN_REVIEW, UNKNOWN
    severity: str # HIGH, LOW, INFO
    measurement: str
    required_value: str
    actual_value: str
    difference: str
    applicable_code_book: str
    applicable_section: str
    verified_citation_id: Optional[str] = None
    evidence: str
    confidence: float
    explanation: str
    recommendation: str

class ComplianceReport(BaseModel):
    verdict: str # PASS, FAIL, WARNING, REQUIRES_HUMAN_REVIEW
    findings: List[ComplianceFinding] = Field(default_factory=list)
    overall_confidence: float = 1.0
    conflict_report: Dict[str, Any] = Field(default_factory=dict)
    explanation_summary: str

class ComplianceRequest(BaseModel):
    building_model: Dict[str, Any] # UBKM model output from Phase 6
    context_package: Dict[str, Any] # Context package from Phase 10
