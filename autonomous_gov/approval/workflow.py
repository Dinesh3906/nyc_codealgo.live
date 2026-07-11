from typing import Dict, Any, List
from ..schemas.models import ApprovalWorkflowState
import datetime
import uuid

class ApprovalWorkflowEngine:
    """
    Manages promotion lifecycle of new regulations from validation check to production staging.
    """

    def __init__(self):
        self.registry: Dict[str, ApprovalWorkflowState] = {}

    def initiate_workflow(self, section_id: str) -> ApprovalWorkflowState:
        """
        Registers an update and transitions to PENDING_VAL.
        """
        uid = str(uuid.uuid4())
        state = ApprovalWorkflowState(
            update_id=uid,
            section_id=section_id,
            stage="PENDING_VAL",
            approvals={"system_validation": False, "sme_review": False, "legal_review": False},
            timestamp=datetime.datetime.utcnow().isoformat() + "Z"
        )
        self.registry[uid] = state
        return state

    def record_validation_pass(self, update_id: str) -> ApprovalWorkflowState:
        state = self.registry.get(update_id)
        if not state:
            raise ValueError("Update ID not registered")
        
        state.approvals["system_validation"] = True
        state.stage = "SME_REVIEW"
        return state

    def promote_to_stage(
        self,
        update_id: str,
        reviewer_id: str,
        role: str,
        approve: bool
    ) -> ApprovalWorkflowState:
        """
        Promotes states through human sign-off checkpoints.
        """
        state = self.registry.get(update_id)
        if not state:
            raise ValueError("Update ID not registered")

        if role.upper() == "SME":
            state.approvals["sme_review"] = approve
            if approve:
                state.stage = "LEGAL_REVIEW"
            else:
                state.stage = "REJECTED"
        elif role.upper() == "LEGAL":
            state.approvals["legal_review"] = approve
            if approve and state.approvals.get("sme_review"):
                state.stage = "PROMOTED"
            else:
                state.stage = "REJECTED"

        return state
