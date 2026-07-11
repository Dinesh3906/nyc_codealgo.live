from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from enum import Enum

class QueryIntent(str, Enum):
    COMPLIANCE_CHECK = "compliance_check"
    CODE_LOOKUP = "code_lookup"
    CODE_INTERPRETATION = "code_interpretation"
    VIOLATION_ANALYSIS = "violation_analysis"
    ACCESSIBILITY_REVIEW = "accessibility_review"
    FIRE_REVIEW = "fire_review"
    MECHANICAL_REVIEW = "mechanical_review"
    PLUMBING_REVIEW = "plumbing_review"
    ELECTRICAL_REVIEW = "electrical_review"
    GENERAL_QUESTION = "general_question"

class ParsedQuery(BaseModel):
    intents: List[QueryIntent] = Field(default_factory=list)
    building_components: List[str] = Field(default_factory=list)
    regulatory_concepts: List[str] = Field(default_factory=list)
    measurements: List[str] = Field(default_factory=list)
    occupancy: Optional[str] = None
    discipline: Optional[str] = None
    jurisdiction: str = "NYC"
    building_type: Optional[str] = None
    revision_year: str = "2022"

class MetadataFilter(BaseModel):
    key: str
    value: str
    filter_type: str = "hard" # "hard" (exact match) or "soft" (boosting)
    confidence: float = 1.0

class ComplianceRetrievalPlan(BaseModel):
    query: str
    parsed_query: ParsedQuery
    applicable_codes: List[str] = Field(default_factory=list, description="e.g. Building Code, Fire Code")
    applicable_chapters: List[str] = Field(default_factory=list, description="e.g. Chapter 10, Chapter 11")
    metadata_filters: List[MetadataFilter] = Field(default_factory=list)
    retrieval_strategy: str = "hybrid" # semantic, lexical, hybrid
    top_k: int = 5
    confidence: float = 1.0
    reasoning: str
    warnings: List[str] = Field(default_factory=list)
