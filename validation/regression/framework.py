from typing import Dict, Any, List
from ..schemas.models import BenchmarkResult
from ..config import settings

class RegressionFramework:
    """
    Compares the current certification results against historical baseline targets
    to flag code regressions before deployment.
    """

    def scan_for_regressions(
        self,
        current_benchmark: BenchmarkResult,
        avg_latency_ms: float
    ) -> List[str]:
        """
        Validates current outputs against baseline configuration limits.
        """
        regressions = []

        if current_benchmark.precision < settings.TARGET_PRECISION:
            regressions.append(
                f"Precision regression detected: baseline target {settings.TARGET_PRECISION}, "
                f"current {current_benchmark.precision}"
            )
        if current_benchmark.recall < settings.TARGET_RECALL:
            regressions.append(
                f"Recall regression detected: baseline target {settings.TARGET_RECALL}, "
                f"current {current_benchmark.recall}"
            )
        if current_benchmark.iou < settings.TARGET_IOU:
            regressions.append(
                f"Spatial IoU regression detected: baseline target {settings.TARGET_IOU}, "
                f"current {current_benchmark.iou}"
            )
        if avg_latency_ms > settings.MAX_LATENCY_MS:
            regressions.append(
                f"Latency regression detected: maximum limit {settings.MAX_LATENCY_MS} ms, "
                f"current average {avg_latency_ms} ms"
            )

        return regressions
