from typing import List
from ..schemas.models import EvidenceChunk
from ..config import settings
from ..colbert.engine import ColbertEngine
from ..scoring.engine import EvidenceScorer
from ..diversity.engine import DiversityEngine
from retrieval.schemas.models import RetrievalCandidate

class RerankingPipeline:
    """
    Coordinates neural late interaction scoring, diversity pruning,
    dynamic backfill, and building code conflict detection.
    """

    def __init__(self):
        self.colbert = ColbertEngine()
        self.scorer = EvidenceScorer()
        self.diversity = DiversityEngine()

    def detect_conflicts(self, accepted: List[EvidenceChunk]) -> List[EvidenceChunk]:
        """
        Scans accepted chunks to flag revision year mismatches or conflicting requirements.
        """
        for i, chunk in enumerate(accepted):
            conflicts = []
            text_i = chunk.chunk_text.lower()
            
            for other in accepted:
                if other.chunk_id == chunk.chunk_id:
                    continue
                
                # Check for revision year difference on the same section
                if other.section == chunk.section and other.filename != chunk.filename:
                    conflicts.append({
                        "type": "superseded_version",
                        "description": f"Found different version of section {chunk.section} in file {other.filename}"
                    })

                # Check for contradictory numerical dimensions in same section
                # e.g. "44 inches" vs "36 inches"
                # If both are in the text but they contradict each other
                import re
                nums_i = set(re.findall(r"\b\d+\b", text_i))
                nums_other = set(re.findall(r"\b\d+\b", other.chunk_text.lower()))
                if chunk.section == other.section and nums_i != nums_other:
                    # Possible dimensional contradiction
                    conflicts.append({
                        "type": "dimensional_contradiction",
                        "description": f"Different dimensional values found for section {chunk.section}: {nums_i} vs {nums_other}"
                    })

            if conflicts:
                chunk.conflict_info = {
                    "has_conflict": True,
                    "conflicts": conflicts
                }

        return accepted

    def run_reranking_pipeline(
        self,
        query: str,
        candidates: List[RetrievalCandidate]
    ) -> List[EvidenceChunk]:
        """
        Runs the neural ranking, diversity selection, and backfill loop.
        """
        if not candidates:
            return []

        # 1. Compute ColBERT scores for all candidates
        scored_candidates: List[EvidenceChunk] = []
        for c in candidates:
            c_score = self.colbert.compute_late_interaction_score(query, c.chunk_text)
            scored_chunk = self.scorer.score_evidence(c, c_score)
            scored_candidates.append(scored_chunk)

        # 2. Greedy selection loop with dynamic diversity penalty & backfill
        accepted_chunks: List[EvidenceChunk] = []
        target_size = settings.TARGET_EVIDENCE_SIZE

        # Copy candidates list to manipulate scores dynamically
        remaining_candidates = list(scored_candidates)

        while len(accepted_chunks) < target_size and remaining_candidates:
            # Sort remaining by combined score descending
            remaining_candidates.sort(key=lambda x: x.combined_score, reverse=True)
            
            # Select highest scoring candidate
            best_chunk = remaining_candidates.pop(0)
            accepted_chunks.append(best_chunk)

            # Apply diversity penalties to the remaining candidates based on the new selection
            remaining_candidates = self.diversity.apply_diversity_penalties(
                remaining_candidates,
                accepted_chunks
            )

        # 3. Detect Conflicts
        final_chunks = self.detect_conflicts(accepted_chunks)

        return final_chunks
