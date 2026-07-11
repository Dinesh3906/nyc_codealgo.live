from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class EvidenceChunk(BaseModel):
    chunk_id: str
    chunk_text: str
    document_id: str
    filename: str
    page_number: int
    code_book: str
    chapter: str
    section: str
    subsection: Optional[str] = None
    
    colbert_score: float
    combined_score: float
    selection_reason: str
    coverage_type: str = "primary_requirement" # primary_requirement, exception, definition, cross_reference
    conflict_info: Dict[str, Any] = Field(default_factory=dict)

class EvidencePackage(BaseModel):
    query: str
    evidence_chunks: List[EvidenceChunk] = Field(default_factory=list)
    overall_confidence: float = 1.0
    metadata: Dict[str, Any] = Field(default_factory=dict)
