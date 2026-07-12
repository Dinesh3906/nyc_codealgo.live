from document_ingestion.models import Page as IngestionPage, PDFType, BoundingBox
from object_detection.models import SemanticBuildingObject
from object_detection.annotations.associator import AnnotationAssociator

def test_annotation_association(mock_semantic_document):
    associator = AnnotationAssociator()
    sem_page = mock_semantic_document.pages[0]
    
    page = IngestionPage(
        index=0, width=800.0, height=600.0, dpi=300, page_type=PDFType.VECTOR,
        text_objects=sem_page.metadata["text_objects"],
        geometry_objects=[]
    )

    # Instantiate mock building objects (Room at 100,100 to 300,300)
    building_objs = [
        SemanticBuildingObject(
            id="room_1", object_class="ROOM",
            coordinates=BoundingBox(xmin=100, ymin=100, xmax=300, ymax=300),
            polygon=[[100, 100], [300, 100], [300, 300], [100, 300]],
            page_idx=0
        ),
        SemanticBuildingObject(
            id="door_1", object_class="DOOR",
            coordinates=BoundingBox(xmin=140, ymin=90, xmax=160, ymax=110),
            polygon=[[140, 90], [160, 90], [160, 110], [140, 110]],
            page_idx=0
        )
    ]

    updated_objs, relations = associator.associate_annotations(page, building_objs, 0)
    
    # Room (room_1) should contain "OFFICE 101" label (center: 200, 190)
    room = next(o for o in updated_objs if o.id == "room_1")
    assert room.attributes["room_name"] == "OFFICE 101"
    
    # Door (door_1) should match proximity with "D-1" label
    door = next(o for o in updated_objs if o.id == "door_1")
    assert door.attributes["tag"] == "D-1"
    
    # Relationship: door is IN_ROOM room_1
    assert len(relations) == 1
    assert relations[0].source_id == "door_1"
    assert relations[0].target_id == "room_1"
    assert relations[0].rel_type == "in_room"
