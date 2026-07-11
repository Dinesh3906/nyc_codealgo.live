from typing import List
from ..schemas.models import RetrievalCandidate

class RetrievalConfidenceEvaluator:
    """
    Evaluates semantic score averages, lexical margins, and search coverage
    to assign an overall confidence score (0.0 to 1.0) to the retrieved evidence.
    """

    def calculate_confidence(
        self,
        candidates: List[RetrievalCandidate],
        query: str
    ) -> float:
        """
        Computes overall confidence. Evaluates term overlap agreement between
        the semantic Pinecone search and BM25 lexical matches.
        """
        if not candidates:
            return 0.0

        # 1. Semantic average confidence
        # Filter items that came from Pinecone
        pinecone_scores = [c.confidence for c in candidates if "pinecone" in c.retrieval_sources]
        avg_semantic = sum(pinecone_scores) / len(pinecone_scores) if pinecone_scores else 0.5

        # 2. Source Agreement overlap
        # Fraction of top candidates that were found by both systems
        overlap_count = sum(1 for c in candidates if "pinecone" in c.retrieval_sources and "bm25" in c.retrieval_sources)
        agreement_factor = overlap_count / len(candidates) if candidates else 0.0

        # Weighted calculation
        # If both semantic scores are high and they agree on results, confidence is near 1.0
        overall_confidence = (avg_semantic * 0.70) + (agreement_factor * 0.30)
        overall_confidence = min(1.0, max(0.20, overall_confidence))

        return round(overall_confidence, 2)
