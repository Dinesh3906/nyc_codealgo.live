from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from ..schemas.models import ComplianceRequest, ComplianceReport
from ..decision.engine import ComplianceDecisionEngine

app = FastAPI(
    title="PermitIQ Compliance Decision API",
    description="Fuses deterministic rule checks and neural reasoning to verify code compliance",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Instantiate engine
decision_helper = ComplianceDecisionEngine()

@app.post("/verify", response_model=ComplianceReport, summary="Verify Building Code Compliance")
async def verify_compliance(req: ComplianceRequest):
    """
    Executes quantitative checks, runs AI narrative reasoners, verifies citations,
    and returns a structured compliance audit report.
    """
    try:
        report = decision_helper.generate_compliance_report(
            req.building_model,
            req.context_package
        )
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate compliance report: {str(e)}")

@app.get("/health", summary="Health check")
async def health_check():
    return {
        "status": "healthy",
        "decision_engine": "ComplianceDecisionEngine",
        "rules_engine": "DeterministicRuleEngine",
        "citation_verifier": "CitationVerifier"
    }
