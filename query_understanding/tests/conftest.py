import pytest

@pytest.fixture
def mock_knowledge_model_dict():
    """Generates a mock Knowledge Model dictionary representation from Phase 6."""
    return {
        "calculated_metrics": {
            "total_occupant_load": 86,
            "total_area_sq_ft": 4500.0,
            "accessible_spaces_count": 8,
            "spaces_count": 10
        },
        "warnings": []
    }
