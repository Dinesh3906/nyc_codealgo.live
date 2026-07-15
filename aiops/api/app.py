from fastapi import FastAPI, HTTPException
from shared.cors import configure_cors
from ..schemas.models import GovernanceReport, FeedbackEntry
from ..registry.manager import RegistryManager
from ..learning.pipeline import ActiveLearningPipeline
from ..drift.detector import DriftDetector
from ..config import settings
from typing import Dict, Any
import json
from pathlib import Path

app = FastAPI(
    title="PermitIQ AIOps Governance API",
    description="Provides model registries tracking, active learning ingestion, and prompt drift checks",
    version="1.0.0"
)

configure_cors(app)

# Instantiate managers
registry = RegistryManager()
learning = ActiveLearningPipeline()
drift_service = DriftDetector()

class FeedbackPayload(FeedbackEntry):
    pass

def _load_embeddings(path_value: str, label: str):
    if not path_value:
        raise RuntimeError(f"{label} drift embeddings path is not configured.")

    path = Path(path_value)
    if not path.exists():
        raise RuntimeError(f"{label} drift embeddings file does not exist: {path}")

    with path.open("r", encoding="utf-8") as fh:
        payload = json.load(fh)

    embeddings = payload.get("embeddings") if isinstance(payload, dict) else payload
    if not isinstance(embeddings, list) or not embeddings:
        raise RuntimeError(f"{label} drift embeddings are empty or malformed.")
    return embeddings

@app.get("/governance", response_model=GovernanceReport, summary="Retrieve AI Governance Dashboard Report")
def get_governance_report():
    """
    Retrieves active system model registries, prompts versions, and drift alarms status.
    """
    models = registry.list_models()
    prompts = registry.list_prompts()
    
    try:
        baseline_embeddings = _load_embeddings(settings.DRIFT_BASELINE_EMBEDDINGS_PATH, "Baseline")
        current_embeddings = _load_embeddings(settings.DRIFT_CURRENT_EMBEDDINGS_PATH, "Current")
        drifted = drift_service.check_for_semantic_drift(
            baseline_embeddings=baseline_embeddings,
            current_embeddings=current_embeddings
        )
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Drift evidence unavailable: {str(e)}")

    hard_cases = len(learning.get_hard_examples())

    return GovernanceReport(
        active_models=models,
        active_prompts=prompts,
        drift_detected=drifted,
        hard_examples_count=hard_cases
    )

@app.post("/feedback", response_model=FeedbackEntry, summary="Submit SME Review and Corrections Feedback")
def submit_user_feedback(
    job_id: str,
    user_id: str,
    user_role: str,
    rating: int,
    corrections: Dict[str, Any]
):
    """
    Registers inspector corrections. Low ratings are flagged as Hard training Examples.
    """
    try:
        entry = learning.ingest_user_feedback(
            job_id=job_id,
            user_id=user_id,
            user_role=user_role,
            rating=rating,
            corrections=corrections
        )
        return entry
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to submit feedback: {str(e)}")

@app.get("/health", summary="Health check")
def health_check():
    return {
        "status": "healthy",
        "governance_engine": "RegistryManager",
        "drift_detector": "DriftDetector",
        "active_learning": "ActiveLearningPipeline"
    }
