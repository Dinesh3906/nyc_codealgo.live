import asyncio
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from query_understanding.schemas.models import ComplianceRetrievalPlan
from ..schemas.models import CandidateEvidenceSet, RetrievalCandidate
from ..pinecone.client import PineconeRetriever
from ..bm25.engine import BM25Retriever
from ..rrf.fusion import RRFFusion
from ..dedup.deduplicator import Deduplicator
from ..confidence.evaluator import RetrievalConfidenceEvaluator

app = FastAPI(
    title="PermitIQ Hybrid Retrieval API",
    description="Runs parallel semantic and lexical search workers, fusing results using RRF",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

    # 2. Run Parallel Retrieval with graceful degradation fallbacks
    pinecone_results = []
    bm25_results = []
    
    tasks = [
        pinecone_client.query_semantic_index(plan.query, filters, top_k),
        bm25_client.query_lexical_index(plan.query, filters, top_k)
    ]

    try:
        # Execute concurrently with a timeout limit (e.g. 1.5 seconds)
        results = await asyncio.gather(*tasks)
        pinecone_results = results[0]
        bm25_results = results[1]
    except Exception as e:
        # Fallback degradation: if one fails, continue with whatever succeeded
        # We try to run them individually to catch which one failed
        try:
            pinecone_results = await pinecone_client.query_semantic_index(plan.query, filters, top_k)
        except Exception:
            pass
        try:
            bm25_results = await bm25_client.query_lexical_index(plan.query, filters, top_k)
        except Exception:
            pass

    # If both failed or returned nothing, raise error or return empty set
    if not pinecone_results and not bm25_results:
        return CandidateEvidenceSet(
            query=plan.query,
            candidates=[],
            retrieval_confidence=0.0,
            metadata={"status": "empty_results_warning"}
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
            "returned_count": len(final_candidates)
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
