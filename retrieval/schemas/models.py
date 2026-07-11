from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class RetrievalCandidate(BaseModel):
    chunk_id: str
    chunk_text: str
    document_id: str
    filename: str
    page_number: int
    code_book: str
    chapter: str
    section: str
    subsection: Optional[str] = None
    discipline: Optional[str] = None
    occupancy_type: Optional[str] = None
    jurisdiction: str
    revision_year: str
    
    # RRF fusion details
    pinecone_rank: Optional[int] = None
    bm25_rank: Optional[int] = None
    fusion_rank: Optional[int] = None
    fusion_score: float = 0.0
    
    confidence: float = 1.0
    retrieval_sources: List[str] = Field(default_factory=list, description="e.g. ['pinecone', 'bm25']")

class CandidateEvidenceSet(BaseModel):
    query: str
    candidates: List[RetrievalCandidate] = Field(default_factory=list)
    retrieval_confidence: float = 1.0
    metadata: Dict[str, Any] = Field(default_factory=dict)
