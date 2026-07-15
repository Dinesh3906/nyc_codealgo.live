import json
from pathlib import Path
from typing import List, Dict, Any
from ..config import settings

class RegulationMonitor:
    """
    Reads discovered regulatory source changes from a crawler output artifact.
    """

    def __init__(self):
        self.state_db = {}

    def check_for_source_updates(self) -> List[Dict[str, Any]]:
        """
        Returns changed files requiring ingestion from REGULATION_UPDATES_PATH.
        """
        if not settings.REGULATION_UPDATES_PATH:
            return []

        path = Path(settings.REGULATION_UPDATES_PATH)
        if not path.exists():
            raise RuntimeError(f"Configured REGULATION_UPDATES_PATH does not exist: {path}")

        with path.open("r", encoding="utf-8") as fh:
            payload = json.load(fh)

        updates = payload.get("updates") if isinstance(payload, dict) else payload
        if not isinstance(updates, list):
            raise RuntimeError("Regulation update artifact must be a list or an object with an updates list.")

        return updates
