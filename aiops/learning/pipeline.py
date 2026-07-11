from typing import List, Dict, Any
from ..schemas.models import FeedbackEntry
import datetime
import uuid

class ActiveLearningPipeline:
    """
    Consumes SME corrections, priorities low-scoring checks as Hard Examples,
    and grows training sets.
    """

    def __init__(self):
        self.hard_examples: List[FeedbackEntry] = []

    def ingest_user_feedback(
        self,
        job_id: str,
        user_id: str,
        user_role: str,
        rating: int,
        corrections: Dict[str, Any]
    ) -> FeedbackEntry:
        """
        Processes rating scorecards. Low ratings (< 3) are classified as hard training cases.
        """
        is_hard = (rating < 3 or len(corrections) > 0)
        timestamp = datetime.datetime.utcnow().isoformat() + "Z"

        entry = FeedbackEntry(
            feedback_id=str(uuid.uuid4()),
            job_id=job_id,
            user_id=user_id,
            user_role=user_role,
            rating=rating,
            corrections=corrections,
            is_hard_example=is_hard,
            timestamp=timestamp
        )

        if is_hard:
            self.hard_examples.append(entry)

        return entry

    def get_hard_examples(self) -> List[FeedbackEntry]:
        return self.hard_examples
