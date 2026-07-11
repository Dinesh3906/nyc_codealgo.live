import pytest
import networkx as nx
from spatial_reasoning.graph.builder import BuildingGraphBuilder
from spatial_reasoning.routing.path_analyzer import EgressPathAnalyzer
from spatial_reasoning.topology.engine import TopologyEngine

def test_building_graph_routing(mock_building_objects):
    builder_helper = BuildingGraphBuilder()
    topology = TopologyEngine()
    analyzer = EgressPathAnalyzer()
    
    # 1. Build local edges
    edges = topology.extract_topological_relations(mock_building_objects, 0)
    
    # Manually inject door-corridor link to form a route:
    # room_f1 <-> door_f1 <-> corr_f1
    from spatial_reasoning.models import BuildingGraphEdge
    edges.append(
        BuildingGraphEdge(
            id="edge-door-corr",
            source_id="door_f1",
            target_id="corr_f1",
            rel_type="connected_to",
            reason="Door links room and corridor",
            evidence={}
        )
    )

    graph = builder_helper.build_graph(
        doc_id="test_doc",
        filename="floor_plan.pdf",
        building_objects=mock_building_objects,
        topological_edges=edges,
        grounding_links=[]
    )

    # 2. Compute egress exit path from Room to Corridor
    route_details = analyzer.compute_egress_path(
        graph,
        start_node_id="room_f1",
        exit_node_id="corr_f1"
    )
    
    assert route_details is not None
    # We expect path: room_f1 -> door_f1 -> corr_f1
    assert route_details["path"] == ["room_f1", "door_f1", "corr_f1"]
    assert route_details["transitions_count"] == 3
    assert route_details["total_travel_distance_points"] > 0.0
