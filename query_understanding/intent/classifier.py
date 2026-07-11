from typing import List
from ..schemas.models import QueryIntent

class IntentClassifier:
    """
    Classifies regulatory query intent (e.g. accessibility review, fire review, lookup)
    using weighted keyword indices.
    """

    INTENT_KEYWORDS = {
        QueryIntent.COMPLIANCE_CHECK: ["check", "verify", "comply", "compliance", "satisfied", "meet", "requirement"],
        QueryIntent.CODE_LOOKUP: ["lookup", "section", "chapter", "find", "code book", "citation", "where does"],
        QueryIntent.CODE_INTERPRETATION: ["interpret", "explain", "meaning", "definition", "what is considered", "clarify"],
        QueryIntent.VIOLATION_ANALYSIS: ["violation", "fail", "non-compliant", "noncompliant", "error", "correct", "rejected"],
        QueryIntent.ACCESSIBILITY_REVIEW: ["wheelchair", "ada", "accessible", "turning", "clearance", "radius", "ramp", "slope"],
        QueryIntent.FIRE_REVIEW: ["fire", "sprinkler", "suppression", "smoke", "sd", "alarm", "extinguisher", "rating"],
        QueryIntent.MECHANICAL_REVIEW: ["hvac", "ventilation", "exhaust", "duct", "intake", "air flow"],
        QueryIntent.PLUMBING_REVIEW: ["toilet", "wc", "lavatory", "sink", "plumbing", "drain", "water closet"],
        QueryIntent.ELECTRICAL_REVIEW: ["electrical", "outlet", "panel", "wiring", "wire", "lighting", "circuit"]
    }

    def classify_intents(self, query: str) -> List[QueryIntent]:
        """
        Scans queries and assigns one or more matching intents.
        """
        query_lower = query.lower().strip()
        matched_intents: List[QueryIntent] = []

        for intent, kw_list in self.INTENT_KEYWORDS.items():
            for kw in kw_list:
                if kw in query_lower:
                    matched_intents.append(intent)
                    break

        # Fallback to general question if no specific intent matched
        if not matched_intents:
            matched_intents.append(QueryIntent.GENERAL_QUESTION)

        # Proactively bundle COMPLIANCE_CHECK if check is implied by reviews
        if any(i in matched_intents for i in (QueryIntent.ACCESSIBILITY_REVIEW, QueryIntent.FIRE_REVIEW, QueryIntent.PLUMBING_REVIEW, QueryIntent.MECHANICAL_REVIEW)):
            if QueryIntent.COMPLIANCE_CHECK not in matched_intents:
                matched_intents.append(QueryIntent.COMPLIANCE_CHECK)

        return matched_intents
