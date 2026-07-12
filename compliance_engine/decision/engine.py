from typing import List, Dict, Any
from ..schemas.models import ComplianceReport, ComplianceFinding
from ..rules.deterministic import DeterministicRuleEngine
from ..reasoning.ai_engine import AIComplianceReasoner
from ..citations.verifier import CitationVerifier
from ..conflicts.resolution import ConflictResolver

class ComplianceDecisionEngine:
    """
    Main compliance orchestration engine fusing rule checks,
    AI explanations, and validation reports.
    """

    def __init__(self):
        self.rules = DeterministicRuleEngine()
        self.reasoner = AIComplianceReasoner()
        self.verifier = CitationVerifier()
        self.conflict_resolver = ConflictResolver()

    def generate_compliance_report(
        self,
        building_model: Dict[str, Any],
        context_package: Dict[str, Any]
    ) -> ComplianceReport:
        """
        Runs the full compliance evaluation pipeline.
        """
        query = context_package.get("query", "")

        # 1. Run deterministic rule evaluation
        findings = self.rules.evaluate_building_model(building_model, query)

        # 2. Enrich with deterministic narrative text
        findings = self.reasoner.generate_narrative_reasoning(query, context_package, findings)

        # 3. Verify citations
        findings = self.verifier.verify_findings_citations(findings, context_package)

        # 4. Resolve conflicts
        conflict_report = self.conflict_resolver.resolve_conflicts(findings, context_package)

        # 5. Fuse overall verdict
        if not findings:
            verdict = "REQUIRES_HUMAN_REVIEW"
            explanation_summary = "No implemented deterministic rules matched the query topic. Manual review required."
        else:
            decisions = {f.decision for f in findings}
            if "FAIL" in decisions:
                verdict = "FAIL"
                explanation_summary = "One or more quantitative measurements violated code limits."
            elif "REQUIRES_HUMAN_REVIEW" in decisions:
                verdict = "REQUIRES_HUMAN_REVIEW"
                explanation_summary = "Regulatory conflict or missing citation detected. Manual review required."
            elif "WARNING" in decisions:
                verdict = "WARNING"
                explanation_summary = "Compliance warning issued. Check exceptions and dimensions."
            else:
                verdict = "PASS"
                explanation_summary = "All building parameters conform to retrieved codes."

        # Calculate average confidence
        avg_confidence = sum(f.confidence for f in findings) / len(findings) if findings else 1.0

        return ComplianceReport(
            verdict=verdict,
            findings=findings,
            overall_confidence=round(avg_confidence, 2),
            conflict_report=conflict_report,
            explanation_summary=explanation_summary
        )
