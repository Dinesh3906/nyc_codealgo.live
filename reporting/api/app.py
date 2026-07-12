from fastapi import FastAPI, HTTPException
from shared.cors import configure_cors
from ..schemas.models import ReportRequest, ExportedReport
from ..report_engine.engine import ReportEngine
from ..audit.logger import AuditLogger
from ..exports.writer import ExportWriter
import datetime

app = FastAPI(
    title="PermitIQ Compliance Reporting API",
    description="Wraps compliance audits into styled engineering layouts and exports",
    version="1.0.0"
)

configure_cors(app)

# Instantiate engines
engine_helper = ReportEngine()
audit_helper = AuditLogger()
writer_helper = ExportWriter()

@app.post("/report", response_model=ExportedReport, summary="Build Compliance Report Packages")
async def generate_compliance_report_package(req: ReportRequest):
    """
    Renders compliance scorecards, generates Markdown/HTML summaries,
    registers reproducible audit trails, and formats downloads.
    """
    try:
        report_data = req.compliance_report
        findings = report_data.get("findings", [])
        verdict = report_data.get("verdict", "UNKNOWN")

        # 1. Compile scorecards & summaries
        scorecard = engine_helper.generate_findings_scorecard(findings)
        exec_summary = engine_helper.generate_executive_summary(
            verdict,
            scorecard,
            req.project_metadata
        )

        # 2. Build audit trail logs
        audit_trail = audit_helper.generate_audit_trail(report_data, req.project_metadata)

        # 3. Render exports
        report_title = req.project_metadata.get("report_title", "PermitIQ Compliance Audit Report")
        
        md_text = writer_helper.render_markdown(report_title, verdict, exec_summary, findings)
        html_text = writer_helper.render_html(report_title, verdict, exec_summary, scorecard, findings)
        csv_text = writer_helper.render_csv(findings)

        timestamp = datetime.datetime.utcnow().isoformat() + "Z"

        return ExportedReport(
            report_title=report_title,
            verdict=verdict,
            executive_summary=exec_summary,
            findings_scorecard=scorecard,
            html_report=html_text,
            markdown_report=md_text,
            csv_report=csv_text,
            audit_trail=audit_trail,
            confidence=report_data.get("overall_confidence", 1.0),
            timestamp=timestamp
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate report package: {str(e)}")

@app.get("/health", summary="Health check")
async def health_check():
    return {
        "status": "healthy",
        "report_engine": "ReportEngine",
        "export_writer": "ExportWriter",
        "audit_logger": "AuditLogger"
    }
