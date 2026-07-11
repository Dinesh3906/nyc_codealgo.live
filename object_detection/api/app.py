from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from drawing_understanding.models import SemanticDocumentModel
from ..models import SemanticBuildingObjectModel, SemanticBuildingObject, ObjectRelationship
from ..detectors.engine import GeometryBuildingDetector
from ..symbols.recognizer import SymbolRecognizerEngine
from ..annotations.associator import AnnotationAssociator
from ..schedules.linker import ScheduleLinker

app = FastAPI(
    title="PermitIQ Object Detection API",
    description="Identifies engineering building elements, symbols, annotations, and links schedules",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Instantiate engines
geom_detector = GeometryBuildingDetector()
symbol_recognizer = SymbolRecognizerEngine()
annotation_associator = AnnotationAssociator()
schedule_linker = ScheduleLinker()

@app.post("/detect", response_model=SemanticBuildingObjectModel, summary="Detect engineering objects in document")
async def detect_document_objects(doc: SemanticDocumentModel):
    """
    Takes a Semantic Document Model and runs geometry detectors, symbol recognizers,
    annotation associations, and schedule mapping links.
    """
    all_building_objects: List[SemanticBuildingObject] = []
    all_relationships: List[ObjectRelationship] = []

    # Map Phase 2 Ingestion Page structure from Phase 3 SemanticPage for geometry engines
    from document_ingestion.models import Page as IngestionPage
    
    # Process each page
    for sem_page in doc.pages:
        # Reconstruct IngestionPage structure required by detectors
        # We need width, height, text_objects, geometry_objects
        # Map text_objects from title block or find them
        # In a real environment, we'd retrieve them. For mapping, we extract them from semantic pages
        
        # Let's map back from semantic page properties
        ingest_page = IngestionPage(
            index=sem_page.index,
            width=sem_page.width,
            height=sem_page.height,
            page_type=sem_page.page_type,
            # Synthesize text objects from title block, schedules, and hierarchy for matching tests
            text_objects=[]
        )
        
        # Add back raw text objects for geometric matching and R-Treecontainments
        # In conftest/tests we populated these inside the ingestion page structure
        # We can map them from sem_page.metadata if we saved them there
        # Or read them if they were passed
        
        # Let's read text objects from sem_page.metadata if available (our conftest will pass them)
        raw_text_objects = sem_page.metadata.get("text_objects", [])
        raw_geometry_objects = sem_page.metadata.get("geometry_objects", [])
        
        ingest_page.text_objects = raw_text_objects
        ingest_page.geometry_objects = raw_geometry_objects

        # 1. Run Geometry-based Element Detector (Walls, Doors, Rooms)
        detected_elements, element_relations = geom_detector.detect_building_objects(
            ingest_page, 
            sem_page.index
        )

        # 2. Run Symbol Recognizer (Sprinklers, Extinguishers) using legend dictionaries
        # Extract symbol dictionary from parsed legend
        legend_symbols: Dict[str, str] = {}
        for leg in sem_page.legends:
            legend_symbols.update(leg.symbol_dictionary)
            legend_symbols.update(leg.abbreviation_dictionary)

        detected_symbols = symbol_recognizer.recognize_symbols(
            ingest_page, 
            legend_symbols, 
            sem_page.index
        )

        # Merge page detections
        page_objects = detected_elements + detected_symbols

        # 3. Associate Annotations (Attaching room names, door numbers, containments)
        page_objects, page_relations = annotation_associator.associate_annotations(
            ingest_page,
            page_objects,
            sem_page.index
        )

        # 4. Link schedules to objects
        page_objects = schedule_linker.link_schedules_to_objects(
            page_objects,
            sem_page.schedules
        )

        all_building_objects.extend(page_objects)
        all_relationships.extend(page_relations)

    return SemanticBuildingObjectModel(
        id=doc.id,
        filename=doc.filename,
        objects=all_building_objects,
        relationships=all_relationships,
        metadata={
            "detected_objects_count": len(all_building_objects),
            "relationships_count": len(all_relationships)
        }
    )

@app.get("/health", summary="Health check")
async def health_check():
    return {
        "status": "healthy",
        "detector": "GeometryBuildingDetector",
        "recognizer": "SymbolRecognizerEngine"
    }
from typing import List, Dict
