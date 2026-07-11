import re
from typing import List, Dict, Any, Tuple
from shapely.geometry import LineString, Point
from object_detection.models import SemanticBuildingObject
from ..config import settings

class GroundingEngine:
    """
    Grounds annotation texts (like dimensions or equipment callouts)
    specifically to their measured vector lines or target geometric entities.
    """

    def ground_annotations(
        self,
        building_objects: List[SemanticBuildingObject],
        raw_text_objs: List[Any],
        raw_geom_objs: List[Any]
    ) -> List[Tuple[str, str, float, Dict[str, Any]]]:
        """
        Scans text objects for dimensions/labels and associates them to the nearest
        matching geometry lines/walls.
        Returns a list of tuples: (text_id, object_id, confidence, details)
        """
        grounded_links: List[Tuple[str, str, float, Dict[str, Any]]] = []

        # Convert raw geometry objects to LineStrings
        lines: List[Tuple[str, LineString]] = []
        for g in raw_geom_objs:
            geom_points = g.get("points", []) if isinstance(g, dict) else getattr(g, "points", [])
            geom_id = g.get("id", "") if isinstance(g, dict) else getattr(g, "id", "")
            if len(geom_points) >= 2:
                for i in range(len(geom_points) - 1):
                    p1 = geom_points[i]
                    p2 = geom_points[i+1]
                    if p1 != p2:
                        lines.append((geom_id, LineString([p1, p2])))

        for txt in raw_text_objs:
            txt_val = txt.get("text", "") if isinstance(txt, dict) else getattr(txt, "text", "")
            txt_id = txt.get("id", "") if isinstance(txt, dict) else getattr(txt, "id", "")
            
            # Check if text is a dimension (e.g. 10'-6", 24", 12.5')
            if re.search(r"\b\d+(['\"-]\d+[\"\']?)?\b", txt_val):
                lbl_box = txt.get("coordinates") if isinstance(txt, dict) else getattr(txt, "coordinates", None)
                if not lbl_box:
                    continue
                
                # Get label coordinates
                xmin = lbl_box.get("xmin") if isinstance(lbl_box, dict) else getattr(lbl_box, "xmin", 0.0)
                xmax = lbl_box.get("xmax") if isinstance(lbl_box, dict) else getattr(lbl_box, "xmax", 0.0)
                ymin = lbl_box.get("ymin") if isinstance(lbl_box, dict) else getattr(lbl_box, "ymin", 0.0)
                ymax = lbl_box.get("ymax") if isinstance(lbl_box, dict) else getattr(lbl_box, "ymax", 0.0)
                
                lbl_center = Point((xmin + xmax)/2.0, (ymin + ymax)/2.0)

                # Find closest parallel line or wall
                best_match_wall = None
                min_dist = float("inf")

                for b_obj in building_objects:
                    if b_obj.object_class == "WALL" and b_obj.polygon:
                        wall_line = LineString(b_obj.polygon)
                        dist = wall_line.distance(lbl_center)
                        
                        if dist < min_dist and dist <= settings.GROUNDING_DISTANCE_LIMIT_PTS:
                            min_dist = dist
                            best_match_wall = b_obj

                if best_match_wall:
                    confidence = max(0.5, 1.0 - (min_dist / settings.GROUNDING_DISTANCE_LIMIT_PTS))
                    grounded_links.append((
                        txt_id,
                        best_match_wall.id,
                        confidence,
                        {
                            "text_val": txt_val,
                            "measured_distance_points": min_dist,
                            "matching_strategy": "wall_proximity"
                        }
                    ))

        return grounded_links
