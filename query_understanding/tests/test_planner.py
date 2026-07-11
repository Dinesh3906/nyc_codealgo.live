import pytest
from query_understanding.retrieval_planner.planner import ComplianceRetrievalPlanner

def test_planner_lexical_strategy():
    planner = ComplianceRetrievalPlanner()
    
    # direct section mention -> lexical
    plan = planner.generate_retrieval_plan("check section 1004.1.2")
    assert plan.retrieval_strategy == "lexical"
    assert plan.top_k == 3

def test_planner_hybrid_strategy(mock_knowledge_model_dict):
    planner = ComplianceRetrievalPlanner()
    
    # Egress check -> hybrid
    plan = planner.generate_retrieval_plan(
        "Verify toilet clearances in bathrooms",
        mock_knowledge_model_dict
    )
    
    assert plan.retrieval_strategy == "hybrid"
    assert plan.top_k == 6
    assert "Plumbing Code" in plan.applicable_codes
    assert "Chapter 4" in plan.applicable_chapters
    
    # Metadata filters: should contain hard filters (jurisdiction, code_book, year)
    # and soft filters (occupancy_classification boosted from building model)
    keys = [f.key for f in plan.metadata_filters]
    assert "jurisdiction" in keys
    assert "code_book" in keys
    assert "occupancy_classification" in keys
    
    occ_filter = next(f for f in plan.metadata_filters if f.key == "occupancy_classification")
    assert occ_filter.value == "business" # Mock knowledge model occupancy factor
    assert occ_filter.filter_type == "soft"
