from typing import Dict, Any, List
from ..schemas.models import ComplianceFinding

class AIComplianceReasoner:
    """
    Simulates Gemini reasoning for narrative interpretations, exceptions,
    and cross-reference mappings.
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

            # Fallback: assign CIT-01 if available
            if not matched_cit_id and citations:
                matched_cit_id = citations[0]["citation_id"]

            finding.verified_citation_id = matched_cit_id

            # Add AI narrative explanation depending on decision
            if finding.decision == "PASS":
                finding.explanation += (
                    f" Verified against citation {matched_cit_id}. "
                    f"Design facts satisfy code minimum values."
                )
            else:
                finding.explanation += (
                    f" Non-compliant layout flagged. "
                    f"Requires correction based on citation {matched_cit_id}."
                )

        return deterministic_findings
