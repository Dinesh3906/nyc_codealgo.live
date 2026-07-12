import uuid
from typing import List
from shapely.geometry import Polygon, Point, LineString
from object_detection.models import SemanticBuildingObject
from ..models import BuildingGraphEdge

class TopologyEngine:
    """
    Analyzes physical spatial layout overlap to compute containment, adjacencies,
    and door-room connections.
    """

    def extract_topological_relations(
        self,
        building_objects: List[SemanticBuildingObject],
        page_idx: int
    ) -> List[BuildingGraphEdge]:
        """
        Uses Shapely geometry operations to construct a list of topological graph edges.
        """
        edges: List[BuildingGraphEdge] = []
        
        rooms = [o for o in building_objects if o.object_class == "ROOM" and o.page_idx == page_idx]
        doors = [o for o in building_objects if o.object_class == "DOOR" and o.page_idx == page_idx]
        walls = [o for o in building_objects if o.object_class == "WALL" and o.page_idx == page_idx]
        symbols = [o for o in building_objects if o.object_class not in ("ROOM", "DOOR", "WALL") and o.page_idx == page_idx]

        # 1. Door Connectivity
        # A door typically connects 1 or 2 rooms.
        # Find which rooms are within close proximity or intersect the door bounding frame
        for door in doors:
            door_box = Polygon(door.polygon)
            connected_rooms = []
            
            for room in rooms:
                room_poly = Polygon(room.polygon)
                # Expand door box slightly to ensure it overlaps with room boundary line
                if room_poly.intersects(door_box.buffer(3.0)):
                    connected_rooms.append(room)

            # If it connects rooms, add connected_to edges
            for room in connected_rooms:
                edges.append(
                    BuildingGraphEdge(
                        id=f"edge-top-{uuid.uuid4()}",
                        source_id=door.id,
                        target_id=room.id,
                        rel_type="connected_to",
                        confidence=0.95,
                        reason="Door polygon intersects/touches Room polygon boundary",
                        evidence={"door_id": door.id, "room_id": room.id}
                    )
                )

        # 2. Wall Bounding Room
        for wall in walls:
            wall_line = LineString(wall.polygon)
            for room in rooms:
                room_poly = Polygon(room.polygon)
                # Check if wall bounds the room (touches or intersects boundary)
                if room_poly.boundary.intersects(wall_line.buffer(3.0)):
                    edges.append(
                        BuildingGraphEdge(
                            id=f"edge-top-{uuid.uuid4()}",
                            source_id=wall.id,
                            target_id=room.id,
                            rel_type="bounds",
                            confidence=0.90,
                            reason="Wall line coordinates outline the Room polygon boundary",
                            evidence={"wall_id": wall.id, "room_id": room.id}
                        )
                    )

        # 3. Containment (Symbols in Room)
        for sym in symbols:
            sym_box = sym.coordinates
            xmin = sym_box.get("xmin") if isinstance(sym_box, dict) else sym_box.xmin
            xmax = sym_box.get("xmax") if isinstance(sym_box, dict) else sym_box.xmax
            ymin = sym_box.get("ymin") if isinstance(sym_box, dict) else sym_box.ymin
            ymax = sym_box.get("ymax") if isinstance(sym_box, dict) else sym_box.ymax
            
            center_pt = Point((xmin + xmax)/2.0, (ymin + ymax)/2.0)
            
            for room in rooms:
                room_poly = Polygon(room.polygon)
                if room_poly.contains(center_pt):
                    edges.append(
                        BuildingGraphEdge(
                            id=f"edge-top-{uuid.uuid4()}",
                            source_id=sym.id,
                            target_id=room.id,
                            rel_type="located_in",
                            confidence=0.98,
                            reason="Symbol coordinate center is contained within Room polygon loop",
                            evidence={"symbol_id": sym.id, "room_id": room.id}
                        )
                    )
                    break

        return edges

    def extract_multi_sheet_links(
        self,
        building_objects: List[SemanticBuildingObject]
    ) -> List[BuildingGraphEdge]:
        """
        Extracts cross-sheet connections for vertical circulation elements (Stairs/Elevators)
        across pages, matching by coordinate alignment or label references.
        """
        edges: List[BuildingGraphEdge] = []
        
        # Identify vertical circulation items (Stairs, Elevators)
        stairs_elevators = [
            o for o in building_objects
            if o.object_class in ("STAIR", "ELEVATOR")
        ]

        # Group by coordinates to find alignment across sheets (vertical stack check)
        for i in range(len(stairs_elevators)):
            s1 = stairs_elevators[i]
            for j in range(i + 1, len(stairs_elevators)):
                s2 = stairs_elevators[j]
                
                # Check if they are on different pages but align vertically
                if s1.page_idx != s2.page_idx and s1.object_class == s2.object_class:
                    s1_box = s1.coordinates
                    s2_box = s2.coordinates
                    s1_xmin = s1_box.get("xmin") if isinstance(s1_box, dict) else s1_box.xmin
                    s1_xmax = s1_box.get("xmax") if isinstance(s1_box, dict) else s1_box.xmax
                    s1_ymin = s1_box.get("ymin") if isinstance(s1_box, dict) else s1_box.ymin
                    s1_ymax = s1_box.get("ymax") if isinstance(s1_box, dict) else s1_box.ymax
                    s2_xmin = s2_box.get("xmin") if isinstance(s2_box, dict) else s2_box.xmin
                    s2_xmax = s2_box.get("xmax") if isinstance(s2_box, dict) else s2_box.xmax
                    s2_ymin = s2_box.get("ymin") if isinstance(s2_box, dict) else s2_box.ymin
                    s2_ymax = s2_box.get("ymax") if isinstance(s2_box, dict) else s2_box.ymax
                    c1 = ( (s1_xmin + s1_xmax)/2.0, (s1_ymin + s1_ymax)/2.0 )
                    c2 = ( (s2_xmin + s2_xmax)/2.0, (s2_ymin + s2_ymax)/2.0 )
                    
                    dist = ((c1[0] - c2[0])**2 + (c1[1] - c2[1])**2)**0.5
                    if dist <= 30.0: # Close alignment on sheet space indicates vertical floor stack
                        edges.append(
                            BuildingGraphEdge(
                                id=f"edge-ms-{uuid.uuid4()}",
                                source_id=s1.id,
                                target_id=s2.id,
                                rel_type="connects_floors",
                                confidence=0.88,
                                reason=f"Vertical circulation {s1.object_class} aligns spatially across page sheets",
                                evidence={"source_page": s1.page_idx, "target_page": s2.page_idx}
                            )
                        )

        return edges
