import pytest

@pytest.fixture
def mock_building_model_pc():
    """Generates a mock Building Model from Phase 6 containing Restroom features."""
    return {
        "project": {
            "id": "doc_wc_777",
            "storeys": {
                "storey-0": {
                    "level_index": 0,
                    "name": "Floor 1",
                    "spaces": {
                        "restroom_1": {
                            "name": "Accessible Restroom",
                            "space_type": "ROOM",
                            "wheelchair_turning_clearance_inches": 72.0, # PASS (>60)
                            "doors": [{"id": "d1", "width_inches": 36.0}] # PASS (>32)
                        }
                    }
                }
            }
        }
    }

@pytest.fixture
def mock_building_model_fail():
    """Generates a mock Building Model with failing clearances."""
    return {
        "project": {
            "id": "doc_wc_777",
            "storeys": {
                "storey-0": {
                    "level_index": 0,
                    "name": "Floor 1",
                    "spaces": {
                        "restroom_1": {
                            "name": "Accessible Restroom",
                            "space_type": "ROOM",
                            "wheelchair_turning_clearance_inches": 48.0, # FAIL (<60)
                            "doors": [{"id": "d1", "width_inches": 28.0}] # FAIL (<32)
                        }
                    }
                }
            }
        }
    }

@pytest.fixture
def mock_context_package_toilet():
    """Generates a mock Context Package from Phase 10 containing WC clearances code."""
    return {
        "query": "Verify toilet clearances in bathrooms",
        "citations": [
            {
                "citation_id": "CIT-01",
                "code_book": "Building Code",
                "section": "1109.2",
                "page_number": 412,
                "filename": "nyc_building_code_2022.pdf"
            },
            {
                "citation_id": "CIT-02",
                "code_book": "Building Code",
                "section": "1105.1",
                "page_number": 415,
                "filename": "nyc_building_code_2022.pdf"
            }
        ],
        "conflict_metadata": {}
    }

@pytest.fixture
def mock_context_package_conflict():
    """Generates a mock Context Package with revision conflicts."""
    return {
        "query": "Verify toilet clearances in bathrooms",
        "citations": [
            {
                "citation_id": "CIT-01",
                "code_book": "Building Code",
                "section": "1109.2",
                "page_number": 412,
                "filename": "nyc_building_code_2022.pdf"
            }
        ],
        "conflict_metadata": {
            "chunk_stair_1": {
                "has_conflict": True,
                "description": "Conflict detected for section 1109.2 between 2014 and 2022 revision codes."
            }
        }
    }
