from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from ..schemas.models import ChangeDelta, ApprovalWorkflowState
from ..discovery.monitor import RegulationMonitor
from ..diff.semantic import SemanticDiffEngine
from ..approval.workflow import ApprovalWorkflowEngine
from typing import List

app = FastAPI(
    title="PermitIQ Autonomous Regulatory Intelligence API",
    description="Crawls building codes, highlights delta threshold shifts, and governs staged promotions",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Instantiate services
monitor = RegulationMonitor()
diff_engine = SemanticDiffEngine()
approval_workflow = ApprovalWorkflowEngine()

@app.post("/discovery/check", response_model=List[ChangeDelta], summary="Check Official Sources for Updates")
def run_discovery_poll():
    """
    Crawls code book links, detects modifications, and calculates semantic differences.
    """
    try:
        updates = monitor.check_for_source_updates()
        deltas = []
        for upd in updates:
            # Mock original text and new text for diffing
            old_txt = "WC turning clearance must be at least 60 inches in restroom."
            new_txt = "WC turning clearance must be at least 72 inches in restroom."
            
            delta = diff_engine.compute_semantic_diff(
                section_id=upd["section_affected"],
                old_text=old_txt,
                new_text=new_txt
            )
            deltas.append(delta)

            # Register in approval workflow
            wf = approval_workflow.initiate_workflow(delta.section_id)
            # Record initial validation pass
            approval_workflow.record_validation_pass(wf.update_id)

        return deltas
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Discovery poll failed: {str(e)}")

@app.post("/approval/promote", response_model=ApprovalWorkflowState, summary="Promote Update Stage")
def promote_update_stage(
    update_id: str,
    reviewer_id: str,
    role: str,
    approve: bool
):
    """
    Records human reviews and promotes to legal review or production promotion.
    """
    try:
        state = approval_workflow.promote_to_stage(
            update_id=update_id,
            reviewer_id=reviewer_id,
            role=role,
            approve=approve
        )
        return state
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Promotion failed: {str(e)}")

@app.get("/health", summary="Health check")
def health_check():
    return {
        "status": "healthy",
        "monitor": "RegulationMonitor",
        "diff_engine": "SemanticDiffEngine",
        "workflow": "ApprovalWorkflowEngine"
    }
