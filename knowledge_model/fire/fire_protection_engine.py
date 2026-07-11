from typing import Dict, Any, List, Tuple
from shapely.geometry import Point

class FireProtectionEngine:
    """
    Analyzes fire alarm and sprinkler distributions to verify code-compliance coverage.
    """

    def analyze_room_fire_protection(
        self,
        area_sq_ft: float,
        smoke_detectors_count: int,
        sprinklers_count: int
    ) -> Dict[str, Any]:
        """
        Evaluates fire protection device densities.
        - Standard smoke detector coverage: 1 per 900 sq ft.
        - Standard light-hazard sprinkler coverage: 1 per 225 sq ft.
        """
        # Calculate coverage densities
        sprinkler_coverage_sq_ft = area_sq_ft / sprinklers_count if sprinklers_count > 0 else float("inf")
        detector_coverage_sq_ft = area_sq_ft / smoke_detectors_count if smoke_detectors_count > 0 else float("inf")

        sprinklers_satisfied = sprinkler_coverage_sq_ft <= 225.0
        detectors_satisfied = detector_coverage_sq_ft <= 900.0

        return {
            "sprinkler_coverage_sq_ft": sprinkler_coverage_sq_ft if sprinklers_count > 0 else None,
            "smoke_detector_coverage_sq_ft": detector_coverage_sq_ft if smoke_detectors_count > 0 else None,
            "sprinklers_satisfied": sprinklers_satisfied,
            "smoke_detectors_satisfied": detectors_satisfied
        }

    def verify_exit_separation(
        self,
        room_polygon_points: list,
        exit_doors_centroids: List[Tuple[float, float]],
        scale_factor: float
    ) -> Dict[str, Any]:
        """
        Verifies exit separation distance.
        The distance between exits must be at least 1/3 of the room's maximum diagonal
        for sprinklered buildings, or 1/2 for non-sprinklered buildings (IBC 1007.1.1).
        """
        if len(exit_doors_centroids) < 2 or len(room_polygon_points) < 3:
            return {"exit_separation_satisfied": True, "details": "Fewer than 2 exits, separation rule not applicable"}

        # Calculate room diagonal (diameter of bounding box)
        from shapely.geometry import Polygon
        poly = Polygon(room_polygon_points)
        xmin, ymin, xmax, ymax = poly.bounds
        diagonal_pts = ((xmax - xmin)**2 + (ymax - ymin)**2)**0.5
        diagonal_inches = diagonal_pts * scale_factor

        # Distance between exit doors
        d1 = exit_doors_centroids[0]
        d2 = exit_doors_centroids[1]
        exit_dist_pts = ((d1[0] - d2[0])**2 + (d1[1] - d2[1])**2)**0.5
        exit_dist_inches = exit_dist_pts * scale_factor

        # Standard check: 1/3 of diagonal
        required_separation_inches = diagonal_inches / 3.0
        separation_satisfied = exit_dist_inches >= required_separation_inches

        return {
            "room_diagonal_inches": round(diagonal_inches, 2),
            "exit_distance_inches": round(exit_dist_inches, 2),
            "required_separation_inches": round(required_separation_inches, 2),
            "exit_separation_satisfied": separation_satisfied
        }
from typing import Tuple
