from typing import List, Dict
from ..schemas.models import RetrievalCandidate
from ..config import settings

class RRFFusion:
    """
    Implements Reciprocal Rank Fusion (RRF) to merge and rank results
    from parallel semantic and lexical retrievers.
    """

    def fuse_results(
        self,
        pinecone_results: List[RetrievalCandidate],
        bm25_results: List[RetrievalCandidate]
    ) -> List[RetrievalCandidate]:
        """
        Merges two ranked lists of candidates using the RRF formula.
        """
        fused_map: Dict[str, RetrievalCandidate] = {}
        
        # Constant K and weights from settings
        k = settings.RRF_CONSTANT_K
        w_p = settings.RRF_PINECONE_WEIGHT
        w_b = settings.RRF_BM25_WEIGHT

        # 1. Process Pinecone ranked results
        for item in pinecone_results:
            c_id = item.chunk_id
            rank = item.pinecone_rank
            
            # RRF Score contribution
            score_contrib = w_p / (k + rank)
            
            # Set values
            item.fusion_score = score_contrib
            fused_map[c_id] = item

        # 2. Process BM25 ranked results
        for item in bm25_results:
            c_id = item.chunk_id
            rank = item.bm25_rank
            
            score_contrib = w_b / (k + rank)
            
            if c_id in fused_map:
                existing = fused_map[c_id]
                existing.bm25_rank = rank
                existing.fusion_score += score_contrib
                if "bm25" not in existing.retrieval_sources:
                    existing.retrieval_sources.append("bm25")
            else:
                item.fusion_score = score_contrib
                fused_map[c_id] = item

        # 3. Sort fused items by fusion score descending
        fused_list = list(fused_map.values())
        fused_list.sort(key=lambda x: x.fusion_score, reverse=True)

        # 4. Assign final fusion rank indices
        for idx, item in enumerate(fused_list):
            item.fusion_rank = idx + 1

        return fused_list
