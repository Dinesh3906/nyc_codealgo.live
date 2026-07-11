import re
from typing import List, Dict, Tuple
from ..models import PageClassificationType

class PageClassifier:
    """
    Classifies page roles (Floor Plan, Schedule, Legend, MEP, etc.)
    using dynamic keyword matching rules and frequency checks.
    Supports multi-label outputs.
    """

    CLASSIFICATION_RULES = {
        PageClassificationType.COVER_SHEET: [
            r"\bcover\s*sheet\b", r"\btitle\s*sheet\b", r"\bindex\s*of\s*drawings\b",
            r"\bproject\s*directory\b", r"\bdrawing\s*index\b"
        ],
        PageClassificationType.FLOOR_PLAN: [
            r"\bfloor\s*plan\b", r"\blevel\s*[0-9]\s*plan\b", r"\bground\s*floor\b",
            r"\bbasement\s*plan\b", r"\broof\s*plan\b", r"\bfirst\s*floor\b", r"\bsecond\s*floor\b"
        ],
        PageClassificationType.ELEVATION: [
            r"\belevation\b", r"\bnorth\s*elevation\b", r"\bsouth\s*elevation\b",
            r"\beast\s*elevation\b", r"\bwest\s*elevation\b", r"\bexterior\s*elevations\b"
        ],
        PageClassificationType.SECTION: [
            r"\bsection\b", r"\bcross\s*section\b", r"\bwall\s*section\b",
            r"\bbuilding\s*section\b", r"\blongitudinal\s*section\b"
        ],
        PageClassificationType.SCHEDULE: [
            r"\bschedule\b", r"\bdoor\s*schedule\b", r"\bwindow\s*schedule\b",
            r"\bfinish\s*schedule\b", r"\bequipment\s*schedule\b", r"\bluminative\s*schedule\b"
        ],
        PageClassificationType.LEGEND: [
            r"\blegend\b", r"\bsymbol\s*legend\b", r"\babbreviations\b",
            r"\bgraphic\s*symbols\b"
        ],
        PageClassificationType.NOTES: [
            r"\bgeneral\s*notes\b", r"\bspecification\s*notes\b", r"\bcode\s*compliance\b",
            r"\bcode\s*summary\b", r"\bbuilding\s*code\s*notes\b"
        ],
        PageClassificationType.STRUCTURAL: [
            r"\bstructural\b", r"\bfoundation\s*plan\b", r"\bframing\s*plan\b",
            r"\bcolumn\s*schedule\b", r"\breinforcement\s*details\b", r"\bconcrete\s*slab\b"
        ],
        PageClassificationType.MEP: [
            r"\bmechanical\b", r"\belectrical\b", r"\bplumbing\b", r"\bhvac\b",
            r"\bductwork\b", r"\blighting\s*plan\b", r"\bpower\s*plan\b", r"\bsingle\s*line\s*diagram\b"
        ],
        PageClassificationType.FIRE_PROTECTION: [
            r"\bfire\s*protection\b", r"\bsprinkler\s*plan\b", r"\bfire\s*alarm\b",
            r"\blife\s*safety\s*plan\b", r"\bfire\s*suppression\b"
        ]
    }

    def classify_page(self, text: str) -> Tuple[List[PageClassificationType], Dict[PageClassificationType, float]]:
        """
        Scans page text and returns a list of classification labels
        and their respective confidence scores.
        """
        text_lower = text.lower()
        classifications: List[PageClassificationType] = []
        confidences: Dict[PageClassificationType, float] = {}

        for label, patterns in self.CLASSIFICATION_RULES.items():
            matches = 0
            for pattern in patterns:
                finds = re.findall(pattern, text_lower)
                matches += len(finds)

            if matches > 0:
                # Calculate logarithmic scaling for confidence based on match count
                # 1 match = 0.70 confidence, 2+ matches = up to 0.98 confidence
                confidence = min(0.60 + (0.15 * matches), 0.98)
                classifications.append(label)
                confidences[label] = round(confidence, 2)

        # Fallback if no matching category found
        if not classifications:
            classifications.append(PageClassificationType.UNKNOWN)
            confidences[PageClassificationType.UNKNOWN] = 1.0

        return classifications, confidences
