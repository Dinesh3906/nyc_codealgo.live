import networkx as nx
from typing import List, Dict, Any
from object_detection.models import SemanticBuildingObject
from ..models import BuildingGraph, BuildingGraphNode, BuildingGraphEdge

class BuildingGraphBuilder:
    """
    Constructs the Building Graph model by combining nodes, local topology edges,
    and vertical floor circulation edges.
    """

    def build_graph(
        self,
        doc_id: str,
        filename: str,
        building_objects: List[SemanticBuildingObject],
        topological_edges: List[BuildingGraphEdge],
        grounding_links: List[Any]
    ) -> BuildingGraph:
        """
        Synthesizes building objects into nodes and merges all edges, returning
        the validated BuildingGraph.
        """
        nodes: Dict[str, BuildingGraphNode] = {}
        
        # 1. Map Semantic Objects to Graph Nodes
        for obj in building_objects:
            nodes[obj.id] = BuildingGraphNode(
                id=obj.id,
                object_class=obj.object_class,
                page_idx=obj.page_idx,
                coordinates=obj.coordinates,
                attributes=obj.attributes
            )

        # 2. Re-map grounding links as edges in the graph
        edges: List[BuildingGraphEdge] = list(topological_edges)
        
        for link in grounding_links:
            txt_id, obj_id, confidence, details = link
            
            if txt_id not in nodes:
                continue

            edges.append(
                BuildingGraphEdge(
                    id=f"edge-gr-{txt_id}-{obj_id}",
                    source_id=txt_id,
                    target_id=obj_id,
                    rel_type="measures",
                    confidence=confidence,
                    reason="Grounding analysis matched dimension text to target object",
                    evidence=details
                )
            )

        return BuildingGraph(
            id=doc_id,
            nodes=nodes,
            edges=edges,
            metadata={
                "node_count": len(nodes),
                "edge_count": len(edges)
            }
        )

    def load_networkx(self, graph: BuildingGraph) -> nx.Graph:
        """
        Helper to instantiate a NetworkX Graph representation of the building topological layout.
        Useful for path routing and accessibility analytics.
        """
        G = nx.Graph()
        
        for node_id, node in graph.nodes.items():
            G.add_node(
                node_id,
                object_class=node.object_class,
                page_idx=node.page_idx,
                **node.attributes
            )

        for edge in graph.edges:
            G.add_edge(
                edge.source_id,
                edge.target_id,
                id=edge.id,
                rel_type=edge.rel_type,
                confidence=edge.confidence
            )

        return G
