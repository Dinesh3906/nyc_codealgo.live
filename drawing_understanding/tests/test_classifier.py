import pytest
from drawing_understanding.sheet_classifier.engine import SheetClassifierEngine
from drawing_understanding.models import PageClassificationType

def test_sheet_classifier_floor_plan(mock_ingestion_document):
    engine = SheetClassifierEngine()
    page = mock_ingestion_document.pages[0]
    
    classes, confs = engine.classify_sheet(page)
    
    # Classifications should contain floor_plan (mapped from PageClassificationType)
    assert PageClassificationType.FLOOR_PLAN in classes
    assert confs[PageClassificationType.FLOOR_PLAN] > 0.7

def test_sheet_classifier_prefix():
    engine = SheetClassifierEngine()
    # Mocking text containing structural sheet number tag
    text = "FOUNDATION PLAN AND COLUMNS DETAILS SHEET S-101"
    
    prefix = engine._extract_sheet_prefix(text)
    assert prefix == "S"
