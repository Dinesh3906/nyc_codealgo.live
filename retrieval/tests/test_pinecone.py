import pytest
from retrieval.pinecone.client import PineconeRetriever

@pytest.mark.anyio
async def test_pinecone_retriever_query():
    retriever = PineconeRetriever()
    
    filters = {"code_book": "Building Code", "jurisdiction": "NYC"}
    candidates = await retriever.query_semantic_index("stair width", filters, top_k=2)
    
    assert len(candidates) > 0
    # "chunk_egress_1" represents Stairways minimum width of 44 inches
    ids = [c.chunk_id for c in candidates]
    assert "chunk_egress_1" in ids
    
    assert candidates[0].pinecone_rank == 1
    assert candidates[0].confidence > 0.0
