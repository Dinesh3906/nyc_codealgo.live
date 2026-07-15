from rank_bm25 import BM25Okapi
from typing import List, Dict, Any, Optional
from ..schemas.models import RetrievalCandidate
from ..corpus import CorpusRecord, load_code_corpus

class BM25Retriever:
    """
    Production-grade BM25 lexical retriever.
    Tokenizes and indexes building code chunks for keyword and section lookups.
    """

    def __init__(self, corpus: Optional[List[CorpusRecord]] = None):
        self.corpus = corpus
        self.tokenized_corpus: List[List[str]] = []
        self.bm25: Optional[BM25Okapi] = None

    def _tokenize(self, text: str) -> List[str]:
        # Simple lowercase alphanumeric tokenization
        import re
        return re.findall(r"\b\w+\b", text.lower())

    def _ensure_index(self) -> None:
        if self.bm25 is not None and self.corpus is not None:
            return

        self.corpus = self.corpus or load_code_corpus()
        self.tokenized_corpus = [self._tokenize(item["chunk_text"]) for item in self.corpus]
        self.bm25 = BM25Okapi(self.tokenized_corpus)

    async def query_lexical_index(
        self,
        query: str,
        filters: Dict[str, Any],
        top_k: int = 5
    ) -> List[RetrievalCandidate]:
        """
        Executes a lexical BM25 search.
        Applies hard filters first, then ranks matched elements by BM25 score.
        """
        self._ensure_index()

        query_tokens = self._tokenize(query)
        
        # 1. Apply hard metadata filters
        filtered_corpus_indices = []
        
        for idx, item in enumerate(self.corpus or []):
            matches_filter = True
            for f_key, f_val in filters.items():
                item_val = item.get(f_key)
                if item_val and f_val and item_val != f_val:
                    if isinstance(item_val, str) and isinstance(f_val, str):
                        if item_val.lower() != f_val.lower():
                            matches_filter = False
                            break
                    else:
                        matches_filter = False
                        break
            
            if matches_filter:
                filtered_corpus_indices.append(idx)

        if not filtered_corpus_indices:
            return []

        # 2. Score using BM25
        if self.bm25 is None:
            return []

        scores = self.bm25.get_scores(query_tokens)

        # Zip scores with filtered corpus indices
        scored_items = []
        for original_idx in filtered_corpus_indices:
            score = float(scores[original_idx])
            tokenized_doc = self.tokenized_corpus[original_idx]
            has_term_match = any(token in tokenized_doc for token in query_tokens)
            if score < 0.0 or (score == 0.0 and not has_term_match):
                continue
            scored_items.append((score, self.corpus[original_idx]))

        # Sort by BM25 score descending
        scored_items.sort(key=lambda x: x[0], reverse=True)

        # 3. Build candidates
        candidates = []
        for idx, (score, item) in enumerate(scored_items[:top_k]):
            candidates.append(
                RetrievalCandidate(
                    chunk_id=item["chunk_id"],
                    chunk_text=item["chunk_text"],
                    document_id=item["document_id"],
                    filename=item["filename"],
                    page_number=item["page_number"],
                    code_book=item["code_book"],
                    chapter=item["chapter"],
                    section=item["section"],
                    subsection=item["subsection"],
                    discipline=item["discipline"],
                    occupancy_type=item["occupancy_type"],
                    jurisdiction=item["jurisdiction"],
                    revision_year=item["revision_year"],
                    bm25_rank=idx + 1,
                    fusion_score=0.0,
                    confidence=round(float(score), 3),
                    retrieval_sources=["bm25"]
                )
            )

        return candidates
