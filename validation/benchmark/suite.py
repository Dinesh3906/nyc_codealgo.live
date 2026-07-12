import json
from pathlib import Path
from typing import List
from ..schemas.models import BenchmarkResult
from ..config import settings

class AIBenchmarkSuite:
    """
    Evaluates drawing understanding, regulatory retrieval, and rule decisions
    against SME-validated golden datasets.
    """

    def compute_spatial_iou(
        self,
        pred_poly: List[List[float]],
        gt_poly: List[List[float]]
    ) -> float:
        """
        Calculates Intersection-over-Union (IoU) of shapely polygons.
        """
        from shapely.geometry import Polygon
        try:
            poly_p = Polygon(pred_poly)
            poly_g = Polygon(gt_poly)
            
            if not poly_p.is_valid:
                poly_p = poly_p.buffer(0)
            if not poly_g.is_valid:
                poly_g = poly_g.buffer(0)

            intersection = poly_p.intersection(poly_g).area
            union = poly_p.union(poly_g).area
            
            return intersection / union if union > 0 else 0.0
        except Exception:
            return 0.0

    def run_benchmark_evaluations(self) -> BenchmarkResult:
        """
        Runs evaluations over the active regression set, calculating F1, NDCG, and IoU.
        """
        if not settings.GOLDEN_DATASET_PATH:
            return BenchmarkResult(
                precision=0.0,
                recall=0.0,
                f1=0.0,
                iou=0.0,
                ndcg=0.0,
                citation_accuracy=0.0,
                evaluated=False,
                warnings=["GOLDEN_DATASET_PATH is not configured; AI quality is unverified."]
            )

        dataset_path = Path(settings.GOLDEN_DATASET_PATH)
        if not dataset_path.exists():
            return BenchmarkResult(
                precision=0.0,
                recall=0.0,
                f1=0.0,
                iou=0.0,
                ndcg=0.0,
                citation_accuracy=0.0,
                evaluated=False,
                evidence_source=str(dataset_path),
                warnings=["Configured golden dataset file does not exist."]
            )

        with dataset_path.open("r", encoding="utf-8") as fh:
            records = json.load(fh)

        if not isinstance(records, list) or not records:
            return BenchmarkResult(
                precision=0.0,
                recall=0.0,
                f1=0.0,
                iou=0.0,
                ndcg=0.0,
                citation_accuracy=0.0,
                evaluated=False,
                evidence_source=str(dataset_path),
                warnings=["Golden dataset is empty or malformed."]
            )

        # This loader accepts precomputed, externally generated benchmark rows.
        # It does not fabricate scores when the evidence file is absent.
        precision = sum(float(r.get("precision", 0.0)) for r in records) / len(records)
        recall = sum(float(r.get("recall", 0.0)) for r in records) / len(records)
        iou = sum(float(r.get("iou", 0.0)) for r in records) / len(records)
        ndcg = sum(float(r.get("ndcg", 0.0)) for r in records) / len(records)
        citation_accuracy = sum(float(r.get("citation_accuracy", 0.0)) for r in records) / len(records)
        f1 = (2 * precision * recall) / (precision + recall) if precision + recall else 0.0

        return BenchmarkResult(
            precision=round(precision, 3),
            recall=round(recall, 3),
            f1=round(f1, 3),
            iou=round(iou, 3),
            ndcg=round(ndcg, 3),
            citation_accuracy=round(citation_accuracy, 3),
            evaluated=True,
            sample_count=len(records),
            evidence_source=str(dataset_path)
        )
