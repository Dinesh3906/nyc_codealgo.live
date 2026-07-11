import pytest
from aiops.drift.detector import DriftDetector

def test_cosine_similarity_identity():
    detector = DriftDetector()
    vec = [1.0, 2.0, 3.0]
    
    sim = detector.compute_cosine_similarity(vec, vec)
    
    assert abs(sim - 1.0) < 0.001

def test_cosine_similarity_orthogonal():
    detector = DriftDetector()
    vec_a = [1.0, 0.0]
    vec_b = [0.0, 1.0]
    
    sim = detector.compute_cosine_similarity(vec_a, vec_b)
    
    assert sim == 0.0

def test_semantic_drift_detection(mock_embedding_baseline, mock_embedding_shifted):
    detector = DriftDetector()
    
    # Check baseline against baseline -> should NOT drift
    assert detector.check_for_semantic_drift(mock_embedding_baseline, mock_embedding_baseline) is False
    
    # Check baseline against shifted -> should drift!
    assert detector.check_for_semantic_drift(mock_embedding_baseline, mock_embedding_shifted) is True
