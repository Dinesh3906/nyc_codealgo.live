from shapely.geometry import Polygon, LineString
from typing import Dict, Any, Optional
from ..config import settings

class MeasurementEngine:
    """
    Computes deterministic geometric properties (area, perimeter, clearance, width)
    converting canvas point spaces to physical architectural scale units (inches/feet).
    """

    def parse_scale_factor(self, scale_str: Optional[str]) -> float:
        """
        Parses scale string (e.g. "1/4\" = 1'-0\"" or "1/8\" = 1'-0\"") to retrieve
        the points-to-inches multiplier.
        - "1/4\" = 1'-0\"" -> 1/4 inch on paper = 1 foot. 1/4 inch is 18 points.
          So 18 points = 12 inches, which means 1 point = 12 / 18 = 0.666 inches.
        - "1/8\" = 1'-0\"" -> 1/8 inch is 9 points. So 9 points = 12 inches,
          which means 1 point = 12 / 9 = 1.333 inches.
        """
        if not scale_str:
            raise ValueError("Drawing scale is required for physical measurement calculations.")

        scale_str_clean = scale_str.lower().replace(" ", "")
        
        # Check standard 1/4" scale
        if "1/4" in scale_str_clean:
            return 12.0 / 18.0
        # Check standard 1/8" scale
        elif "1/8" in scale_str_clean:
            return 12.0 / 9.0
        # Check standard 1/16" scale
        elif "1/16" in scale_str_clean:
            return 12.0 / 4.5
        # Check scale in format 1:100 or similar
        elif ":" in scale_str_clean:
            # e.g., 1:100 means 1 unit = 100 units.
            # Assuming standard PDF rendering space scale
            return 1.0

        raise ValueError(f"Unsupported drawing scale format: {scale_str}")

    def calculate_space_metrics(
        self,
        polygon_points: list,
        scale_factor: float
    ) -> Dict[str, float]:
        """
        Calculates area, perimeter, and turning radius clearance for a Room polygon.
        - Area in square feet.
        - Perimeter in feet.
        - Turning radius in inches.
        """
        if len(polygon_points) < 3:
            return {"area_sq_ft": 0.0, "perimeter_ft": 0.0, "turning_clearance_inches": 0.0}

        poly = Polygon(polygon_points)
        
        # 1. Area calculation
        # shapely area is in sq points.
        # sq points -> sq inches -> sq feet
        area_sq_pts = poly.area
        area_sq_inches = area_sq_pts * (scale_factor ** 2)
        area_sq_ft = area_sq_inches / 144.0

        # 2. Perimeter calculation
        # perimeter in points -> inches -> feet
        perimeter_pts = poly.length
        perimeter_inches = perimeter_pts * scale_factor
        perimeter_ft = perimeter_inches / 12.0

        # 3. Turning clearance calculation (largest inscribed circle approximation)
        # We calculate the distance from centroid to exterior boundary
        centroid = poly.centroid
        dist_to_boundary_pts = centroid.distance(poly.boundary)
        # Turning clearance diameter = 2 * radius
        turning_clearance_inches = (dist_to_boundary_pts * 2.0) * scale_factor

        return {
            "area_sq_ft": round(area_sq_ft, 2),
            "perimeter_ft": round(perimeter_ft, 2),
            "turning_clearance_inches": round(turning_clearance_inches, 2)
        }

    def calculate_linear_dim(
        self,
        coords: Any,
        scale_factor: float
    ) -> float:
        """
        Calculates width/length in inches.
        """
        xmin = coords.get("xmin") if isinstance(coords, dict) else coords.xmin
        xmax = coords.get("xmax") if isinstance(coords, dict) else coords.xmax
        ymin = coords.get("ymin") if isinstance(coords, dict) else coords.ymin
        ymax = coords.get("ymax") if isinstance(coords, dict) else coords.ymax

        width_pts = xmax - xmin
        height_pts = ymax - ymin
        
        # Choose dominant dimension
        len_pts = max(width_pts, height_pts)
        len_inches = len_pts * scale_factor
        return round(len_inches, 2)
