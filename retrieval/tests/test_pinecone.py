import pytest
from retrieval.pinecone.client import PineconeRetriever

@pytest.mark.anyio
async def test_pinecone_retriever_queries_configured_services(monkeypatch):
    from retrieval.config import settings

    previous_key = settings.PINECONE_API_KEY
    previous_host = settings.PINECONE_INDEX_HOST
    previous_embedding = settings.EMBEDDING_ENDPOINT

    settings.PINECONE_API_KEY = "test-key"
    settings.PINECONE_INDEX_HOST = "https://example-index.pinecone.io"
    settings.EMBEDDING_ENDPOINT = "https://example-embedding.local/embed"
    retriever = PineconeRetriever()

    monkeypatch.setattr(retriever, "_embed_query", lambda query: [0.1, 0.2, 0.3])
    monkeypatch.setattr(
        retriever,
        "_query_pinecone",
        lambda vector, filters, top_k: {
            "matches": [
                {
                    "id": "chunk_egress_1",
                    "score": 0.91,
                    "metadata": {
                        "chunk_text": "IBC Section 1011.2 - Stairways shall have a minimum width of 44 inches.",
                        "document_id": "doc_bc_2022",
                        "filename": "nyc_building_code_2022.pdf",
                        "page_number": 242,
                        "code_book": "Building Code",
                        "chapter": "Chapter 10",
                        "section": "1011.2",
                        "jurisdiction": "NYC",
                        "revision_year": "2022",
                    },
                }
            ]
        },
    )

    try:
        filters = {"code_book": "Building Code", "jurisdiction": "NYC"}
        candidates = await retriever.query_semantic_index("stair width", filters, top_k=2)

        assert len(candidates) == 1
        assert candidates[0].chunk_id == "chunk_egress_1"
        assert candidates[0].pinecone_rank == 1
        assert candidates[0].confidence == 0.91
    finally:
        settings.PINECONE_API_KEY = previous_key
        settings.PINECONE_INDEX_HOST = previous_host
        settings.EMBEDDING_ENDPOINT = previous_embedding


@pytest.mark.anyio
async def test_pinecone_retriever_requires_production_configuration():
    from retrieval.config import settings
    previous_key = settings.PINECONE_API_KEY
    previous_host = settings.PINECONE_INDEX_HOST
    previous_embedding = settings.EMBEDDING_ENDPOINT

    settings.PINECONE_API_KEY = ""
    settings.PINECONE_INDEX_HOST = ""
    settings.EMBEDDING_ENDPOINT = ""
    retriever = PineconeRetriever()

    try:
        with pytest.raises(RuntimeError, match="Semantic retrieval requires production configuration"):
            await retriever.query_semantic_index("stair width", {}, top_k=2)
    finally:
        settings.PINECONE_API_KEY = previous_key
        settings.PINECONE_INDEX_HOST = previous_host
        settings.EMBEDDING_ENDPOINT = previous_embedding
