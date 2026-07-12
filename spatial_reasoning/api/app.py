from fastapi import FastAPI
from shared.cors import configure_cors
from object_detection.models import SemanticBuildingObjectModel
from ..models import BuildingGraph, BuildingGraphEdge
from ..grounding.engine import GroundingEngine
from ..topology.engine import TopologyEngine
from ..graph.builder import BuildingGraphBuilder
from ..routing.path_analyzer import EgressPathAnalyzer

app = FastAPI(
    title="PermitIQ Spatial Reasoning & Building Graph API",
    description="Extracts topological relations, grounds annotations, and builds the Building Graph",
    version="1.0.0"
)

configure_cors(app)

# Instantiate engines
grounding_engine = GroundingEngine()
topology_engine = TopologyEngine()
graph_builder = BuildingGraphBuilder()
egress_analyzer = EgressPathAnalyzer()

@app.post("/graph", response_model=BuildingGraph, summary="Build Building Graph from Semantic Objects")
async def build_building_graph(doc: SemanticBuildingObjectModel):
    """
    Takes Semantic Building Objects and constructs containment, connectivity,
    grounding linkages, and vertical floor graph connections.
    """
    all_topological_edges: List[BuildingGraphEdge] = []
    all_grounding_links = []

    # Map raw text and geometry lists from document metadata (if available)
    # We populate these inside tests/conftest to simulate inputs
    raw_text_objs = doc.metadata.get("text_objects", [])
    raw_geom_objs = doc.metadata.get("geometry_objects", [])

    # 1. Run Grounding Engine (Dimension labels to Wall lines)
    grounding_links = grounding_engine.ground_annotations(
        doc.objects,
        raw_text_objs,
        raw_geom_objs
    )
    all_grounding_links.extend(grounding_links)

    # 2. Extract topological connections per page
    # Find active pages
    pages_found = set(obj.page_idx for obj in doc.objects)
    for page_idx in pages_found:
        page_edges = topology_engine.extract_topological_relations(
            doc.objects,
            page_idx
        )
        all_topological_edges.extend(page_edges)

    # 3. Extract multi-sheet vertical circulation links
    multi_sheet_edges = topology_engine.extract_multi_sheet_links(
        doc.objects
    )
    all_topological_edges.extend(multi_sheet_edges)

    # 4. Construct building graph
    graph = graph_builder.build_graph(
        doc.id,
        doc.filename,
        doc.objects,
        all_topological_edges,
        all_grounding_links
    )

    return graph

@app.get("/health", summary="Health check")
async def health_check():
    return {
        "status": "healthy",
        "grounding": "GroundingEngine",
        "topology": "TopologyEngine",
        "graph_builder": "BuildingGraphBuilder"
    }
from typing import List
