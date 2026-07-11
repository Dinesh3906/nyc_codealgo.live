import pytest
from context_engine.prompt.builder import PromptBuilder

def test_building_fact_integration(mock_building_model):
    builder = PromptBuilder()
    
    # Query matching egress/stairs
    facts = builder.format_building_facts(mock_building_model, "Check stair exit width")
    
    assert "Total Occupant Load: 2" in facts
    assert "Space 'OFFICE 101'" in facts
    assert "Occupant load 2 people" in facts

def test_prompt_rendering():
    builder = PromptBuilder()
    
    groups = {
        "requirements": [{"chunk_id": "c1", "code_book": "BC", "section": "10", "text": "Requirement text"}]
    }
    citations = [
        {"citation_id": "CIT-01", "code_book": "BC", "section": "10", "page_number": 5, "filename": "f1"}
    ]
    
    prompts = builder.build_prompts(
        "stair width",
        "Total Load: 50",
        groups,
        citations,
        "compliance_review"
    )
    
    assert "## System Context" in prompts["system_prompt"]
    assert "Requirement text" in prompts["system_prompt"]
    assert "CIT-01: BC Section 10" in prompts["system_prompt"]
    assert prompts["user_prompt"] == "Perform compliance auditing for user query: 'stair width'"
