from document_ingestion.models import Page as IngestionPage, PDFType
from object_detection.detectors.engine import GeometryBuildingDetector

def test_room_and_wall_detection(mock_semantic_document):
    detector = GeometryBuildingDetector()
    sem_page = mock_semantic_document.pages[0]
    
    # Reconstruct IngestionPage
    page = IngestionPage(
        index=0, width=800.0, height=600.0, dpi=300, page_type=PDFType.VECTOR,
        text_objects=sem_page.metadata["text_objects"],
        geometry_objects=sem_page.metadata["geometry_objects"]
    )

    detected_objs, relations = detector.detect_building_objects(page, 0)
    
    # Check that rooms and walls are detected
    classes = [o.object_class for o in detected_objs]
    assert "ROOM" in classes
    assert "WALL" in classes
    assert "DOOR" in classes # D-1 keyword trigger
    
    # Verify room area is computed
    room = next(o for o in detected_objs if o.object_class == "ROOM")
    # Wall coordinates form 200x200 room polygon -> Area = 40000 points
    assert room.attributes["area_sq_points"] == 40000.0
