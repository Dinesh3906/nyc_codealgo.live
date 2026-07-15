from fastapi import FastAPI, HTTPException
from shared.cors import configure_cors
from retrieval.schemas.models import CandidateEvidenceSet
from ..schemas.models import EvidencePackage
from ..backfill.engine import RerankingPipeline
from ..config import settings

app = FastAPI(
    title="PermitIQ Neural Reranking API",
    description="Scores candidate evidence chunks using ColBERTv2 late interaction and enforces diversity limits",
    version="1.0.0"
)

configure_cors(app)

# Instantiate pipeline
pipeline_helper = RerankingPipeline()

@app.post("/rerank", response_model=EvidencePackage, summary="Rerank Candidate Evidence Chunks")
async def rerank_candidates(req: CandidateEvidenceSet):
    """
    Reranks the top hybrid candidate chunks using ColBERTv2 MaxSim token similarities,
    applies diversity constraints, and builds the final context-optimized evidence package.
    """
    try:
        final_chunks = pipeline_helper.run_reranking_pipeline(
            req.query,
            req.candidates
        )
        
        # Calculate overall confidence as average of accepted chunk combined scores
        avg_score = sum(c.combined_score for c in final_chunks) / len(final_chunks) if final_chunks else 0.50

        return EvidencePackage(
            query=req.query,
            evidence_chunks=final_chunks,
            overall_confidence=round(avg_score, 2),
            metadata={
                "input_candidate_count": len(req.candidates),
                "output_evidence_count": len(final_chunks),
                "colbert_model": settings.COLBERT_MODEL_NAME or "deterministic-late-interaction"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to rerank candidates: {str(e)}")

@app.get("/health", summary="Health check")
async def health_check():
    return {
        "status": "healthy",
        "reranker": "RerankingPipeline",
        "colbert": "ColbertEngine",
        "device": "CPU"
    }
