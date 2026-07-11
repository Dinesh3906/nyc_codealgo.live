import pytest
from document_ingestion.models import (
    Page as IngestionPage, TextObject, BoundingBox, CoordinateSystem, CoordinateSystemType, PDFType
)
from drawing_understanding.models import SemanticRegion, RegionType
from drawing_understanding.legends.parser import LegendParser

def test_legend_parsing():
    coord_sys = CoordinateSystem(
        system_type=CoordinateSystemType.PDF,
        width=800.0,
        height=600.0
    )
    
    # Legend rows: key on left, value on right
    # Row 1: Symbol "S1" -> "SPRINKLER HEAD"
    # Row 2: Abbreviation "WC" -> "WATER CLOSET"
    text_objs = [
        # Legend Header
        TextObject(id="title", page_idx=0, coordinates=BoundingBox(xmin=100, ymin=530, xmax=200, ymax=545), coordinate_system=coord_sys, text="SYMBOL LEGEND", source="test", processing_method="test"),
        # Row 1
        TextObject(id="k1", page_idx=0, coordinates=BoundingBox(xmin=100, ymin=500, xmax=115, ymax=510), coordinate_system=coord_sys, text="S1", source="test", processing_method="test"),
        TextObject(id="v1", page_idx=0, coordinates=BoundingBox(xmin=150, ymin=500, xmax=250, ymax=510), coordinate_system=coord_sys, text="SPRINKLER HEAD", source="test", processing_method="test"),
        # Row 2
        TextObject(id="k2", page_idx=0, coordinates=BoundingBox(xmin=100, ymin=480, xmax=115, ymax=490), coordinate_system=coord_sys, text="WC", source="test", processing_method="test"),
        TextObject(id="v2", page_idx=0, coordinates=BoundingBox(xmin=150, ymin=480, xmax=250, ymax=490), coordinate_system=coord_sys, text="WATER CLOSET", source="test", processing_method="test"),
        # Note row
        TextObject(id="note", page_idx=0, coordinates=BoundingBox(xmin=100, ymin=460, xmax=300, ymax=470), coordinate_system=coord_sys, text="GENERAL NOTE: ALL DIMENSIONS IN INCHES", source="test", processing_method="test")
    ]
    
    page = IngestionPage(
        index=0, width=800.0, height=600.0, dpi=300, page_type=PDFType.VECTOR,
        text_objects=text_objs
    )
    
    region = SemanticRegion(
        id="leg_r", region_type=RegionType.LEGEND,
        coordinates=BoundingBox(xmin=90, ymin=450, xmax=310, ymax=550),
        confidence=1.0
    )
    
    parser = LegendParser()
    legend = parser.parse_legend(page, region)
    
    # "WC" is uppercase abbreviation
    assert legend.abbreviation_dictionary["WC"] == "WATER CLOSET"
    # "S1" contains digit, so symbol dictionary
    assert legend.symbol_dictionary["S1"] == "SPRINKLER HEAD"
    # Single text block row -> notes
    assert "GENERAL NOTE: ALL DIMENSIONS IN INCHES" in legend.notes
