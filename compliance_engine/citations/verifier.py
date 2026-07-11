from typing import List, Dict, Any
from ..schemas.models import ComplianceFinding

class CitationVerifier:
    """
    Validates that all compliance citations are present in the retrieval registry
    and reject unsupported claims.
    """

    def verify_findings_citations(
        self,
        findings: List[ComplianceFinding],
        context_package: Dict[str, Any]
    ) -> List[ComplianceFinding]:
        """
        Cross-references citations and drops confidence or overrides to
        REQUIRES_HUMAN_REVIEW if citations are missing.
        """
        citations = context_package.get("citations", [])
        valid_citation_ids = {cit.get("citation_id") for cit in citations}

        for finding in findings:
            cit_id = finding.verified_citation_id
            
            if not cit_id or cit_id not in valid_citation_ids:
                # Mismatched or missing citation! Override to human review
                finding.decision = "REQUIRES_HUMAN_REVIEW"
                finding.confidence = 0.50
                finding.explanation += (
                    " WARNING: Citation mapping failed. "
                    "This compliance finding has no verified regulatory source chunk."
                )
                finding.recommendation = "Manually check the code book for verification."

        return findings
