from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from spatial_reasoning.models import BuildingGraph
from ..schemas.models import UnifiedBuildingKnowledgeModel
from ..calculations.builder import KnowledgeModelBuilder

app = FastAPI(
    title="PermitIQ Unified Building Knowledge Model API",
    description="Extracts room areas, capacities, door accessibility, and exports IFC-aligned models",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Instantiate builder
builder_helper = KnowledgeModelBuilder()

@app.post("/knowledge", response_model=UnifiedBuildingKnowledgeModel, summary="Generate UBKM Building Knowledge Model")
async def generate_building_knowledge(graph: BuildingGraph):
    """
    Consolidates topological building graphs and calculates areas, clearances,
    occupancy capacities, and exit widths.
    """
    try:
        model = builder_helper.build_knowledge_model(graph)
        return model
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate building knowledge: {str(e)}")

@app.get("/health", summary="Health check")
async def health_check():
    return {
        "status": "healthy",
        "builder": "KnowledgeModelBuilder",
        "ifc_alignment": "light IFC"
    }
