from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class ModelEntry(BaseModel):
    model_name: str
    version: str
    owner: str
    approval_status: str # APPROVED, DEPRECATED, CANARY, SHADOW
    description: str
    last_tested: str

class PromptEntry(BaseModel):
    prompt_id: str
    version: str
    template: str
    active: bool
    creator: str
    avg_user_accuracy: float

class FeedbackEntry(BaseModel):
    feedback_id: str
    job_id: str
    user_id: str
    user_role: str # SME, Architect, Inspector
    rating: int # 1 to 5
    corrections: Dict[str, Any] = Field(default_factory=dict)
    is_hard_example: bool = False
    timestamp: str

class GovernanceReport(BaseModel):
    active_models: List[ModelEntry] = Field(default_factory=list)
    active_prompts: List[PromptEntry] = Field(default_factory=list)
    drift_detected: bool
    hard_examples_count: int
