from typing import Dict, Any, List

class ReportEngine:
    """
    Orchestrates executive summaries, scorecards, and metadata templates.
    """

    def generate_findings_scorecard(
        self,
        findings: List[Dict[str, Any]]
    ) -> Dict[str, int]:
        """
        Counts findings by decision status.
        """
        scorecard = {
            "PASS": 0,
            "FAIL": 0,
            "WARNING": 0,
            "REQUIRES_HUMAN_REVIEW": 0,
            "UNKNOWN": 0
        }

        for f in findings:
            dec = f.get("decision", "UNKNOWN")
            if dec in scorecard:
                scorecard[dec] += 1
            else:
                scorecard["UNKNOWN"] += 1

        return scorecard

    def generate_executive_summary(
        self,
        verdict: str,
        scorecard: Dict[str, int],
        metadata: Dict[str, Any]
    ) -> str:
        """
        Builds a professional executive summary text based on scorecard counts.
        """
        proj_name = metadata.get("project_name", "Building Project")
        address = metadata.get("address", "Unknown Location")
        
        passed_count = scorecard.get("PASS", 0)
        failed_count = scorecard.get("FAIL", 0)
        review_count = scorecard.get("REQUIRES_HUMAN_REVIEW", 0)
        warn_count = scorecard.get("WARNING", 0)

        summary = (
            f"PermitIQ automated compliance auditing was completed for '{proj_name}' located at {address}. "
            f"The overall compliance audit verdict is assessed as '{verdict}'. "
            f"A total of {passed_count} checks successfully passed. "
        )

        if failed_count > 0:
            summary += f"CRITICAL: {failed_count} violations were detected which violate building code specifications. "
        if review_count > 0:
            summary += f"WARNING: {review_count} items require human reviewer assessment due to revision years conflicts or missing citation data. "
        if warn_count > 0:
            summary += f"Notice: {warn_count} warning findings were flagged during the audit. "

        if verdict == "PASS":
            summary += "The current plan design conforms to retrieved regulations and is recommended for submission."
        else:
            summary += "Plan revisions are required to resolve flagged non-compliant layout dimensions."

        return summary
