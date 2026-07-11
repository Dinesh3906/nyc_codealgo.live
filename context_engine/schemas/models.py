from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class ContextRequest(BaseModel):
    query: str
    building_model: Optional[Dict[str, Any]] = None
    evidence_package: Dict[str, Any] # EvidencePackage output from Phase 9
    template_type: str = "compliance_review"

class ContextPackage(BaseModel):
    query: str
    system_prompt: str
    user_prompt: str
    building_facts_summary: str
    evidence_groups: Dict[str, List[Dict[str, Any]]] = Field(default_factory=dict)
    citations: List[Dict[str, Any]] = Field(default_factory=list)
    conflict_metadata: Dict[str, Any] = Field(default_factory=dict)
    expected_output_schema: Dict[str, Any] = Field(default_factory=dict)
    validation_report: Dict[str, Any] = Field(default_factory=dict)
    confidence: float = 1.0
