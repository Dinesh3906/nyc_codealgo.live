import re
from typing import List, Dict, Any, Optional
from spatial_reasoning.models import BuildingGraph
from ..schemas.models import (
    UnifiedBuildingKnowledgeModel, IfcProject, IfcBuildingStorey, IfcSpace,
    IfcDoor, IfcWindow, IfcWall, IfcSensor, IfcFlowTerminal, EgressPathInfo
)
from ..geometry.measurement_engine import MeasurementEngine
from ..occupancy.occupancy_engine import OccupancyEngine
from ..accessibility.accessibility_engine import AccessibilityEngine
from ..fire.fire_protection_engine import FireProtectionEngine
from spatial_reasoning.routing.path_analyzer import EgressPathAnalyzer

class KnowledgeModelBuilder:
    """
    Orchestrates geometry, occupancy, accessibility, and fire calculators
    to build the Unified Building Knowledge Model from a Building Graph.
    """

    def __init__(self):
        self.measure_engine = MeasurementEngine()
        self.occupancy_engine = OccupancyEngine()
        self.access_engine = AccessibilityEngine()
        self.fire_engine = FireProtectionEngine()
        self.egress_analyzer = EgressPathAnalyzer()

    def _dimension_to_inches(self, value: Any) -> Optional[float]:
        if value is None:
            return None
        if isinstance(value, (int, float)):
            return round(float(value), 2)

        text = str(value).strip().lower()
        if not text:
            return None

        feet_inches = re.search(r"(\d+(?:\.\d+)?)\s*(?:'|ft|feet|-)\s*(\d+(?:\.\d+)?)?\s*(?:\"|in|inch|inches)?", text)
        if feet_inches:
            feet = float(feet_inches.group(1))
            inches = float(feet_inches.group(2) or 0.0)
            return round((feet * 12.0) + inches, 2)

        inches = re.search(r"(\d+(?:\.\d+)?)\s*(?:\"|in|inch|inches)\b", text)
        if inches:
            return round(float(inches.group(1)), 2)

        plain_number = re.fullmatch(r"\d+(?:\.\d+)?", text)
        if plain_number:
            return round(float(text), 2)

        return None

    def _attribute_dimension(self, attributes: Dict[str, Any], keys: List[str]) -> Optional[float]:
        normalized = {str(k).lower(): v for k, v in attributes.items()}
        for key in keys:
            if key in normalized:
                parsed = self._dimension_to_inches(normalized[key])
                if parsed is not None:
                    return parsed
        return None

    def _measured_linear_dimension(self, node: Any, scale_factor: float, keys: List[str]) -> Optional[float]:
        scheduled = self._attribute_dimension(node.attributes, keys)
        if scheduled is not None:
            return scheduled
        if node.attributes.get("geometry_source") == "label_extent":
            return None
        return self.measure_engine.calculate_linear_dim(node.coordinates, scale_factor)

    def build_knowledge_model(self, graph: BuildingGraph) -> UnifiedBuildingKnowledgeModel:
        """
        Processes building graph nodes and edges to build the hierarchical UBKM output.
        """
        warnings = []
        
        # 1. Parse Scale Factor
        scale_str = graph.metadata.get("scale")
        scale_factor = self.measure_engine.parse_scale_factor(scale_str)

        # 2. Extract entities from graph
        rooms_nodes = [n for n in graph.nodes.values() if n.object_class == "ROOM"]
        doors_nodes = [n for n in graph.nodes.values() if n.object_class == "DOOR"]
        walls_nodes = [n for n in graph.nodes.values() if n.object_class == "WALL"]
        window_nodes = [n for n in graph.nodes.values() if n.object_class == "WINDOW"]
        sensor_nodes = [n for n in graph.nodes.values() if n.object_class == "SMOKE_DETECTOR"]
        terminal_nodes = [n for n in graph.nodes.values() if n.object_class in ("SPRINKLER", "HVAC_DIFFUSER")]

        # Group edges by source/target for fast adjacency lookups
        adjacency: Dict[str, List[Any]] = {}
        for edge in graph.edges:
            adjacency.setdefault(edge.source_id, []).append(edge)
            adjacency.setdefault(edge.target_id, []).append(edge)

        # 3. Process rooms into IfcSpaces
        spaces_by_floor: Dict[int, Dict[str, IfcSpace]] = {}
        
        for r_node in rooms_nodes:
            r_id = r_node.id
            r_name = r_node.attributes.get("room_name", f"Space {r_id}")
            r_polygon = r_node.attributes.get("polygon", [])
            
            # If room polygon is empty, fallback to bounding box polygon
            if not r_polygon:
                box = r_node.coordinates
                r_polygon = [[box.xmin, box.ymin], [box.xmax, box.ymin], [box.xmax, box.ymax], [box.xmin, box.ymax]]

            # Run measurement calculations
            metrics = self.measure_engine.calculate_space_metrics(r_polygon, scale_factor)
            
            # Run occupancy calculations
            classification = self.occupancy_engine.determine_classification(r_name)
            occ_data = self.occupancy_engine.calculate_occupancy_load(metrics["area_sq_ft"], classification)
            if classification == "unknown":
                warnings.append(f"Room {r_name} occupancy classification could not be inferred from drawing evidence.")

            # Find connected physical entities by traversing adjacency edges
            connected_doors: List[IfcDoor] = []
            connected_walls: List[IfcWall] = []
            connected_windows: List[IfcWindow] = []
            connected_sensors: List[IfcSensor] = []
            connected_terminals: List[IfcFlowTerminal] = []
            connected_space_ids: List[str] = []

            exit_centroids = []

            for edge in adjacency.get(r_id, []):
                other_id = edge.target_id if edge.source_id == r_id else edge.source_id
                other_node = graph.nodes.get(other_id)
                if not other_node:
                    continue

                if other_node.object_class == "DOOR":
                    w_inch = self._measured_linear_dimension(
                        other_node,
                        scale_factor,
                        ["width_inches", "clear_width_inches", "clear_width", "door_width", "width", "size"]
                    )
                    h_inch = self._attribute_dimension(other_node.attributes, ["height_inches", "height", "door_height"])
                    if w_inch is None:
                        warnings.append(f"Door {other_id} width could not be measured from geometry or schedule evidence.")
                    
                    # Centroid of door
                    box = other_node.coordinates
                    exit_centroids.append(((box.xmin + box.xmax)/2.0, (box.ymin + box.ymax)/2.0))

                    connected_doors.append(
                        IfcDoor(
                            id=other_id,
                            width_inches=w_inch,
                            height_inches=h_inch,
                            fire_rating_minutes=other_node.attributes.get("fire_rating_minutes"),
                            swing_direction=other_node.attributes.get("swing_direction"),
                            accessible=w_inch >= 32.0 if w_inch is not None else None,
                            schedule_ref=other_node.attributes.get("schedule_ref")
                        )
                    )
                elif other_node.object_class == "WALL":
                    w_poly = other_node.attributes.get("polygon", [])
                    if w_poly:
                        from shapely.geometry import LineString
                        length_ft = (LineString(w_poly).length * scale_factor) / 12.0
                    else:
                        length_ft = self.measure_engine.calculate_linear_dim(other_node.coordinates, scale_factor) / 12.0

                    connected_walls.append(
                        IfcWall(
                            id=other_id,
                            length_feet=round(length_ft, 2),
                            thickness_inches=self._attribute_dimension(other_node.attributes, ["thickness_inches", "thickness", "wall_thickness"]),
                            fire_rating_hours=other_node.attributes.get("fire_rating_hours")
                        )
                    )
                elif other_node.object_class == "WINDOW":
                    w_inch = self._measured_linear_dimension(
                        other_node,
                        scale_factor,
                        ["width_inches", "window_width", "width", "size"]
                    )
                    h_inch = self._attribute_dimension(other_node.attributes, ["height_inches", "window_height", "height"])
                    if w_inch is None:
                        warnings.append(f"Window {other_id} width could not be measured from geometry or schedule evidence.")
                    area_sq_feet = round((w_inch * h_inch) / 144.0, 2) if w_inch is not None and h_inch is not None else None
                    connected_windows.append(
                        IfcWindow(
                            id=other_id,
                            width_inches=w_inch,
                            height_inches=h_inch,
                            area_sq_feet=area_sq_feet
                        )
                    )
                elif other_node.object_class == "SMOKE_DETECTOR":
                    connected_sensors.append(
                        IfcSensor(
                            id=other_id,
                            sensor_type="SMOKE_DETECTOR",
                            attributes=other_node.attributes
                        )
                    )
                elif other_node.object_class in ("SPRINKLER", "HVAC_DIFFUSER"):
                    connected_terminals.append(
                        IfcFlowTerminal(
                            id=other_id,
                            terminal_type=other_node.object_class,
                            attributes=other_node.attributes
                        )
                    )
                elif other_node.object_class in ("ROOM", "CORRIDOR"):
                    connected_space_ids.append(other_id)

            # Run accessibility calculations
            access_data = self.access_engine.evaluate_room_accessibility(
                r_name,
                metrics["turning_clearance_inches"],
            [d.model_dump() for d in connected_doors]
            )

            # Run fire safety analyses
            smoke_count = len(connected_sensors)
            sprinklers_count = len([t for t in connected_terminals if t.terminal_type == "SPRINKLER"])
            fire_data = self.fire_engine.analyze_room_fire_protection(
                metrics["area_sq_ft"],
                smoke_count,
                sprinklers_count
            )

            # If room has exit doors, check separation
            if len(connected_doors) >= 2:
                sep_data = self.fire_engine.verify_exit_separation(
                    r_polygon,
                    exit_centroids,
                    scale_factor
                )
                if not sep_data["exit_separation_satisfied"]:
                    warnings.append(f"Room {r_name} exit door separation is insufficient (required {sep_data['required_separation_inches']} in, got {sep_data['exit_distance_inches']} in)")

            # Total actual exit width is sum of connected door widths
            known_door_widths = [d.width_inches for d in connected_doors if d.width_inches is not None]
            if len(known_door_widths) == len(connected_doors):
                actual_exit_width = round(sum(known_door_widths), 2)
            else:
                actual_exit_width = None

            space_obj = IfcSpace(
                id=r_id,
                space_type=r_node.object_class,
                name=r_name,
                number=r_node.attributes.get("room_number"),
                area_sq_feet=metrics["area_sq_ft"],
                perimeter_feet=metrics["perimeter_ft"],
                ceiling_height_feet=r_node.attributes.get("ceiling_height_feet"),
                occupancy_classification=classification,
                occupant_load=occ_data["occupant_load"],
                required_exit_width_inches=occ_data["required_exit_width_inches"],
                actual_exit_width_inches=actual_exit_width,
                wheelchair_turning_clearance_inches=metrics["turning_clearance_inches"],
                accessible=access_data["accessible"],
                doors=connected_doors,
                windows=connected_windows,
                walls=connected_walls,
                sensors=connected_sensors,
                flow_terminals=connected_terminals,
                connected_spaces_ids=connected_space_ids
            )

            spaces_by_floor.setdefault(r_node.page_idx, {})[r_id] = space_obj

        # 4. Construct IfcBuildingStoreys
        storeys: Dict[str, IfcBuildingStorey] = {}
        for floor_idx, spaces in spaces_by_floor.items():
            storey_id = f"storey-{floor_idx}"
            storeys[storey_id] = IfcBuildingStorey(
                id=storey_id,
                level_index=floor_idx,
                name=f"Floor Level {floor_idx + 1}",
                spaces=spaces
            )

        # 5. Compute Egress Routing pathways (shortest exit travel paths)
        # Search for exit nodes in storeys
        egress_paths: Dict[str, EgressPathInfo] = {}
        for floor_idx, spaces in spaces_by_floor.items():
            rooms_list = [s for s in spaces.values() if s.space_type == "ROOM"]
            doors_list = [d for s in spaces.values() for d in s.doors]
            
            if rooms_list and doors_list:
                for r in rooms_list:
                    for d in r.doors:
                        path_info = self.egress_analyzer.compute_egress_path(graph, r.id, d.id)
                        if not path_info:
                            continue

                        total_dist_ft = (path_info["total_travel_distance_points"] * scale_factor) / 12.0
                        egress_paths[r.id] = EgressPathInfo(
                            path_nodes=path_info["path"],
                            total_distance_feet=round(total_dist_ft, 2),
                            accessible=d.accessible,
                            transitions=path_info["transitions"]
                        )
                        break

        project = IfcProject(
            id=graph.id,
            filename=graph.metadata.get("filename", "unknown_document.pdf"),
            storeys=storeys,
            egress_paths=egress_paths,
            metadata=graph.metadata
        )

        # 6. Calculate project-level metrics
        calculated_metrics = {
            "total_occupant_load": sum(s.occupant_load for storey in storeys.values() for s in storey.spaces.values()),
            "total_area_sq_ft": sum(s.area_sq_feet for storey in storeys.values() for s in storey.spaces.values()),
            "accessible_spaces_count": sum(1 for storey in storeys.values() for s in storey.spaces.values() if s.accessible),
            "spaces_count": sum(len(storey.spaces) for storey in storeys.values())
        }

        return UnifiedBuildingKnowledgeModel(
            project=project,
            calculated_metrics=calculated_metrics,
            warnings=warnings
        )
