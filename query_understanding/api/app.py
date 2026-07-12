from fastapi import FastAPI, HTTPException
from shared.cors import configure_cors
from pydantic import BaseModel
from typing import Optional, Dict, Any
from ..schemas.models import ComplianceRetrievalPlan
from ..retrieval_planner.planner import ComplianceRetrievalPlanner

app = FastAPI(
    title="PermitIQ Query Understanding & Retrieval Planner API",
    description="Parses compliance queries, extracts intents/entities, and constructs retrieval plans",
    version="1.0.0"
)

configure_cors(app)

class PlanRequest(BaseModel):
    query: str
    knowledge_model: Optional[Dict[str, Any]] = None

# Instantiate planner
planner_helper = ComplianceRetrievalPlanner()

@app.post("/plan", response_model=ComplianceRetrievalPlan, summary="Generate Compliance Retrieval Plan")
async def generate_retrieval_plan(req: PlanRequest):
    """
    Parses user queries and constructs the hard/soft metadata filters,
    applicable code sections, and search strategies.
    """
    try:
        plan = planner_helper.generate_retrieval_plan(
            req.query,
            req.knowledge_model
        )
        return plan
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate retrieval plan: {str(e)}")

@app.get("/health", summary="Health check")
async def health_check():
    return {
        "status": "healthy",
        "planner": "ComplianceRetrievalPlanner",
        "ontology": "OntologyEngine"
    }
