import pytest
from context_engine.orchestration.engine import EvidenceOrchestrator

def test_evidence_grouping():
    orchestrator = EvidenceOrchestrator()
    
    mock_chunks = [
        {"chunk_id": "c1", "coverage_type": "exception", "code_book": "BC", "section": "10", "chunk_text": "Except..."},
        {"chunk_id": "c2", "coverage_type": "definition", "code_book": "BC", "section": "2", "chunk_text": "Means..."},
        {"chunk_id": "c3", "coverage_type": "primary_requirement", "code_book": "BC", "section": "5", "chunk_text": "Shall..."}
    ]
    
    groups = orchestrator.group_evidence_chunks(mock_chunks)
    
    assert len(groups["exceptions"]) == 1
    assert groups["exceptions"][0]["chunk_id"] == "c1"
    
    assert len(groups["definitions"]) == 1
    assert groups["definitions"][0]["chunk_id"] == "c2"
    
    assert len(groups["requirements"]) == 1
    assert groups["requirements"][0]["chunk_id"] == "c3"
