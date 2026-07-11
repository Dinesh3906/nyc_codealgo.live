import re
from typing import Dict, Any, List
from ..schemas.models import ChangeDelta

class SemanticDiffEngine:
    """
    Analyzes updates between regulation versions, isolating numeric parameter shifts.
    """

    def parse_numeric_parameters(self, text: str) -> Dict[str, float]:
        """
        Regex extracts dimension values like '60 inches' or '8.33%'.
        """
        params = {}
        # Match pattern: number followed by spaces and units
        pattern = r"(\d+(?:\.\d+)?)\s*(inches|inch|in|feet|ft|%|percent)\b"
        
        for match in re.finditer(pattern, text.lower()):
            val = float(match.group(1))
            unit = match.group(2)
            # Standardize keys
            params[unit] = val

        return params

    def compute_semantic_diff(
        self,
        section_id: str,
        old_text: str,
        new_text: str
    ) -> ChangeDelta:
        """
        Identifies text modifications and alerts on numeric limit increases/decreases.
        """
        old_params = self.parse_numeric_parameters(old_text)
        new_params = self.parse_numeric_parameters(new_text)

        summary = "Text wording amended. "
        for unit, new_val in new_params.items():
            if unit in old_params:
                old_val = old_params[unit]
                if old_val != new_val:
                    summary += f"CRITICAL: Numeric parameter for '{unit}' shifted from {old_val} to {new_val}. "
            else:
                summary += f"Added parameter {new_val} {unit}. "

        return ChangeDelta(
            section_id=section_id,
            action="MODIFIED",
            old_text=old_text,
            new_text=new_text,
            diff_summary=summary.strip()
        )
