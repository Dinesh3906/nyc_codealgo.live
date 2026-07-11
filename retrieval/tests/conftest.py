import pytest
from query_understanding.schemas.models import ComplianceRetrievalPlan, ParsedQuery, MetadataFilter, QueryIntent

@pytest.fixture
def mock_retrieval_plan():
    """Generates a mock Compliance Retrieval Plan from Phase 7."""
    filters = [
        MetadataFilter(key="jurisdiction", value="NYC", filter_type="hard", confidence=1.0),
        MetadataFilter(key="revision_year", value="2022", filter_type="hard", confidence=1.0),
        MetadataFilter(key="code_book", value="Building Code", filter_type="hard", confidence=0.95)
    ]

    parsed = ParsedQuery(
        intents=[QueryIntent.COMPLIANCE_CHECK],
        building_components=["stair"],
        regulatory_concepts=["egress"],
        measurements=["width"],
        jurisdiction="NYC",
        revision_year="2022"
    )

    return ComplianceRetrievalPlan(
        query="Check stair width requirements",
        parsed_query=parsed,
        applicable_codes=["Building Code"],
        applicable_chapters=["Chapter 10"],
        metadata_filters=filters,
        retrieval_strategy="hybrid",
        top_k=5,
        confidence=0.88,
        reasoning="Query demands stair width clearances. Deploying hybrid search.",
        warnings=[]
    )
