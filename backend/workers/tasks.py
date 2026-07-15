from celery import Celery
import os
import tempfile
from urllib.parse import urlparse

from ..config import settings
from ..database.connection import SessionLocal, JobDB

# Initialize Celery
celery_app = Celery("tasks", broker=settings.REDIS_URL, backend=settings.REDIS_URL)
celery_app.conf.update(
    task_always_eager=settings.CELERY_TASK_ALWAYS_EAGER or settings.APP_ENV.lower() == "test",
    task_eager_propagates=settings.APP_ENV.lower() == "test"
)


def _materialize_input_file(filepath: str) -> str:
    if not filepath.startswith("s3://"):
        return filepath

    local_filepath = filepath
    delete_local_filepath = False
    try:
        import boto3
    except ImportError as exc:
        raise RuntimeError("boto3 is required to read S3-backed uploads.") from exc

    parsed = urlparse(filepath)
    bucket = parsed.netloc
    key = parsed.path.lstrip("/")
    if not bucket or not key:
        raise RuntimeError(f"Invalid S3 upload URI: {filepath}")

    suffix = os.path.splitext(key)[1] or ".pdf"
    tmp = tempfile.NamedTemporaryFile(prefix="permitiq-upload-", suffix=suffix, delete=False)
    tmp.close()
    boto3.client("s3").download_file(bucket, key, tmp.name)
    return tmp.name

@celery_app.task(name="process_compliance_job")
def process_compliance_job(job_id: str, filepath: str):
    """
    Background worker pipeline running PermitIQ Phase 2-12 analysis.
    Fuses spatial topologies, retrieves regulations, and drafts reports.
    """
    db = SessionLocal()
    job = db.query(JobDB).filter(JobDB.id == job_id).first()
    if not job:
        db.close()
        return

    try:
        # Update progress to 10%
        job.status = "processing"
        job.progress = 10.0
        db.commit()

        # Import pipeline engines from completed packages
        import asyncio
        from document_ingestion.normalization.engine import NormalizationEngine
        from drawing_understanding.api.app import understand_document
        from object_detection.api.app import detect_document_objects
        from spatial_reasoning.api.app import build_building_graph
        from knowledge_model.calculations.builder import KnowledgeModelBuilder
        from query_understanding.retrieval_planner.planner import ComplianceRetrievalPlanner
        from retrieval.api.app import retrieve_evidence
        from reranking.backfill.engine import RerankingPipeline
        from context_engine.api.app import build_context_package
        from context_engine.schemas.models import ContextRequest
        from compliance_engine.decision.engine import ComplianceDecisionEngine
        from reporting.api.app import generate_compliance_report_package
        from reporting.schemas.models import ReportRequest

        normalization_engine = NormalizationEngine()
        local_filepath = _materialize_input_file(filepath)
        delete_local_filepath = local_filepath != filepath and filepath.startswith("s3://")
        ingestion_doc = normalization_engine.process_document(local_filepath, job.filename)

        job.progress = 30.0
        db.commit()

        semantic_doc = asyncio.run(understand_document(ingestion_doc))
        detected_doc = asyncio.run(detect_document_objects(semantic_doc))
        graph = asyncio.run(build_building_graph(detected_doc))

        if not graph.nodes:
            raise RuntimeError("No building graph nodes were detected from the uploaded document.")

        # 2. Build Knowledge Model (Phase 6)
        kb_builder = KnowledgeModelBuilder()
        kb_model = kb_builder.build_knowledge_model(graph)

        job.progress = 50.0
        db.commit()

        # 3. Plan Retrieval Scope (Phase 7)
        query = "Verify restroom clearances and doors width compliance"
        planner = ComplianceRetrievalPlanner()
        retrieval_plan = planner.generate_retrieval_plan(query, kb_model.model_dump())

        # 4. Hybrid Retrieve Evidence chunks (Phase 8)
        # We invoke the retrieve_evidence async function synchronously for Celery
        evidence_set = asyncio.run(retrieve_evidence(retrieval_plan))

        job.progress = 75.0
        db.commit()

        # 5. ColBERTv2 Neural Rerank (Phase 9)
        reranker = RerankingPipeline()
        reranked_chunks = reranker.run_reranking_pipeline(query, evidence_set.candidates)

        # Build raw dict structure of Reranked evidence package
        evidence_package_dict = {
            "query": query,
            "evidence_chunks": [c.model_dump() for c in reranked_chunks],
            "overall_confidence": 0.88
        }

        # 6. Build Context Prompt Package (Phase 10)
        context_req = ContextRequest(
            query=query,
            building_model=kb_model.model_dump(),
            evidence_package=evidence_package_dict
        )
        context_package = asyncio.run(build_context_package(context_req))

        # 7. Compliance Audit Decisions (Phase 11)
        decision_engine = ComplianceDecisionEngine()
        compliance_report = decision_engine.generate_compliance_report(
            kb_model.model_dump(),
            context_package.model_dump()
        )

        # 8. Report layout and export generator (Phase 12)
        report_req = ReportRequest(
            compliance_report=compliance_report.model_dump(),
            project_metadata={
                "project_name": kb_model.project.metadata.get("project_name", job.filename),
                "address": kb_model.project.metadata.get("project_address", ""),
                "report_title": "PermitIQ Accessibility Audit"
            }
        )
        exported_report_package = asyncio.run(generate_compliance_report_package(report_req))

        # Complete job
        job.status = "completed"
        job.progress = 100.0
        job.result = exported_report_package.model_dump()
        db.commit()

    except Exception as e:
        job.status = "failed"
        job.progress = 100.0
        job.result = {"error": f"Pipeline execution failed: {str(e)}"}
        db.commit()
    finally:
        if delete_local_filepath:
            try:
                os.remove(local_filepath)
            except OSError:
                pass
        db.close()
