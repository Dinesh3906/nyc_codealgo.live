import pytest
from drawing_understanding.regions.segmentor import LayoutSegmentor
from drawing_understanding.metadata.extractor import TitleBlockMetadataExtractor
from drawing_understanding.models import RegionType

def test_title_block_metadata_extraction(mock_ingestion_document):
    segmentor = LayoutSegmentor()
    extractor = TitleBlockMetadataExtractor()
    page = mock_ingestion_document.pages[0]
    
    regions = segmentor.segment_page(page)
    tb_region = next(r for r in regions if r.region_type == RegionType.TITLE_BLOCK)
    
    meta = extractor.extract_metadata(page, tb_region)
    
    assert meta.sheet_number == "A-101"
    assert meta.scale == "1/4\" = 1'-0\""
    assert meta.date == "12/15/2025"
    assert meta.discipline == "Architectural"
    assert meta.drawing_title == "FIRST FLOOR PLAN"
