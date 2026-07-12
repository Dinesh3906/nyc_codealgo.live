import pytest
from retrieval.pinecone.client import PineconeRetriever

@pytest.mark.anyio
async def test_pinecone_retriever_query():
    from retrieval.config import settings
    previous = settings.ALLOW_MOCK_RETRIEVAL
    settings.ALLOW_MOCK_RETRIEVAL = True
    retriever = PineconeRetriever()
    
    try:
        filters = {"code_book": "Building Code", "jurisdiction": "NYC"}
        candidates = await retriever.query_semantic_index("stair width", filters, top_k=2)
        
        assert len(candidates) > 0
        # "chunk_egress_1" represents Stairways minimum width of 44 inches
        ids = [c.chunk_id for c in candidates]
        assert "chunk_egress_1" in ids
        
        assert candidates[0].pinecone_rank == 1
        assert candidates[0].confidence > 0.0
    finally:
        settings.ALLOW_MOCK_RETRIEVAL = previous

@pytest.mark.anyio
async def test_pinecone_retriever_requires_explicit_mock_opt_in():
    from retrieval.config import settings
    previous = settings.ALLOW_MOCK_RETRIEVAL
    settings.ALLOW_MOCK_RETRIEVAL = False
    retriever = PineconeRetriever()

    try:
        with pytest.raises(RuntimeError):
            await retriever.query_semantic_index("stair width", {}, top_k=2)
    finally:
        settings.ALLOW_MOCK_RETRIEVAL = previous
