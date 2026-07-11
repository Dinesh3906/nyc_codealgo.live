import re
from typing import List, Dict, Tuple, Optional
from document_ingestion.models import Page as IngestionPage, PageClassificationType
from ..models import PageClassificationType as SemanticClassificationType

class SheetClassifierEngine:
    """
    Extends simple page classifiers to perform detailed multi-label
    discipline and role classification of drawing sheets using text and coordinates.
    """

    DISCIPLINE_PREFIXES = {
        "A": PageClassificationType.FLOOR_PLAN,  # Architectural (default to floor plan initially)
        "S": PageClassificationType.STRUCTURAL,  # Structural
        "M": PageClassificationType.MEP,         # Mechanical
        "E": PageClassificationType.MEP,         # Electrical
        "P": PageClassificationType.MEP,         # Plumbing
        "FP": PageClassificationType.FIRE_PROTECTION,
        "FA": PageClassificationType.FIRE_PROTECTION,
        "C": PageClassificationType.UNKNOWN      # Civil
    }

    ROLE_KEYWORDS = {
        SemanticClassificationType.FLOOR_PLAN: [
            r"\bfloor\s*plan\b", r"\blevel\s*[0-9]\b", r"\bground\s*floor\b", r"\bfirst\s*floor\b",
            r"\bsecond\s*floor\b", r"\broof\s*plan\b", r"\bbasement\b"
        ],
        SemanticClassificationType.ELEVATION: [
            r"\belevation\b", r"\bnorth\s*elevation\b", r"\bsouth\s*elevation\b",
            r"\beast\s*elevation\b", r"\bwest\s*elevation\b"
        ],
        SemanticClassificationType.SECTION: [
            r"\bsection\b", r"\bcross\s*section\b", r"\bbuilding\s*section\b", r"\bwall\s*section\b"
        ],
        SemanticClassificationType.SCHEDULE: [
            r"\bschedule\b", r"\bdoor\s*schedule\b", r"\bwindow\s*schedule\b", r"\bfinish\s*schedule\b"
        ],
        SemanticClassificationType.LEGEND: [
            r"\blegend\b", r"\bsymbols\b", r"\babbreviations\b"
        ],
        SemanticClassificationType.NOTES: [
            r"\bgeneral\s*notes\b", r"\bspecifications\b", r"\bcode\s*compliance\b"
        ],
        SemanticClassificationType.COVER_SHEET: [
            r"\bcover\s*sheet\b", r"\btitle\s*sheet\b", r"\bdrawing\s*index\b"
        ],
        SemanticClassificationType.STRUCTURAL: [
            r"\bstructural\b", r"\bfoundation\s*plan\b", r"\bframing\s*plan\b", r"\bdetails\b"
        ],
        SemanticClassificationType.MEP: [
            r"\bmechanical\b", r"\belectrical\b", r"\bplumbing\b", r"\bhvac\b", r"\bpower\s*plan\b",
            r"\blighting\s*plan\b", r"\bpower\s*layout\b", r"\bplumbing\s*plan\b"
        ],
        SemanticClassificationType.FIRE_PROTECTION: [
            r"\bfire\s*protection\b", r"\bsprinkler\b", r"\bfire\s*alarm\b", r"\blife\s*safety\b"
        ]
    }

    def _extract_sheet_prefix(self, text: str) -> Optional[str]:
        """Looks for common sheet numbering formats (e.g. A-101, A101, SEC-01)."""
        # Look for sheet number tags (e.g. A-101, M-202)
        match = re.search(r"\b([A-Z]{1,2})[-_\s]*([0-9]{3})\b", text)
        if match:
            return match.group(1)
        return None

    def classify_sheet(self, page: IngestionPage) -> Tuple[List[SemanticClassificationType], Dict[SemanticClassificationType, float]]:
        """
        Classifies page into disciplines and roles using a combined heuristic of 
        sheet prefix identification and weighted keyword frequencies.
        """
        # Collect all text from vector and OCR streams
        texts = [t.text for t in page.text_objects] + [o.text for o in page.ocr_objects]
        combined_text = " ".join(texts)
        combined_text_lower = combined_text.lower()

        classifications: List[SemanticClassificationType] = []
        confidences: Dict[SemanticClassificationType, float] = {}

        # 1. Sheet Prefix Heuristic
        sheet_prefix = self._extract_sheet_prefix(combined_text)
        if sheet_prefix and sheet_prefix in self.DISCIPLINE_PREFIXES:
            discipline = self.DISCIPLINE_PREFIXES[sheet_prefix]
            # Map prefix discipline to semantic equivalent
            sem_disc = SemanticClassificationType(discipline.value)
            classifications.append(sem_disc)
            confidences[sem_disc] = 0.85

        # 2. Weighted Keyword Counts
        for role, patterns in self.ROLE_KEYWORDS.items():
            matches = 0
            for pattern in patterns:
                finds = re.findall(pattern, combined_text_lower)
                matches += len(finds)

            if matches > 0:
                score = min(0.50 + (0.15 * matches), 0.98)
                
                # If already set by prefix, boost confidence
                if role in classifications:
                    confidences[role] = max(confidences[role], score + 0.1)
                else:
                    classifications.append(role)
                    confidences[role] = score

        # Adjust and normalize list
        if not classifications:
            classifications.append(SemanticClassificationType.UNKNOWN)
            confidences[SemanticClassificationType.UNKNOWN] = 1.0

        # Sort classifications based on confidence
        classifications.sort(key=lambda c: confidences.get(c, 0.0), reverse=True)

        return classifications, confidences
