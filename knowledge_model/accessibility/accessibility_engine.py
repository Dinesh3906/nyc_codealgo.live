from typing import Dict, Any, List
from ..config import settings

class AccessibilityEngine:
    """
    Evaluates wheelchair turning radius, door clearances, and ramp slopes
    against ADA/NYC Accessibility code limits.
    """

    def evaluate_room_accessibility(
        self,
        room_name: str,
        turning_clearance_inches: float,
        doors: List[Any]
    ) -> Dict[str, Any]:
        """
        Determines if a room satisfies turning radius and door width clearance.
        Restrooms and main spaces typically require 60" turning radius.
        """
        name_clean = room_name.lower()
        needs_turning_space = any(term in name_clean for term in ("restroom", "toilet", "bath", "kitchen", "office", "classroom"))

        is_turning_accessible = True
        if needs_turning_space:
            is_turning_accessible = turning_clearance_inches >= settings.ACCESSIBILITY_TURNING_RADIUS_INCHES

        # Verify all door clearances
        doors_accessible = True
        unknown_door_width = False
        for door in doors:
            width = door.get("width_inches") if isinstance(door, dict) else getattr(door, "width_inches", None)
            if width is None:
                unknown_door_width = True
                continue
            if width < settings.ACCESSIBILITY_DOOR_CLEARANCE_INCHES:
                doors_accessible = False
                break

        if unknown_door_width and doors_accessible:
            doors_accessible = None

        overall_accessible = None if doors_accessible is None else is_turning_accessible and doors_accessible

        return {
            "needs_turning_space": needs_turning_space,
            "turning_clearance_inches": turning_clearance_inches,
            "turning_clearance_satisfied": is_turning_accessible,
            "doors_clearance_satisfied": doors_accessible,
            "accessible": overall_accessible
        }

    def evaluate_ramp_accessibility(
        self,
        slope_percentage: float
    ) -> Dict[str, Any]:
        """
        Validates ramp slopes. Max slope allowed is 8.33% (1:12 ratio).
        """
        slope_satisfied = slope_percentage <= settings.ACCESSIBILITY_MAX_RAMP_SLOPE_PCT
        return {
            "slope_percentage": slope_percentage,
            "slope_satisfied": slope_satisfied,
            "accessible": slope_satisfied
        }
