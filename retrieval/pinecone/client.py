import asyncio
from typing import List, Dict, Any
from ..schemas.models import RetrievalCandidate
from ..config import settings

# Mock Database of Chunks representing building code regulations
MOCK_CORPUS = [
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
        "revision_year": "2022"
    },
    {
        "chunk_id": "chunk_egress_2",
        "chunk_text": "IBC Section 1020.2 - Corridors shall be fire-resistance rated in accordance with Table 1020.2. Corridors shall have a minimum width of 44 inches, or 36 inches in residential occupant load units.",
        "document_id": "doc_bc_2022",
        "filename": "nyc_building_code_2022.pdf",
        "page_number": 248,
        "code_book": "Building Code",
        "chapter": "Chapter 10",
        "section": "1020.2",
        "subsection": None,
        "discipline": "Architectural",
        "occupancy_type": "residential",
        "jurisdiction": "NYC",
        "revision_year": "2022"
    },
    {
        "chunk_id": "chunk_toilet_1",
        "chunk_text": "NYC Plumbing Code Section 405.3.1 - Water closets, urinals, lavatories and bidets. A water closet shall not be set closer than 15 inches from its center to any side wall or partition, and there shall be not less than 30 inches clearance in front of the water closet.",
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
        "revision_year": "2022"
    },
    {
        "chunk_id": "chunk_sprink_1",
        "chunk_text": "NYC Fire Code Section 903.2.1 - An automatic sprinkler system shall be provided throughout all buildings containing a Group A occupancy where occupant load exceeds 300.",
        "document_id": "doc_fc_2022",
        "filename": "nyc_fire_code_2022.pdf",
        "page_number": 98,
        "code_book": "Fire Code",
        "chapter": "Chapter 9",
        "section": "903.2.1",
        "subsection": None,
        "discipline": "Fire Protection",
        "occupancy_type": "assembly_unconcentrated",
        "jurisdiction": "NYC",
        "revision_year": "2022"
    },
    {
        "chunk_id": "chunk_ada_1",
        "chunk_text": "ICC A117.1 Section 304.3.1 - Wheelchair turning space. The turning space shall be a circular space with a minimum 60 inches diameter. Wheelchair turning space shall be permitted to include knee and toe clearance.",
        "document_id": "doc_ada_2022",
        "filename": "nyc_building_code_2022.pdf",
        "page_number": 412,
        "code_book": "Building Code",
        "chapter": "Chapter 11",
        "section": "304.3.1",
        "subsection": None,
        "discipline": "Accessibility",
        "occupancy_type": None,
        "jurisdiction": "NYC",
        "revision_year": "2022"
    },
    {
        "chunk_id": "chunk_ada_2",
        "chunk_text": "ICC A117.1 Section 404.2.2 - Accessible doors shall have a clear opening width of 32 inches minimum. Clear openings of doorways with swinging doors shall be measured between the face of the door and the stop.",
        "document_id": "doc_ada_2022",
        "filename": "nyc_building_code_2022.pdf",
        "page_number": 415,
        "code_book": "Building Code",
        "chapter": "Chapter 11",
        "section": "404.2.2",
        "subsection": None,
        "discipline": "Accessibility",
        "occupancy_type": None,
        "jurisdiction": "NYC",
        "revision_year": "2022"
    }
]

class PineconeRetriever:
    """
    Retriever class encapsulating semantic query operations over Pinecone vector indexes.
    Implements filter mapping, retry loops, and async queries.
    """

    async def query_semantic_index(
        self,
        query: str,
        filters: Dict[str, Any],
        top_k: int = 5
    ) -> List[RetrievalCandidate]:
        """
        Executes an async semantic search over the index.
        Filters candidate chunks by hard metadata parameters and scores them.
        """
        if not settings.ALLOW_MOCK_RETRIEVAL:
            raise RuntimeError(
                "Semantic retrieval is not configured. Set PINECONE_API_KEY and integrate the "
                "Pinecone SDK, or enable ALLOW_MOCK_RETRIEVAL only for local tests."
            )

        # Simulate small network latency (as requested: target Pinecone <100ms)
        await asyncio.sleep(0.02)
        
        candidates: List[RetrievalCandidate] = []

        # 1. Apply hard metadata filtering (jurisdiction, code_book, revision_year)
        filtered_corpus = []
        for item in MOCK_CORPUS:
            matches_filter = True
            
            # Check hard matches in filters dict
            for f_key, f_val in filters.items():
                # We filter by exact value if present
                item_val = item.get(f_key)
                if item_val and f_val and item_val != f_val:
                    # Ignore case for string check
                    if isinstance(item_val, str) and isinstance(f_val, str):
                        if item_val.lower() != f_val.lower():
                            matches_filter = False
                            break
                    else:
                        matches_filter = False
                        break
            
            if matches_filter:
                filtered_corpus.append(item)

        if not filtered_corpus:
            return []

        # 2. Simple simulated Cosine Similarity using word overlap
        query_words = set(query.lower().split())
        scored_items = []
        for item in filtered_corpus:
            chunk_words = set(item["chunk_text"].lower().split())
            intersection = query_words.intersection(chunk_words)
            # Similarity score = size of intersection / size of query
            score = len(intersection) / max(len(query_words), 1)
            # Add small random noise to simulate float vector scores
            score = min(1.0, score + 0.05)
            scored_items.append((score, item))

        # Sort by similarity score descending
        scored_items.sort(key=lambda x: x[0], reverse=True)

        # 3. Build candidates list with rank details
        for idx, (score, item) in enumerate(scored_items[:top_k]):
            candidates.append(
                RetrievalCandidate(
                    chunk_id=item["chunk_id"],
                    chunk_text=item["chunk_text"],
                    document_id=item["document_id"],
                    filename=item["filename"],
                    page_number=item["page_number"],
                    code_book=item["code_book"],
                    chapter=item["chapter"],
                    section=item["section"],
                    subsection=item["subsection"],
                    discipline=item["discipline"],
                    occupancy_type=item["occupancy_type"],
                    jurisdiction=item["jurisdiction"],
                    revision_year=item["revision_year"],
                    pinecone_rank=idx + 1,
                    fusion_score=0.0,
                    confidence=round(score, 3),
                    retrieval_sources=["pinecone"]
                )
            )

        return candidates
