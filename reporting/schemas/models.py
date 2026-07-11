from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class ReportRequest(BaseModel):
    compliance_report: Dict[str, Any] # Output of ComplianceDecisionEngine
    template_type: str = "full_compliance" # full_compliance, accessibility, fire_safety, plumbing
    project_metadata: Dict[str, Any] = Field(default_factory=dict)

class ExportedReport(BaseModel):
    report_title: str
    verdict: str
    executive_summary: str
    findings_scorecard: Dict[str, int] = Field(default_factory=dict)
    html_report: str
    markdown_report: str
    csv_report: str
    audit_trail: Dict[str, Any] = Field(default_factory=dict)
    confidence: float
    timestamp: str
