import pytest
from autonomous_gov.approval.workflow import ApprovalWorkflowEngine

def test_workflow_state_transitions():
    engine = ApprovalWorkflowEngine()
    
    # 1. Initiate workflow
    state = engine.initiate_workflow("1109.2")
    assert state.stage == "PENDING_VAL"
    assert state.approvals["system_validation"] is False
    
    # 2. Validation pass
    state = engine.record_validation_pass(state.update_id)
    assert state.stage == "SME_REVIEW"
    assert state.approvals["system_validation"] is True
    
    # 3. SME approves
    state = engine.promote_to_stage(state.update_id, "sme_01", "SME", True)
    assert state.stage == "LEGAL_REVIEW"
    assert state.approvals["sme_review"] is True
    
    # 4. Legal approves -> promoted
    state = engine.promote_to_stage(state.update_id, "legal_01", "LEGAL", True)
    assert state.stage == "PROMOTED"
    assert state.approvals["legal_review"] is True

def test_workflow_rejection():
    engine = ApprovalWorkflowEngine()
    state = engine.initiate_workflow("1105.1")
    state = engine.record_validation_pass(state.update_id)
    
    # SME rejects
    state = engine.promote_to_stage(state.update_id, "sme_01", "SME", False)
    assert state.stage == "REJECTED"
    assert state.approvals["sme_review"] is False
