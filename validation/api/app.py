from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from ..schemas.models import CertificationReport
from ..release.checklist import ReleaseChecklistAuditor

app = FastAPI(
    title="PermitIQ Enterprise Certification API",
    description="Fuses AI accuracy benchmarks, header security audits, load times, and chaos drill logs to certify releases",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

auditor = ReleaseChecklistAuditor()

@app.post("/certify", response_model=CertificationReport, summary="Compile Production Readiness Verification")
async def compile_certification_report(concurrency: int = 100):
    """
    Validates golden metrics F1, security headers, and loads times to
    certify the system state.
    """
    try:
        report = auditor.generate_certification_report(simulated_concurrency=concurrency)
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to compile certification: {str(e)}")

@app.get("/health", summary="Health check")
async def health_check():
    return {
        "status": "healthy",
        "validation_engine": "ReleaseChecklistAuditor",
        "benchmark_suite": "AIBenchmarkSuite",
        "security_audit": "SecurityAuditScanner"
    }
