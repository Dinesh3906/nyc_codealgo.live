from typing import List, Dict, Any

class ExplainabilityEngine:
    """
    Translates raw findings data into concise, evidence-based explainability briefs.
    """

    def generate_explainability_briefs(
        self,
        findings: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Creates clean, human-readable explanations detailing which measurement met or failed code limits.
        """
        briefs = []
        for f in findings:
            f_id = f.get("finding_id")
            dec = f.get("decision")
            comp = f.get("component")
            meas = f.get("measurement")
            act = f.get("actual_value")
            req = f.get("required_value")
            diff = f.get("difference")
            sec = f.get("applicable_section")
            book = f.get("applicable_code_book")
            cit = f.get("verified_citation_id", "N/A")

            # Formulate narrative explanation
            if dec == "PASS":
                narrative = (
                    f"Compliance verified. The actual {meas} ({act}) satisfies the minimum required code clearance of {req} "
                    f"under {book} Section {sec} (difference: {diff}). Mapped to citation index {cit}."
                )
            elif dec == "FAIL":
                narrative = (
                    f"Non-compliance violation flagged. The actual {meas} ({act}) violates the code limit of {req} "
                    f"under {book} Section {sec} (difference: {diff}). Mapped to citation index {cit}."
                )
            else:
                narrative = (
                    f"Human review required. Mapped to section {sec} under {book} but requires manual check (difference: {diff})."
                )

            briefs.append({
                "finding_id": f_id,
                "component": comp,
                "measurement": meas,
                "decision": dec,
                "explainability_brief": narrative
            })

        return briefs
