from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class IfcDoor(BaseModel):
    id: str
    width_inches: float
    height_inches: float
    fire_rating_minutes: Optional[float] = None
    swing_direction: Optional[str] = None
    accessible: bool = True
    schedule_ref: Optional[str] = None
    confidence: float = 1.0

class IfcWindow(BaseModel):
    id: str
    width_inches: float
    height_inches: float
    area_sq_feet: float
    confidence: float = 1.0

class IfcWall(BaseModel):
    id: str
    length_feet: float
    thickness_inches: float
    fire_rating_hours: Optional[float] = None
    confidence: float = 1.0

class IfcSensor(BaseModel):
    id: str
    sensor_type: str # e.g. SMOKE_DETECTOR, ALARM_PULL_STATION
    attributes: Dict[str, Any] = Field(default_factory=dict)
    confidence: float = 1.0

class IfcFlowTerminal(BaseModel):
    id: str
    terminal_type: str # e.g. SPRINKLER, HVAC_DIFFUSER
    attributes: Dict[str, Any] = Field(default_factory=dict)
    confidence: float = 1.0

class IfcSpace(BaseModel):
    id: str
    space_type: str # ROOM, CORRIDOR, STAIR, ELEVATOR
    name: str
    number: Optional[str] = None
    area_sq_feet: float
    perimeter_feet: float
    volume_cubic_feet: Optional[float] = None
    ceiling_height_feet: float = 9.0
    occupancy_classification: str = "business"
    occupant_load: int = 1
    required_exit_width_inches: float = 0.0
    actual_exit_width_inches: float = 0.0
    wheelchair_turning_clearance_inches: float = 0.0
    accessible: bool = True
    doors: List[IfcDoor] = Field(default_factory=list)
    windows: List[IfcWindow] = Field(default_factory=list)
    walls: List[IfcWall] = Field(default_factory=list)
    sensors: List[IfcSensor] = Field(default_factory=list)
    flow_terminals: List[IfcFlowTerminal] = Field(default_factory=list)
    connected_spaces_ids: List[str] = Field(default_factory=list)
    confidence: float = 1.0

class IfcBuildingStorey(BaseModel):
    id: str
    level_index: int
    name: str
    spaces: Dict[str, IfcSpace] = Field(default_factory=dict)
    metadata: Dict[str, Any] = Field(default_factory=dict)

class EgressPathInfo(BaseModel):
    path_nodes: List[str]
    total_distance_feet: float
    accessible: bool
    transitions: List[Dict[str, str]]

class IfcProject(BaseModel):
    id: str
    filename: str
    storeys: Dict[str, IfcBuildingStorey] = Field(default_factory=dict)
    egress_paths: Dict[str, EgressPathInfo] = Field(default_factory=dict, description="Egress paths (Start Room -> Exit Door)")
    metadata: Dict[str, Any] = Field(default_factory=dict)

class UnifiedBuildingKnowledgeModel(BaseModel):
    project: IfcProject
    calculated_metrics: Dict[str, Any] = Field(default_factory=dict)
    warnings: List[str] = Field(default_factory=list)
