import pytest
from drawing_understanding.regions.segmentor import LayoutSegmentor
from drawing_understanding.models import RegionType

def test_layout_segmentation(mock_ingestion_document):
    segmentor = LayoutSegmentor()
    page = mock_ingestion_document.pages[0]
    
    regions = segmentor.segment_page(page)
    
    # Must contain Title Block and Canvas viewports
    reg_types = [r.region_type for r in regions]
    assert RegionType.TITLE_BLOCK in reg_types
    assert RegionType.DRAWING_CANVAS in reg_types
    
    # Check bounding box of title block (located on right margin since right_count >= bottom_count)
    tb_region = next(r for r in regions if r.region_type == RegionType.TITLE_BLOCK)
    assert tb_region.coordinates.xmin >= page.width * 0.75
