import pytest
from context_engine.compression.engine import ContextCompressor

def test_redundant_whitespace_cleanup():
    compressor = ContextCompressor()
    
    dirty_text = "Section   101  \n   shall   have  spaces."
    assert compressor.clean_text(dirty_text) == "Section 101 shall have spaces."

def test_evidence_deduplication():
    compressor = ContextCompressor()
    
    mock_chunks = [
        {"chunk_id": "c1", "code_book": "BC", "section": "1011.2", "chunk_text": "Text A"},
        {"chunk_id": "c2", "code_book": "BC", "section": "1011.2", "chunk_text": "Text A"} # Duplicate section key!
    ]
    
    compressed = compressor.compress_evidence(mock_chunks)
    
    # Second duplicate section should be skipped
    assert len(compressed) == 1
    assert compressed[0]["chunk_id"] == "c1"
