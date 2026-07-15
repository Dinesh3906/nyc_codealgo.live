import pytest
from query_understanding.schemas.models import ComplianceRetrievalPlan, ParsedQuery, MetadataFilter, QueryIntent

@pytest.fixture
def fixture_corpus():
    return [
        {
            "chunk_id": "chunk_egress_1",
            "chunk_text": "IBC Section 1011.2 - Stairways shall have a minimum width of 44 inches. Exception: Stairways serving an occupant load of less than 50 shall have a minimum width of 36 inches.",
            "document_id": "doc_bc_2022",
            "filename": "nyc_building_code_2022.pdf",
            "page_number": 242,
            "code_book": "Building Code",
            "chapter": "Chapter 10",
            "section": "1011.2",
            "subsection": None,
            "discipline": "Architectural",
            "occupancy_type": None,
            "jurisdiction": "NYC",
            "revision_year": "2022",
        },
        {
            "chunk_id": "chunk_toilet_1",
            "chunk_text": "NYC Plumbing Code Section 405.3.1 - Water closets, urinals, lavatories and bidets. A water closet shall not be set closer than 15 inches from its center to any side wall or partition.",
            "document_id": "doc_pc_2022",
            "filename": "nyc_plumbing_code_2022.pdf",
            "page_number": 45,
            "code_book": "Plumbing Code",
            "chapter": "Chapter 4",
            "section": "405.3.1",
            "subsection": None,
            "discipline": "Plumbing",
            "occupancy_type": None,
            "jurisdiction": "NYC",
            "revision_year": "2022",
        },
    ]

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
