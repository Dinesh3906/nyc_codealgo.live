from typing import List, Set
from ..schemas.models import EvidenceChunk
from ..config import settings

class DiversityEngine:
    """
    Penalizes duplicate sections, pages, or chapters to ensure
    diversity in context packages while exempting definitions and exceptions.
    """

    def apply_diversity_penalties(
        self,
        candidates: List[EvidenceChunk],
        accepted_chunks: List[EvidenceChunk]
    ) -> List[EvidenceChunk]:
        """
        Subtracts penalties from candidate scores if their sections or chapters
        are already present in accepted evidence.
        """
        accepted_sections: Set[str] = {c.section for c in accepted_chunks}
        accepted_pages: Set[int] = {c.page_number for c in accepted_chunks}


        sec_p = settings.DIVERSITY_SECTION_PENALTY
        page_p = settings.DIVERSITY_PAGE_PENALTY

        for c in candidates:
            # Check for definitions and exceptions exemptions
            text_lower = c.chunk_text.lower()
            is_exempt = "exception" in text_lower or "except" in text_lower or "definition" in text_lower or "shall not apply" in text_lower

            if is_exempt:
                # No diversity penalty
                continue

            penalty = 0.0
            if c.section in accepted_sections:
                penalty += sec_p
            if c.page_number in accepted_pages:
                penalty += page_p

            # Apply penalty to combined score
            c.combined_score = round(max(0.0, c.combined_score - penalty), 4)

        return candidates
