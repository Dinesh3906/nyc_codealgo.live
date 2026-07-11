from typing import List, Dict, Any
from ..schemas.models import ComplianceFinding

class ConflictResolver:
    """
    Handles regulatory conflicts (different revision years, multiple jurisdictions)
    and reports them in the final compliance package.
    """

    def resolve_conflicts(
        self,
        findings: List[ComplianceFinding],
        context_package: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Scans context package conflict metadata and builds a conflict report.
        If a finding is affected by a conflict, updates its decision.
        """
        conflict_metadata = context_package.get("conflict_metadata", {})
        
        conflict_report = {}
        if conflict_metadata:
            conflict_report = {
                "has_conflicts": True,
                "sections_affected": list(conflict_metadata.keys()),
                "details": conflict_metadata
            }

            # Update findings affected by conflicts
            for finding in findings:
                # If finding section is inside the conflicts dictionary
                for c_id, conf in conflict_metadata.items():
                    # We check if section is mentioned in the description
                    if finding.applicable_section in conf.get("description", ""):
                        finding.decision = "REQUIRES_HUMAN_REVIEW"
                        finding.severity = "HIGH"
                        finding.explanation += (
                            f" WARNING: A regulatory version conflict was detected for section "
                            f"{finding.applicable_section}. Resolving requires manual audit."
                        )

        return conflict_report
