import networkx as nx
from typing import List, Dict, Any, Optional
from ..models import BuildingGraph
from ..graph import builder
from ..config import settings

class EgressPathAnalyzer:
    """
    Computes exit pathways, travel distances, and accessibility connectivity
    over Room-Door navigation sub-graphs.
    """

    def compute_egress_path(
        self,
        graph: BuildingGraph,
        start_node_id: str,
        exit_node_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        Computes the shortest path from a start Room to an exit Door node.
        Returns path details, node transitions, and total distance.
        """
        # Load NetworkX representation
        builder_helper = builder.BuildingGraphBuilder()
        G = builder_helper.load_networkx(graph)

        if start_node_id not in G or exit_node_id not in G:
            return None

        # Filter navigation nodes (only Rooms and Doors represent travel paths)
        nav_nodes = [
            n for n, attr in G.nodes(data=True)
            if attr.get("object_class") in ("ROOM", "DOOR", "CORRIDOR", "STAIR")
        ]
        subG = G.subgraph(nav_nodes).copy()
        
        # Keep only physical navigation edges (e.g., connected_to, connects_floors)
        edges_to_remove = []
        for u, v, attr in subG.edges(data=True):
            if attr.get("rel_type") not in ("connected_to", "connects_floors"):
                edges_to_remove.append((u, v))
        subG.remove_edges_from(edges_to_remove)

        # Compute edge weights based on physical centroid distance + door cost
        for u, v in subG.edges():
            u_coords = graph.nodes[u].coordinates
            v_coords = graph.nodes[v].coordinates
            
            u_xmin = u_coords.get("xmin") if isinstance(u_coords, dict) else u_coords.xmin
            u_xmax = u_coords.get("xmax") if isinstance(u_coords, dict) else u_coords.xmax
            u_ymin = u_coords.get("ymin") if isinstance(u_coords, dict) else u_coords.ymin
            u_ymax = u_coords.get("ymax") if isinstance(u_coords, dict) else u_coords.ymax
            v_xmin = v_coords.get("xmin") if isinstance(v_coords, dict) else v_coords.xmin
            v_xmax = v_coords.get("xmax") if isinstance(v_coords, dict) else v_coords.xmax
            v_ymin = v_coords.get("ymin") if isinstance(v_coords, dict) else v_coords.ymin
            v_ymax = v_coords.get("ymax") if isinstance(v_coords, dict) else v_coords.ymax
            
            u_center = ( (u_xmin + u_xmax)/2.0, (u_ymin + u_ymax)/2.0 )
            v_center = ( (v_xmin + v_xmax)/2.0, (v_ymin + v_ymax)/2.0 )
            
            dist = ((u_center[0] - v_center[0])**2 + (u_center[1] - v_center[1])**2)**0.5
            
            # Apply transition cost if moving through door
            if G.nodes[u].get("object_class") == "DOOR" or G.nodes[v].get("object_class") == "DOOR":
                dist += settings.DOOR_TRANSITION_COST_PTS

            subG[u][v]["weight"] = dist

        try:
            # Run Dijkstra shortest path
            path = nx.shortest_path(subG, source=start_node_id, target=exit_node_id, weight="weight")
            path_length = nx.shortest_path_length(subG, source=start_node_id, target=exit_node_id, weight="weight")
            
            # Generate descriptive transitions list
            transitions = []
            for node_id in path:
                node_data = graph.nodes[node_id]
                transitions.append({
                    "id": node_id,
                    "class": node_data.object_class,
                    "name": node_data.attributes.get("room_name", node_data.object_class)
                })

            return {
                "path": path,
                "transitions_count": len(path),
                "total_travel_distance_points": path_length,
                "transitions": transitions
            }
        except nx.NetworkXNoPath:
            return None
