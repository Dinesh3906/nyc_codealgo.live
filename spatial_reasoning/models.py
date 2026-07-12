from pydantic import BaseModel, Field
from typing import List, Dict, Any
from document_ingestion.models import BoundingBox

class BuildingGraphNode(BaseModel):
    id: str = Field(..., description="Unique node ID")
    object_class: str = Field(..., description="e.g. ROOM, WALL, DOOR, WINDOW, FIRE_EXTINGUISHER")
    page_idx: int
    coordinates: BoundingBox
    attributes: Dict[str, Any] = Field(default_factory=dict)

class BuildingGraphEdge(BaseModel):
    id: str = Field(..., description="Unique edge ID")
    source_id: str = Field(..., description="Source node UUID")
    target_id: str = Field(..., description="Target node UUID")
    rel_type: str = Field(..., description="e.g., contains, connected_to, adjacent_to, located_in")
    confidence: float = 1.0
    reason: str = Field(..., description="Explanation of why this relationship was inferred")
    evidence: Dict[str, Any] = Field(default_factory=dict, description="Supporting coordinates or overlap properties")

class BuildingGraph(BaseModel):
    id: str = Field(..., description="Unique document hash or ID")
    nodes: Dict[str, BuildingGraphNode] = Field(default_factory=dict)
    edges: List[BuildingGraphEdge] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)
