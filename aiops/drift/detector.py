import math
from typing import List
from ..config import settings

class DriftDetector:
    """
    Computes cosine similarities on query embedding vectors to flag distribution shifts.
    """

    def compute_cosine_similarity(
        self,
        vec_a: List[float],
        vec_b: List[float]
    ) -> float:
        """
        Calculates cosine similarity between two float vectors.
        """
        if len(vec_a) != len(vec_b):
            return 0.0

        dot = sum(a * b for a, b in zip(vec_a, vec_b))
        norm_a = math.sqrt(sum(a * a for a in vec_a))
        norm_b = math.sqrt(sum(b * b for b in vec_b))

        denominator = norm_a * norm_b
        return dot / denominator if denominator > 0 else 0.0

    def check_for_semantic_drift(
        self,
        baseline_embeddings: List[List[float]],
        current_embeddings: List[List[float]]
    ) -> bool:
        """
        Compares average similarities across baseline & current distributions to spot drift.
        """
        if not baseline_embeddings or not current_embeddings:
            return False

        # Average centroids of baseline and current query spaces
        size_a = len(baseline_embeddings[0])
        centroid_a = [sum(row[i] for row in baseline_embeddings) / len(baseline_embeddings) for i in range(size_a)]
        centroid_b = [sum(row[i] for row in current_embeddings) / len(current_embeddings) for i in range(size_a)]

        similarity = self.compute_cosine_similarity(centroid_a, centroid_b)
        
        # Drift alarm sounds if similarity drops below threshold
        return similarity < settings.DRIFT_THRESHOLD_COSINE
