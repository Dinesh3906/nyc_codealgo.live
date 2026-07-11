from typing import Dict, Any, List
from ..schemas.models import ChangeDelta, ImpactReport

class RegulatoryImpactAnalyzer:
    """
    Evaluates which active rule calculations, search queries,
    and drawings are affected by code changes.
    """

    def analyze_impact(
        self,
        delta: ChangeDelta
    ) -> ImpactReport:
        """
        Maps a text change to system dependencies.
        """
        affected_rules = []
        affected_queries = []
        severity = "LOW"

        # Check section mapping
        sec = delta.section_id
        if "1109" in sec:
            affected_rules.append("DeterministicRuleEngine.evaluate_wc_turning_clearance")
            affected_queries.append("Verify toilet turning clearances")
            affected_queries.append("Accessible bathroom layouts code check")
        elif "1105" in sec:
            affected_rules.append("DeterministicRuleEngine.evaluate_door_width")
            affected_queries.append("Door clear opening width verification")

        if "CRITICAL" in delta.diff_summary:
            severity = "HIGH"

        return ImpactReport(
            affected_rules=affected_rules,
            affected_queries=affected_queries,
            affected_drawings=["doc_wc_777", "permit_office_layout_v2"],
            severity=severity
        )
