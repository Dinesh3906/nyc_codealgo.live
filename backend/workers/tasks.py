from celery import Celery
import time
from ..config import settings
from ..database.connection import SessionLocal, JobDB

# Initialize Celery
celery_app = Celery("tasks", broker=settings.REDIS_URL, backend=settings.REDIS_URL)
celery_app.conf.update(
    task_always_eager=True,
    task_eager_propagates=True
)

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

        # Import AI pipeline engines from completed packages
        from spatial_reasoning.models import BuildingGraph, BuildingGraphNode, BoundingBox
        from knowledge_model.calculations.builder import KnowledgeModelBuilder
        from query_understanding.retrieval_planner.planner import ComplianceRetrievalPlanner
        from retrieval.api.app import retrieve_evidence
        from query_understanding.schemas.models import ComplianceRetrievalPlan
        from reranking.backfill.engine import RerankingPipeline
        from context_engine.api.app import build_context_package
        from context_engine.schemas.models import ContextRequest
        from compliance_engine.decision.engine import ComplianceDecisionEngine
        from reporting.api.app import generate_compliance_report_package
        from reporting.schemas.models import ReportRequest

        time.sleep(0.1) # Simulate ingestion overhead
        job.progress = 30.0
        db.commit()

        # 1. Simulate Building Graph from Phase 5 (Mock Office room)
        r1 = BuildingGraphNode(
            id="room_1", object_class="ROOM", page_idx=0,
            coordinates=BoundingBox(xmin=100.0, ymin=100.0, xmax=300.0, ymax=300.0),
            attributes={
                "room_name": "Accessible Restroom",
                "polygon": [[100, 100], [300, 100], [300, 300], [100, 300], [100, 100]]
            }
        )
        d1 = BuildingGraphNode(
            id="door_1", object_class="DOOR", page_idx=0,
            coordinates=BoundingBox(xmin=140.0, ymin=95.0, xmax=194.0, ymax=105.0),
            attributes={"width_inches": 36.0} # Access width
        )
        mock_graph = BuildingGraph(
            id="job-graph",
            nodes={"room_1": r1, "door_1": d1},
            edges=[],
            metadata={"scale": "1/4\" = 1'-0\""}
        )

        # 2. Build Knowledge Model (Phase 6)
        kb_builder = KnowledgeModelBuilder()
        kb_model = kb_builder.build_knowledge_model(mock_graph)

        job.progress = 50.0
        db.commit()

        # 3. Plan Retrieval Scope (Phase 7)
        query = "Verify restroom clearances and doors width compliance"
        planner = ComplianceRetrievalPlanner()
        retrieval_plan = planner.generate_retrieval_plan(query, kb_model.model_dump())

        # 4. Hybrid Retrieve Evidence chunks (Phase 8)
        # We invoke the retrieve_evidence async function synchronously for Celery
        import asyncio
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
                "project_name": "Audited Permit Office Complex",
                "address": "450 Broadway, New York, NY",
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
        db.close()
