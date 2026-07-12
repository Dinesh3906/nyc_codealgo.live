import uuid
from typing import List, Tuple
from shapely.geometry import Point, Polygon
from document_ingestion.models import Page as IngestionPage
from ..models import SemanticBuildingObject, ObjectRelationship, ObjectRelationshipType
from ..config import settings

class AnnotationAssociator:
    """
    Associates text labels (room numbers, door tags, dimensions) to target
    engineering objects using polygon containment and spatial indexing heuristics.
    """

    def associate_annotations(
        self, 
        page: IngestionPage, 
        building_objects: List[SemanticBuildingObject],
        page_idx: int
    ) -> Tuple[List[SemanticBuildingObject], List[ObjectRelationship]]:
        """
        Scans text entries and groups them to matching building entities.
        Returns the updated building objects and a list of relationships.
        """
        relationships: List[ObjectRelationship] = []
        # Sanitize inputs
        from document_ingestion.models import TextObject, OCRObject
        text_objects = [
            TextObject(**t) if isinstance(t, dict) else t
            for t in page.text_objects
        ]
        ocr_objects = [
            OCRObject(**o) if isinstance(o, dict) else o
            for o in (getattr(page, "ocr_objects", []) or [])
        ]

        all_text_objs = text_objects + [
            type('obj', (object,), {"coordinates": o.coordinates, "text": o.text, "id": o.id})()
            for o in ocr_objects
        ]

        # Separe room objects and point-based objects
        rooms = [o for o in building_objects if o.object_class == "ROOM"]
        doors_windows = [o for o in building_objects if o.object_class in ("DOOR", "WINDOW")]
        symbols = [o for o in building_objects if o.object_class not in ("ROOM", "WALL", "DOOR", "WINDOW")]

        for obj in all_text_objs:
            text_val = obj.text.strip()
            text_val_lower = text_val.lower()
            
            # Retrieve text bounding box center point
            lbl_box = obj.coordinates
            center_x = (lbl_box.xmin + lbl_box.xmax) / 2.0
            center_y = (lbl_box.ymin + lbl_box.ymax) / 2.0
            point = Point(center_x, center_y)

            # 1. Room Name / Number Association (Containment check)
            # e.g. text like "OFFICE 101", "CONFERENCE", "WC"
            is_room_label = any(
                term in text_val_lower or re.match(r"^[0-9]{3}[A-Z]?$", text_val)
                for term in ["office", "room", "lobby", "corridor", "hall", "toilet", "bath", "kitchen", "closet"]
            )
            
            if is_room_label or len(text_val) > 4:
                for room in rooms:
                    if room.polygon:
                        poly = Polygon(room.polygon)
                        if poly.contains(point):
                            # Link label to Room attributes
                            if "room_name" in room.attributes:
                                room.attributes["room_name"] += " " + text_val
                            else:
                                room.attributes["room_name"] = text_val
                            
                            # Add text ID to source refs
                            if obj.id not in room.source_refs:
                                room.source_refs.append(obj.id)
                            break

            # 2. Door/Window Tag Proximity checks (Distance check)
            # e.g. text like "D-1", "W-2"
            if re.match(r"^[DWdw]-?[0-9]+$", text_val):
                best_match = None
                min_dist = float("inf")
                
                for dw in doors_windows:
                    dw_center_x = (dw.coordinates.xmin + dw.coordinates.xmax) / 2.0
                    dw_center_y = (dw.coordinates.ymin + dw.coordinates.ymax) / 2.0
                    
                    dist = ((center_x - dw_center_x)**2 + (center_y - dw_center_y)**2)**0.5
                    if dist < min_dist and dist <= settings.TEXT_ASSOCIATION_DISTANCE_LIMIT_PTS:
                        min_dist = dist
                        best_match = dw

                if best_match:
                    best_match.attributes["tag"] = text_val
                    if obj.id not in best_match.source_refs:
                        best_match.source_refs.append(obj.id)

            # 3. Fire Symbol Annotation checks
            # e.g. linking "FE" callout text to symbol
            if text_val_lower in ("fe", "sd", "ext"):
                best_match = None
                min_dist = float("inf")
                for sym in symbols:
                    sym_center_x = (sym.coordinates.xmin + sym.coordinates.xmax) / 2.0
                    sym_center_y = (sym.coordinates.ymin + sym.coordinates.ymax) / 2.0
                    dist = ((center_x - sym_center_x)**2 + (center_y - sym_center_y)**2)**0.5
                    
                    if dist < min_dist and dist <= 30.0: # Close range
                        min_dist = dist
                        best_match = sym

                if best_match:
                    best_match.attributes["tag"] = text_val
                    if obj.id not in best_match.source_refs:
                        best_match.source_refs.append(obj.id)

        # 4. Generate Relationships based on room containment
        for sym in symbols + doors_windows:
            sym_center_x = (sym.coordinates.xmin + sym.coordinates.xmax) / 2.0
            sym_center_y = (sym.coordinates.ymin + sym.coordinates.ymax) / 2.0
            pt = Point(sym_center_x, sym_center_y)
            
            for room in rooms:
                if room.polygon:
                    poly = Polygon(room.polygon)
                    if poly.contains(pt) or poly.touches(pt):
                        relationships.append(
                            ObjectRelationship(
                                id=f"rel-in-room-{uuid.uuid4()}",
                                source_id=sym.id,
                                target_id=room.id,
                                rel_type=ObjectRelationshipType.IN_ROOM,
                                confidence=0.95
                            )
                        )
                        break

        return building_objects, relationships
import re
