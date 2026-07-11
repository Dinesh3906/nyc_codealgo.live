from pydantic import BaseModel, Field
from typing import List, Dict, Any

class ChangeDelta(BaseModel):
    section_id: str
    action: str # ADDED, REMOVED, MODIFIED
    old_text: str
    new_text: str
    diff_summary: str

class ImpactReport(BaseModel):
    affected_rules: List[str] = Field(default_factory=list)
    affected_queries: List[str] = Field(default_factory=list)
    affected_drawings: List[str] = Field(default_factory=list)
    severity: str # LOW, MEDIUM, HIGH

class ApprovalWorkflowState(BaseModel):
    update_id: str
    section_id: str
    stage: str # PENDING_VAL, SME_REVIEW, LEGAL_REVIEW, PROMOTED, REJECTED
    approvals: Dict[str, bool] = Field(default_factory=dict)
    timestamp: str
