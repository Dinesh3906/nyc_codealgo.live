from retrieval.schemas.models import RetrievalCandidate
from retrieval.rrf.fusion import RRFFusion

def test_rrf_fusion_logic():
    fuser = RRFFusion()
    
    # Candidate A ranked 1 in Pinecone, 2 in BM25
    cand_p_a = RetrievalCandidate(
        chunk_id="chunk_A", chunk_text="Text A", document_id="doc1", filename="f1",
        page_number=1, code_book="BC", chapter="C1", section="S1", jurisdiction="NYC",
        revision_year="2022", pinecone_rank=1, retrieval_sources=["pinecone"]
    )
    # Candidate B ranked 2 in Pinecone, 1 in BM25
    cand_p_b = RetrievalCandidate(
        chunk_id="chunk_B", chunk_text="Text B", document_id="doc1", filename="f1",
        page_number=1, code_book="BC", chapter="C1", section="S1", jurisdiction="NYC",
        revision_year="2022", pinecone_rank=2, retrieval_sources=["pinecone"]
    )
    
    cand_b_a = RetrievalCandidate(
        chunk_id="chunk_A", chunk_text="Text A", document_id="doc1", filename="f1",
        page_number=1, code_book="BC", chapter="C1", section="S1", jurisdiction="NYC",
        revision_year="2022", bm25_rank=2, retrieval_sources=["bm25"]
    )
    cand_b_b = RetrievalCandidate(
        chunk_id="chunk_B", chunk_text="Text B", document_id="doc1", filename="f1",
        page_number=1, code_book="BC", chapter="C1", section="S1", jurisdiction="NYC",
        revision_year="2022", bm25_rank=1, retrieval_sources=["bm25"]
    )

    fused = fuser.fuse_results([cand_p_a, cand_p_b], [cand_b_a, cand_b_b])
    
    # RRF Score contribution:
    # A = 1/(60+1) + 1/(60+2) = 1/61 + 1/62 = 0.01639 + 0.01612 = 0.03251
    # B = 1/(60+2) + 1/(60+1) = 0.03251
    # They should tie on fusion scores, stable order preserved
    assert len(fused) == 2
    assert fused[0].fusion_rank == 1
    assert "pinecone" in fused[0].retrieval_sources
    assert "bm25" in fused[0].retrieval_sources
