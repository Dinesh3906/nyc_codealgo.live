import pytest
from retrieval.bm25.engine import BM25Retriever

@pytest.mark.anyio
async def test_bm25_retriever_query(fixture_corpus):
    retriever = BM25Retriever(corpus=fixture_corpus)
    
    filters = {"code_book": "Plumbing Code"}
    candidates = await retriever.query_lexical_index("water closet partition", filters, top_k=2)
    
    # "chunk_toilet_1" represents WC clearances
    assert len(candidates) == 1
    assert candidates[0].chunk_id == "chunk_toilet_1"
    assert "water closet" in candidates[0].chunk_text.lower()
    assert candidates[0].bm25_rank == 1

@pytest.mark.anyio
async def test_bm25_retriever_does_not_ignore_hard_filters(fixture_corpus):
    retriever = BM25Retriever(corpus=fixture_corpus)

    candidates = await retriever.query_lexical_index(
        "water closet partition",
        {"code_book": "Fire Code", "jurisdiction": "NYC"},
        top_k=2
    )

    assert candidates == []
