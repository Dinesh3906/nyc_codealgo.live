from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from enum import Enum
from document_ingestion.models import BoundingBox

class ObjectRelationshipType(str, Enum):
    CONNECTED_TO = "connected_to"   # e.g., door connected to wall
    IN_ROOM = "in_room"             # e.g., sprinkler or window in a room
    MOUNTED_ON = "mounted_on"       # e.g., fire extinguisher mounted on wall
    ADJACENT_TO = "adjacent_to"     # e.g., Room A adjacent to Corridor B

class SemanticBuildingObject(BaseModel):
    id: str = Field(..., description="Unique building object UUID")
    object_class: str = Field(..., description="e.g. DOOR, WALL, WINDOW, ROOM, FIRE_EXTINGUISHER, SPRINKLER")
    subtype: Optional[str] = None
    coordinates: BoundingBox
    polygon: List[List[float]] = Field(default_factory=list)
    confidence: float = 1.0
    rotation: float = 0.0
    scale: float = 1.0
    page_idx: int
    region_id: Optional[str] = None
    attributes: Dict[str, Any] = Field(default_factory=dict)
    schedule_ref: Optional[str] = Field(None, description="Linked schedule table row key")
    source_refs: List[str] = Field(default_factory=list, description="UUIDs of source primitives or text objects")

class ObjectRelationship(BaseModel):
    id: str
    source_id: str
    target_id: str
    rel_type: ObjectRelationshipType
    confidence: float

class SemanticBuildingObjectModel(BaseModel):
    id: str = Field(..., description="Unique document ID")
    filename: str
    objects: List[SemanticBuildingObject] = Field(default_factory=list)
    relationships: List[ObjectRelationship] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)
