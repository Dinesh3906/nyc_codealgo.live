from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from ..schemas.models import ContextRequest, ContextPackage
from ..compression.engine import ContextCompressor
from ..citations.preservation import CitationPreserver
from ..orchestration.engine import EvidenceOrchestrator
from ..prompt.builder import PromptBuilder
from ..validation.verifier import ContextValidator

app = FastAPI(
    title="PermitIQ Context Engineering API",
    description="Prepares, groups, and compresses context for LLM compliance reasoning",
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
compressor = ContextCompressor()
preserver = CitationPreserver()
orchestrator = EvidenceOrchestrator()
prompt_builder = PromptBuilder()
validator = ContextValidator()

# Expected output schema for compliance reasoning
EXPECTED_OUTPUT_SCHEMA = {
    "type": "object",
    "properties": {
        "compliant": {"type": "boolean", "description": "True if building facts satisfy all retrieved codes"},
        "reasoning": {"type": "string", "description": "Auditor reasoning detailing analysis, citing CIT-XX references"},
        "violations": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "section": {"type": "string", "description": "Non-compliant code section"},
                    "description": {"type": "string", "description": "Details of why the facts violate code limits"},
                    "citation_ref": {"type": "string", "description": "citation ID matching CIT-XX Index"}
                },
                "required": ["section", "description", "citation_ref"]
            }
        }
    },
    "required": ["compliant", "reasoning", "violations"]
}

@app.post("/context", response_model=ContextPackage, summary="Build LLM Context Package")
async def build_context_package(req: ContextRequest):
    """
    Groups evidence chunks, builds structured prompts with integrated building facts,
    retains citations, and audits package completeness.
    """
    try:
        raw_chunks = req.evidence_package.get("evidence_chunks", [])
        
        # 1. Compress context & clean text
        compressed_chunks = compressor.compress_evidence(raw_chunks)
        
        # 2. Preserve citations
        citations = preserver.generate_citation_index(compressed_chunks)
        
        # 3. Group and orchestrate regulations
        groups = orchestrator.group_evidence_chunks(compressed_chunks)
        
        # 4. Integrate relevant building facts
        facts_summary = prompt_builder.format_building_facts(req.building_model or {}, req.query)
        
        # 5. Build prompts
        prompts = prompt_builder.build_prompts(
            req.query,
            facts_summary,
            groups,
            citations,
            req.template_type
        )
        
        # 6. Validate context package
        val_report = validator.validate_context_package(
            prompts["system_prompt"],
            citations,
            compressed_chunks
        )

        # Merge conflict metadata from input package chunks
        conflict_metadata = {}
        for c in raw_chunks:
            if c.get("conflict_info", {}).get("has_conflict"):
                conflict_metadata[c["chunk_id"]] = c["conflict_info"]

        return ContextPackage(
            query=req.query,
            system_prompt=prompts["system_prompt"],
            user_prompt=prompts["user_prompt"],
            building_facts_summary=facts_summary,
            evidence_groups=groups,
            citations=citations,
            conflict_metadata=conflict_metadata,
            expected_output_schema=EXPECTED_OUTPUT_SCHEMA,
            validation_report=val_report,
            confidence=req.evidence_package.get("overall_confidence", 1.0)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to build context package: {str(e)}")

@app.get("/health", summary="Health check")
async def health_check():
    return {
        "status": "healthy",
        "context_compressor": "ContextCompressor",
        "citation_preserver": "CitationPreserver",
        "prompt_builder": "PromptBuilder"
    }
