import pytest

@pytest.fixture
def mock_evidence_package():
    """Generates a mock Evidence Package output from Phase 9."""
    return {
        "query": "Verify stair width requirements",
        "evidence_chunks": [
            {
                "chunk_id": "c_stair_1",
                "chunk_text": "IBC Section 1011.2 - Stairways shall have a minimum width of 44 inches. Exception: Stairways serving less than 50 occupant load shall be 36 inches.",
                "document_id": "doc_bc_2022",
                "filename": "nyc_building_code_2022.pdf",
                "page_number": 242,
                "code_book": "Building Code",
                "chapter": "Chapter 10",
                "section": "1011.2",
                "subsection": None,
                "colbert_score": 0.82,
                "combined_score": 0.85,
                "selection_reason": "Strong match",
                "coverage_type": "exception",
                "conflict_info": {}
            },
            {
                "chunk_id": "c_stair_1_dup", # Duplicate section text
                "chunk_text": "IBC Section 1011.2 - Stairways shall have a minimum width of 44 inches. Exception: Stairways serving less than 50 occupant load shall be 36 inches.",
                "document_id": "doc_bc_2022",
                "filename": "nyc_building_code_2022.pdf",
                "page_number": 242,
                "code_book": "Building Code",
                "chapter": "Chapter 10",
                "section": "1011.2",
                "subsection": None,
                "colbert_score": 0.82,
                "combined_score": 0.80,
                "selection_reason": "dup match",
                "coverage_type": "exception",
                "conflict_info": {}
            }
        ],
        "overall_confidence": 0.82,
        "metadata": {}
    }

@pytest.fixture
def mock_building_model():
    """Generates a mock Building Knowledge Model from Phase 6."""
    return {
        "project": {
            "id": "mock_doc_777",
            "filename": "project_set.pdf",
            "storeys": {
                "storey-0": {
                    "id": "storey-0",
                    "level_index": 0,
                    "name": "Floor Level 1",
                    "spaces": {
                        "room_1": {
                            "id": "room_1",
                            "space_type": "ROOM",
                            "name": "OFFICE 101",
                            "number": None,
                            "area_sq_feet": 123.46,
                            "perimeter_feet": 44.44,
                            "ceiling_height_feet": 9.0,
                            "occupancy_classification": "business",
                            "occupant_load": 2,
                            "required_exit_width_inches": 0.4,
                            "actual_exit_width_inches": 36.0,
                            "wheelchair_turning_clearance_inches": 133.33,
                            "accessible": True,
                            "doors": [],
                            "windows": [],
                            "walls": [],
                            "sensors": [],
                            "flow_terminals": [],
                            "connected_spaces_ids": []
                        }
                    }
                }
            }
        },
        "calculated_metrics": {
            "total_occupant_load": 2,
            "total_area_sq_ft": 123.46,
            "accessible_spaces_count": 1,
            "spaces_count": 1
        }
    }
