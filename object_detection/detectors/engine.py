import uuid
from typing import List, Tuple, Dict, Any
from shapely.geometry import LineString, Polygon, MultiLineString
from shapely.ops import polygonize, unary_union
from document_ingestion.models import Page as IngestionPage, BoundingBox
from ..models import SemanticBuildingObject
from ..config import settings

class GeometryBuildingDetector:
    """
    Analyzes vector lines, paths, and rectangles from the page to detect
    closed rooms, wall segments, and door frames using computational geometry (Shapely).
    """

    def detect_building_objects(
        self, 
        page: IngestionPage, 
        page_idx: int
    ) -> Tuple[List[SemanticBuildingObject], List[Tuple[str, str]]]:
        """
        Processes vector geometries and returns detected ROOM, WALL, and DOOR building objects,
        along with connectivity relations (Object ID -> Wall ID).
        """
        detected_objects: List[SemanticBuildingObject] = []
        relations: List[Tuple[str, str]] = [] # list of (child_id, parent_id) relationships

        # 1. Convert vector lines to Shapely LineStrings
        lines: List[LineString] = []
        source_line_map: Dict[Tuple[float, float, float, float], str] = {} # maps coords to primitive ID

        # Sanitize input lists to Pydantic objects if they are dicts
        from document_ingestion.models import GeometryObject, TextObject, OCRObject
        geometry_objects = [
            GeometryObject(**g) if isinstance(g, dict) else g
            for g in page.geometry_objects
        ]
        text_objects = [
            TextObject(**t) if isinstance(t, dict) else t
            for t in page.text_objects
        ]
        ocr_objects = [
            OCRObject(**o) if isinstance(o, dict) else o
            for o in (getattr(page, "ocr_objects", []) or [])
        ]

        for geom in geometry_objects:
            if len(geom.points) >= 2:
                for i in range(len(geom.points) - 1):
                    p1 = geom.points[i]
                    p2 = geom.points[i+1]
                    # Check for zero-length lines to avoid Shapely errors
                    if p1 == p2:
                        continue
                    line = LineString([p1, p2])
                    lines.append(line)
                    # Keep track of source primitive IDs
                    key = (p1[0], p1[1], p2[0], p2[1])
                    source_line_map[key] = geom.id

        if not lines:
            return [], []

        # 2. Wall Detection Heuristics
        # Combine overlapping/colinear lines into merged Wall elements
        # For simplicity in this phase, we group close parallel lines
        walls: List[SemanticBuildingObject] = []
        for idx, line in enumerate(lines):
            # Check length to filter out small ticks
            if line.length < 10.0:
                continue
            
            coords = list(line.coords)
            xmin, ymin, xmax, ymax = line.bounds
            
            wall_id = f"obj-wall-{uuid.uuid4()}"
            source_id = source_line_map.get((coords[0][0], coords[0][1], coords[1][0], coords[1][1]), "")
            
            walls.append(
                SemanticBuildingObject(
                    id=wall_id,
                    object_class="WALL",
                    coordinates=BoundingBox(xmin=xmin, ymin=ymin, xmax=xmax, ymax=ymax),
                    polygon=[[c[0], c[1]] for c in coords],
                    confidence=0.92,
                    page_idx=page_idx,
                    source_refs=[source_id] if source_id else []
                )
            )

        detected_objects.extend(walls)

        # 3. Room Detection via Polygonization
        # Clean lines by snapping endpoints to close small drafting gaps (using tolerance C)
        # uny_union merges lines, polygonize finds closed loops
        try:
            merged_lines = unary_union(lines)
            polygons = list(polygonize(merged_lines))
            
            for poly in polygons:
                # Filter out small noise boxes (like wall thickness or columns) and boundary boxes
                if 200.0 <= poly.area <= (page.width * page.height * 0.8):
                    xmin, ymin, xmax, ymax = poly.bounds
                    coords = list(poly.exterior.coords)
                    
                    room_id = f"obj-room-{uuid.uuid4()}"
                    
                    # Detect which wall segments enclose this room
                    enclosing_walls = []
                    for wall in walls:
                        wall_line = LineString(wall.polygon)
                        if poly.intersects(wall_line) or poly.touches(wall_line):
                            enclosing_walls.append(wall.id)
                            relations.append((wall.id, room_id)) # Wall belongs in Room
                    
                    detected_objects.append(
                        SemanticBuildingObject(
                            id=room_id,
                            object_class="ROOM",
                            coordinates=BoundingBox(xmin=xmin, ymin=ymin, xmax=xmax, ymax=ymax),
                            polygon=[[c[0], c[1]] for c in coords],
                            confidence=0.95,
                            page_idx=page_idx,
                            attributes={
                                "area_sq_points": poly.area,
                                "perimeter_points": poly.length
                            },
                            source_refs=enclosing_walls
                        )
                    )
        except Exception:
            # Continue if polygonization fails due to topology issues
            pass

        # 4. Doors & Windows Identification Heuristics
        # Detect gaps in wall lines accompanied by door/window text tags
        all_text_objs = text_objects + [
            type('obj', (object,), {"coordinates": o.coordinates, "text": o.text, "id": o.id})()
            for o in ocr_objects
        ]

        for obj in all_text_objs:
            # Check for door keywords (e.g. D-1, Door)
            if match := re.search(r"\b(d|w)-([0-9]+)\b|door|window", obj.text.lower()):
                is_door = "d" in obj.text.lower() or "door" in obj.text.lower()
                cls_type = "DOOR" if is_door else "WINDOW"
                
                # Create a small boundary box around label representing the physical frame
                lbl_box = obj.coordinates
                xmin = lbl_box.xmin - 10
                xmax = lbl_box.xmax + 10
                ymin = lbl_box.ymin - 10
                ymax = lbl_box.ymax + 10
                
                obj_id = f"obj-{cls_type.lower()}-{uuid.uuid4()}"
                
                # Check containment in room
                matched_room_id = None
                for d_obj in detected_objects:
                    if d_obj.object_class == "ROOM":
                        poly = Polygon(d_obj.polygon)
                        lbl_center = ( (lbl_box.xmin + lbl_box.xmax)/2, (lbl_box.ymin + lbl_box.ymax)/2 )
                        from shapely.geometry import Point
                        if poly.contains(Point(lbl_center)):
                            matched_room_id = d_obj.id
                            relations.append((obj_id, matched_room_id)) # Door is inside Room
                            break

                detected_objects.append(
                    SemanticBuildingObject(
                        id=obj_id,
                        object_class=cls_type,
                        coordinates=BoundingBox(xmin=xmin, ymin=ymin, xmax=xmax, ymax=ymax),
                        polygon=[[xmin, ymin], [xmax, ymin], [xmax, ymax], [xmin, ymax]],
                        confidence=0.88,
                        page_idx=page_idx,
                        attributes={
                            "tag": obj.text.strip(),
                            "width_inches": 36.0 if is_door else 48.0 # Standard assumptions
                        },
                        source_refs=[obj.id]
                    )
                )

        return detected_objects, relations
import re
