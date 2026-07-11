import pytest
import pypdf
from unittest.mock import MagicMock, patch
from document_ingestion.parser.detector import PDFTypeDetector
from document_ingestion.parser.classifier import PageClassifier
from document_ingestion.models import PDFType, PageClassificationType

def test_page_type_detection(mock_pypdf_page):
    detector = PDFTypeDetector()
    p_type, conf = detector.detect_page_type(mock_pypdf_page)
    
    # Page contains both text, vector operators (S, m, l), and image objects -> Hybrid
    assert p_type == PDFType.HYBRID
    assert conf > 0.8

def test_page_classifier():
    classifier = PageClassifier()
    
    # Test floor plan text
    labels, confs = classifier.classify_page("FIRST FLOOR PLAN ELECTRICAL LAYOUT")
    assert PageClassificationType.FLOOR_PLAN in labels
    assert PageClassificationType.MEP in labels
    assert confs[PageClassificationType.FLOOR_PLAN] >= 0.7
    
    # Test structural schedule
    labels, confs = classifier.classify_page("DOOR AND WINDOW SCHEDULE TABLE")
    assert PageClassificationType.SCHEDULE in labels
    
    # Test fallback
    labels, confs = classifier.classify_page("RANDOM TEXT WITH NO KEYWORDS")
    assert PageClassificationType.UNKNOWN in labels
    assert confs[PageClassificationType.UNKNOWN] == 1.0
