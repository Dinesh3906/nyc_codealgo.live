import asyncio
from fastapi import FastAPI, HTTPException
from shared.cors import configure_cors
from query_understanding.schemas.models import ComplianceRetrievalPlan
from ..schemas.models import CandidateEvidenceSet
from ..pinecone.client import PineconeRetriever
from ..bm25.engine import BM25Retriever
from ..rrf.fusion import RRFFusion
from ..dedup.deduplicator import Deduplicator
from ..confidence.evaluator import RetrievalConfidenceEvaluator
from ..config import settings

app = FastAPI(
    title="PermitIQ Hybrid Retrieval API",
    description="Runs parallel semantic and lexical search workers, fusing results using RRF",
    version="1.0.0"
)

configure_cors(app)

# Instantiate engines
pinecone_client = PineconeRetriever()
bm25_client = BM25Retriever()
rrf_fuser = RRFFusion()
deduplicator = Deduplicator()
confidence_evaluator = RetrievalConfidenceEvaluator()

@app.post("/retrieve", response_model=CandidateEvidenceSet, summary="Retrieve Candidate Evidence Chunks")
async def retrieve_evidence(plan: ComplianceRetrievalPlan):
    """
    Executes parallel semantic and lexical queries based on the planning scope,
    applies reciprocal rank fusion, filters near-duplicates, and evaluates confidence.
    """
    # 1. Map metadata filters from Plan
    filters = {}
    for f in plan.metadata_filters:
        if f.filter_type == "hard":
            filters[f.key] = f.value

    top_k = plan.top_k or 5

    # 2. Run parallel retrieval. Production requires semantic retrieval to be
    # configured and healthy; local/test can degrade to BM25 for fixtures.
    pinecone_results = []
    bm25_results = []
    pinecone_error = None
    bm25_error = None
    
    tasks = [
        pinecone_client.query_semantic_index(plan.query, filters, top_k),
        bm25_client.query_lexical_index(plan.query, filters, top_k)
    ]

    results = await asyncio.gather(*tasks, return_exceptions=True)
    if isinstance(results[0], Exception):
        pinecone_error = results[0]
    else:
        pinecone_results = results[0]

    if isinstance(results[1], Exception):
        bm25_error = results[1]
    else:
        bm25_results = results[1]

    if pinecone_error and settings.APP_ENV.lower() == "production":
        raise HTTPException(
            status_code=503,
            detail=f"Semantic retrieval unavailable in production: {pinecone_error}"
        )

    # If both failed or returned nothing, raise error or return empty set
    if not pinecone_results and not bm25_results:
        return CandidateEvidenceSet(
            query=plan.query,
            candidates=[],
            retrieval_confidence=0.0,
            metadata={
                "status": "empty_results_warning",
                "pinecone_error": str(pinecone_error) if pinecone_error else None,
                "bm25_error": str(bm25_error) if bm25_error else None
            }
        )

    # 3. Apply Reciprocal Rank Fusion (RRF)
    fused_candidates = rrf_fuser.fuse_results(pinecone_results, bm25_results)

    # 4. Perform Jaccard Deduplication
    deduped_candidates = deduplicator.deduplicate_candidates(fused_candidates)

    # Limit to requested Top K
    final_candidates = deduped_candidates[:top_k]

    # 5. Evaluate Confidence
    overall_confidence = confidence_evaluator.calculate_confidence(
        final_candidates,
        plan.query
    )

    return CandidateEvidenceSet(
        query=plan.query,
        candidates=final_candidates,
        retrieval_confidence=overall_confidence,
        metadata={
            "fused_count": len(fused_candidates),
            "deduped_count": len(deduped_candidates),
            "returned_count": len(final_candidates),
            "semantic_degraded": pinecone_error is not None,
            "lexical_degraded": bm25_error is not None
        }
    )

@app.get("/health", summary="Health check")
async def health_check():
    return {
        "status": "healthy",
        "semantic_retriever": "PineconeRetriever",
        "lexical_retriever": "BM25Retriever",
        "fusion": "RRFFusion"
    }
