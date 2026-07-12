from pydantic import BaseModel, Field
from typing import Dict, List

class BenchmarkResult(BaseModel):
    precision: float
    recall: float
    f1: float
    iou: float
    ndcg: float
    citation_accuracy: float
    evaluated: bool = False
    sample_count: int = 0
    evidence_source: str = "not_configured"
    warnings: List[str] = Field(default_factory=list)

class SecurityHeadersSummary(BaseModel):
    content_security_policy: bool
    strict_transport_security: bool
    x_content_type_options: bool
    x_frame_options: bool
    has_prompt_injection_sanitizer: bool

class PerformanceBaseline(BaseModel):
    avg_api_latency_ms: float
    avg_job_creation_ms: float
    max_concurrency_users: int
    load_failure_rate: float
    measured: bool = False
    evidence_source: str = "not_configured"
    warnings: List[str] = Field(default_factory=list)

class ChaosReport(BaseModel):
    redis_recovery_status: str
    db_pool_health: str
    pinecone_fallback_ok: bool
    measured: bool = False
    evidence_source: str = "not_configured"
    warnings: List[str] = Field(default_factory=list)

class ReadinessScores(BaseModel):
    security_score: float
    reliability_score: float
    performance_score: float
    ai_quality_score: float
    overall_score: float

class CertificationReport(BaseModel):
    verdict: str # NOT READY, PILOT READY, LIMITED PRODUCTION, PRODUCTION READY, ENTERPRISE READY
    timestamp: str
    scores: ReadinessScores
    benchmark: BenchmarkResult
    security: SecurityHeadersSummary
    performance: PerformanceBaseline
    chaos: ChaosReport
    active_versions: Dict[str, str] = Field(default_factory=dict)
    checklist_passed: bool
    blocking_issues: List[str] = Field(default_factory=list)
