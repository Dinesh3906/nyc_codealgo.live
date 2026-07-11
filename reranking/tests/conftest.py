import pytest
from retrieval.schemas.models import CandidateEvidenceSet, RetrievalCandidate

@pytest.fixture
def mock_candidate_set():
    """Generates a mock Candidate Evidence Set from Phase 8."""
    c1 = RetrievalCandidate(
        chunk_id="c_stair_1",
        chunk_text="IBC Section 1011.2 - Stairways shall have a minimum width of 44 inches. Exception: Stairways serving less than 50 occupant load shall be 36 inches.",
        document_id="doc_bc_2022",
        filename="nyc_building_code_2022.pdf",
        page_number=242,
        code_book="Building Code",
        chapter="Chapter 10",
        section="1011.2",
        subsection=None,
        discipline="Architectural",
        occupancy_type=None,
        jurisdiction="NYC",
        revision_year="2022",
        pinecone_rank=1,
        bm25_rank=1,
        fusion_rank=1,
        fusion_score=0.033,
        confidence=0.95,
        retrieval_sources=["pinecone", "bm25"]
    )

    c2 = RetrievalCandidate(
        chunk_id="c_stair_2",
        chunk_text="IBC Section 1011.2 - Stairways tread and risers dimension rules are described in section 1011.5. Minimum tread depth is 11 inches, maximum riser is 7 inches.",
        document_id="doc_bc_2022",
        filename="nyc_building_code_2022.pdf",
        page_number=242, # Same page, same section!
        code_book="Building Code",
        chapter="Chapter 10",
        section="1011.2",
        subsection=None,
        discipline="Architectural",
        occupancy_type=None,
        jurisdiction="NYC",
        revision_year="2022",
        pinecone_rank=2,
        bm25_rank=2,
        fusion_rank=2,
        fusion_score=0.032,
        confidence=0.88,
        retrieval_sources=["pinecone", "bm25"]
    )

    c3 = RetrievalCandidate(
        chunk_id="c_toilet_1",
        chunk_text="NYC Plumbing Code Section 405.3.1 - A water closet shall not be set closer than 15 inches from its center to any side wall or partition.",
        document_id="doc_pc_2022",
        filename="nyc_plumbing_code_2022.pdf",
        page_number=45,
        code_book="Plumbing Code",
        chapter="Chapter 4",
        section="405.3.1",
        subsection=None,
        discipline="Plumbing",
        occupancy_type=None,
        jurisdiction="NYC",
        revision_year="2022",
        pinecone_rank=3,
        bm25_rank=3,
        fusion_rank=3,
        fusion_score=0.031,
        confidence=0.90,
        retrieval_sources=["pinecone", "bm25"]
    )

    return CandidateEvidenceSet(
        query="Verify stair width and WC clearances",
        candidates=[c1, c2, c3],
        retrieval_confidence=0.92,
        metadata={}
    )
