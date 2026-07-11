import pytest
from autonomous_gov.diff.semantic import SemanticDiffEngine

def test_numeric_parameters_extraction():
    engine = SemanticDiffEngine()
    
    text = "Restroom size must have 60 inches clearance and doors must have 32 in opening."
    params = engine.parse_numeric_parameters(text)
    
    assert params["inches"] == 60.0
    assert params["in"] == 32.0

def test_semantic_diff_calculation(mock_old_regulation_text, mock_new_regulation_text):
    engine = SemanticDiffEngine()
    
    delta = engine.compute_semantic_diff(
        section_id="1105.1",
        old_text=mock_old_regulation_text,
        new_text=mock_new_regulation_text
    )
    
    assert delta.section_id == "1105.1"
    # The diff summary should highlight the shift from 32 to 36
    assert "shifted from 32.0 to 36.0" in delta.diff_summary
    assert "CRITICAL" in delta.diff_summary
