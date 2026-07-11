import pytest
from reranking.colbert.engine import ColbertEngine

def test_colbert_late_interaction_math():
    engine = ColbertEngine()
    
    # Matching query & document
    score_match = engine.compute_late_interaction_score("stair width", "Stairways shall have a minimum width of 44 inches.")
    # Mismatching query & document
    score_mismatch = engine.compute_late_interaction_score("stair width", "Water closets shall not be set closer than 15 inches.")
    
    # Match score should be strictly higher
    assert score_match > score_mismatch
    assert score_match > 0.0
