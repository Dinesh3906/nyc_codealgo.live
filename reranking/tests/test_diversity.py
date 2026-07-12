from reranking.schemas.models import EvidenceChunk
from reranking.diversity.engine import DiversityEngine

def test_diversity_penalties():
    engine = DiversityEngine()
    
    # Already accepted chunk: section "1011.2", page 242
    accepted = [
        EvidenceChunk(
            chunk_id="c_stair_1", chunk_text="Stair width rules.", document_id="d1", filename="f1",
            page_number=242, code_book="BC", chapter="C10", section="1011.2", colbert_score=0.9,
            combined_score=0.9, selection_reason="best"
        )
    ]
    
    # Candidate sharing section 1011.2 and page 242 (but NOT containing exception keyword)
    candidate_norm = [
        EvidenceChunk(
            chunk_id="c_stair_2", chunk_text="Stair tread dimensions.", document_id="d1", filename="f1",
            page_number=242, code_book="BC", chapter="C10", section="1011.2", colbert_score=0.8,
            combined_score=0.8, selection_reason="tread"
        )
    ]
    
    # Candidate sharing section 1011.2 but containing exempt "Exception" keyword
    candidate_exempt = [
        EvidenceChunk(
            chunk_id="c_stair_3", chunk_text="Exception: Stairways serving less than 50 occupant load.",
            document_id="d1", filename="f1", page_number=242, code_book="BC", chapter="C10",
            section="1011.2", colbert_score=0.8, combined_score=0.8, selection_reason="ex"
        )
    ]
    
    # Normal candidate should get penalized (0.8 - 0.2 section - 0.1 page = 0.5)
    res_norm = engine.apply_diversity_penalties(candidate_norm, accepted)
    assert res_norm[0].combined_score == 0.5
    
    # Exempt candidate should NOT get penalized (remains 0.8)
    res_ex = engine.apply_diversity_penalties(candidate_exempt, accepted)
    assert res_ex[0].combined_score == 0.8
