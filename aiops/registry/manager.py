from typing import List, Dict, Any
from ..schemas.models import ModelEntry, PromptEntry
import datetime

class RegistryManager:
    """
    Tracks and governs model revisions and prompt templates deployment cycles.
    """

    def __init__(self):
        # Default active models
        self.models = [
            ModelEntry(
                model_name="gemini-1.5-pro", version="v1.5.2", owner="AI Team",
                approval_status="APPROVED", description="Authoritative compliance reasoning model",
                last_tested="2026-07-10T12:00:00Z"
            ),
            ModelEntry(
                model_name="colbert-v2", version="v2.1.0", owner="Search Team",
                approval_status="APPROVED", description="Late-interaction neural reranker",
                last_tested="2026-07-10T14:30:00Z"
            ),
            ModelEntry(
                model_name="yolov8-drawings", version="v3.4.1", owner="Vision Team",
                approval_status="APPROVED", description="YOLO object detection weights",
                last_tested="2026-07-11T09:00:00Z"
            )
        ]

        # Default active prompts
        self.prompts = [
            PromptEntry(
                prompt_id="prompt-compliance-reasoning", version="v1.4",
                template="Verify the following spatial parameters against context chunks: {context}",
                active=True, creator="Prompt Architect", avg_user_accuracy=0.985
            ),
            PromptEntry(
                prompt_id="prompt-context-categorization", version="v2.1",
                template="Categorize these building codes into requirements, exceptions, and definitions: {text}",
                active=True, creator="Prompt Architect", avg_user_accuracy=0.962
            )
        ]

    def list_models(self) -> List[ModelEntry]:
        return self.models

    def list_prompts(self) -> List[PromptEntry]:
        return self.prompts

    def register_model(self, entry: ModelEntry):
        self.models.append(entry)

    def register_prompt(self, entry: PromptEntry):
        # Mark previous prompt ID versions as inactive
        for p in self.prompts:
            if p.prompt_id == entry.prompt_id:
                p.active = False
        self.prompts.append(entry)
