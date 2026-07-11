import pytest

@pytest.fixture
def mock_embedding_baseline():
    return [[0.1, 0.2, 0.3], [0.15, 0.22, 0.28]]

@pytest.fixture
def mock_embedding_shifted():
    # Significantly different coordinates -> causes drift
    return [[0.9, 0.8, 0.1], [0.85, 0.78, 0.15]]
