from typing import Dict, Any, List
from ..schemas.models import ComplianceFinding

class AIComplianceReasoner:
    """
    Deterministic narrative enricher. This class does not call an LLM; it only
    attaches citation references and plain explanations to rule-engine findings.
    """

    def generate_narrative_reasoning(
        self,
        query: str,
        context_package: Dict[str, Any],
        deterministic_findings: List[ComplianceFinding]
    ) -> List[ComplianceFinding]:
        """
        Enhances findings with narrative code explanations and exception context.
        """
        citations = context_package.get("citations", [])
        
        # Link findings to citation IDs
        for finding in deterministic_findings:
            # Try to match finding section and book to citation
            matched_cit_id = None
            for cit in citations:
                if (cit.get("section") == finding.applicable_section and 
                    cit.get("code_book") == finding.applicable_code_book):
                    matched_cit_id = cit.get("citation_id")
                    break

            finding.verified_citation_id = matched_cit_id

            citation_phrase = f"citation {matched_cit_id}" if matched_cit_id else "no matching citation"
            if finding.decision == "PASS":
                finding.explanation += (
                    f" Verified against {citation_phrase}. "
                    f"Design facts satisfy code minimum values."
                )
            else:
                finding.explanation += (
                    f" Non-compliant layout flagged. "
                    f"Requires correction based on {citation_phrase}."
                )

        return deterministic_findings
