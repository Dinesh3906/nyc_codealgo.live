from typing import List
from ..schemas.models import RetrievalCandidate
from ..config import settings

class Deduplicator:
    """
    Removes exact and near-duplicate text chunks using word-level Jaccard similarity,
    preserving the highest scoring candidates.
    """

    def _get_word_set(self, text: str) -> set:
        import re
        words = re.findall(r"\b\w{3,}\b", text.lower()) # words of length >= 3
        return set(words)

    def deduplicate_candidates(
        self,
        candidates: List[RetrievalCandidate]
    ) -> List[RetrievalCandidate]:
        """
        Filters out near-duplicate chunks based on Jaccard overlap limits.
        """
        deduplicated: List[RetrievalCandidate] = []
        accepted_word_sets: List[set] = []

        threshold = settings.DEDUP_JACCARD_THRESHOLD

        for c in candidates:
            c_words = self._get_word_set(c.chunk_text)
            
            # Check overlap against all already accepted candidate texts
            is_duplicate = False
            for accepted_set in accepted_word_sets:
                if not c_words or not accepted_set:
                    continue
                
                intersection = c_words.intersection(accepted_set)
                union = c_words.union(accepted_set)
                jaccard = len(intersection) / len(union)
                
                if jaccard >= threshold:
                    is_duplicate = True
                    break

            if not is_duplicate:
                deduplicated.append(c)
                accepted_word_sets.append(c_words)

        # Re-assign fusion rank indices after deduplication filtering
        for idx, item in enumerate(deduplicated):
            item.fusion_rank = idx + 1

        return deduplicated
