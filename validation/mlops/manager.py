from typing import Dict
from ..config import settings

class MLOpsVersionRegistry:
    """
    Registers active LLM, prompt, and rule indexes deployment states
    to maintain reproducible predictions across model releases.
    """

    def get_active_registry(self) -> Dict[str, str]:
        """
        Retrieves active model hashes.
        """
        return {
            "embedding_model": settings.ACTIVE_EMBEDDING_MODEL,
            "reranker_model": settings.ACTIVE_RERANKER_MODEL,
            "generator_model": settings.ACTIVE_GENERATOR_MODEL,
            "ruleset_version": "rules-v1.0.4-PROD",
            "drawing_yolo_weights": "yolov8-aec-drawings-v3.pt"
        }
