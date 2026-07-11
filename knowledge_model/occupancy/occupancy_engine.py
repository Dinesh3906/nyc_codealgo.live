import math
from typing import Dict, Any
from ..config import settings

class OccupancyEngine:
    """
    Computes occupancy classification, occupant load, and required exit width
    based on space types and NYC building code factors.
    """

    def determine_classification(self, room_name: str) -> str:
        """
        Infers occupancy classification from room names.
        """
        name_clean = room_name.lower()
        if "classroom" in name_clean or "school" in name_clean or "class" in name_clean:
            return "educational_classroom"
        elif "office" in name_clean or "admin" in name_clean or "business" in name_clean:
            return "business"
        elif "assembly" in name_clean or "conference" in name_clean or "lobby" in name_clean or "auditorium" in name_clean:
            return "assembly_unconcentrated"
        elif "mercantile" in name_clean or "store" in name_clean or "retail" in name_clean:
            return "mercantile"
        elif "residential" in name_clean or "apartment" in name_clean or "bedroom" in name_clean:
            return "residential"
        elif "storage" in name_clean or "warehouse" in name_clean or "closet" in name_clean:
            return "storage"
        return "business" # Fallback default

    def calculate_occupancy_load(
        self,
        area_sq_ft: float,
        classification: str
    ) -> Dict[str, Any]:
        """
        Calculates occupant capacity and required door exit widths.
        """
        factor = settings.OCCUPANT_LOAD_FACTORS.get(classification, settings.OCCUPANT_LOAD_FACTORS["default"])
        
        # Occupant Load is rounded up to the nearest whole integer (standard code requirement)
        occupant_load = math.ceil(area_sq_ft / factor) if factor > 0 else 1
        occupant_load = max(1, occupant_load) # Minimum 1 person

        # Required door exit width (inches) = occupant load * level width factor (0.2 inches)
        required_exit_width = occupant_load * settings.EGRESS_LEVEL_WIDTH_FACTOR

        return {
            "occupancy_classification": classification,
            "occupant_load_factor": factor,
            "occupant_load": occupant_load,
            "required_exit_width_inches": required_exit_width
        }
