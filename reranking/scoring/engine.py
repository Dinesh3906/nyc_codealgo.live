from typing import Dict, Any, List
from ..schemas.models import EvidenceChunk
from ..config import settings
from retrieval.schemas.models import RetrievalCandidate

class EvidenceScorer:
    """
    Combines neural (ColBERT), lexical/fusion (RRF), and metadata metrics
    to assign a final unified compliance evidence score.
    """

    def identify_coverage_type(self, text: str) -> str:
        """
        Determines the regulatory category of a text chunk.
        """
        text_lower = text.lower()
        if "except" in text_lower or "exception" in text_lower or "shall not apply" in text_lower:
            return "exception"
        elif "definition" in text_lower or "means" in text_lower or "shall mean" in text_lower:
            return "definition"
        elif "refer to" in text_lower or "see section" in text_lower or "in accordance with" in text_lower:
            return "cross_reference"
        return "primary_requirement"

    def score_evidence(
        self,
        candidate: RetrievalCandidate,
        colbert_score: float
    ) -> EvidenceChunk:
        """
        Calculates unified scoring margins.
        """
        w_c = settings.COLBERT_WEIGHT
        w_r = settings.RRF_WEIGHT
        w_m = settings.METADATA_WEIGHT

        # Normalize RRF Score (fused score is usually < 0.1, we scale by 10 to normalize)
        normalized_rrf = min(1.0, candidate.fusion_score * 30.0)

        # Base metadata confidence
        metadata_confidence = candidate.confidence

        # Combined calculation
        combined_score = (colbert_score * w_c) + (normalized_rrf * w_r) + (metadata_confidence * w_m)
        combined_score = round(combined_score, 4)

        cov_type = self.identify_coverage_type(candidate.chunk_text)

        reason = (
            f"Strong token alignment (ColBERT: {colbert_score}) and fused metadata weight "
            f"(RRF: {round(candidate.fusion_score, 3)}). Classified as {cov_type}."
        )

        return EvidenceChunk(
            chunk_id=candidate.chunk_id,
            chunk_text=candidate.chunk_text,
            document_id=candidate.document_id,
            filename=candidate.filename,
            page_number=candidate.page_number,
            code_book=candidate.code_book,
            chapter=candidate.chapter,
            section=candidate.section,
            subsection=candidate.subsection,
            colbert_score=colbert_score,
            combined_score=combined_score,
            selection_reason=reason,
            coverage_type=cov_type,
            conflict_info={}
        )
