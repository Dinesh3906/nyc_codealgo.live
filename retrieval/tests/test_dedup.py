import pytest
from retrieval.schemas.models import RetrievalCandidate
from retrieval.dedup.deduplicator import Deduplicator

def test_jaccard_deduplication():
    deduper = Deduplicator()
    
    # Chunk A and Chunk B are near duplicates (Jaccard >= 0.80)
    text_A = "stairways shall have a minimum width of 44 inches serving occupants."
    text_B = "stairways shall have a minimum width of 44 inches serving occupants also."

    cand_A = RetrievalCandidate(
        chunk_id="chunk_A", chunk_text=text_A, document_id="doc1", filename="f1",
        page_number=1, code_book="BC", chapter="C1", section="S1", jurisdiction="NYC",
        revision_year="2022", pinecone_rank=1, fusion_score=0.9
    )
    cand_B = RetrievalCandidate(
        chunk_id="chunk_B", chunk_text=text_B, document_id="doc1", filename="f1",
        page_number=1, code_book="BC", chapter="C1", section="S1", jurisdiction="NYC",
        revision_year="2022", pinecone_rank=2, fusion_score=0.8
    )

    fused = [cand_A, cand_B]
    deduped = deduper.deduplicate_candidates(fused)
    
    # Jaccard overlap between A and B is very high, so B should be dropped
    assert len(deduped) == 1
    assert deduped[0].chunk_id == "chunk_A"
