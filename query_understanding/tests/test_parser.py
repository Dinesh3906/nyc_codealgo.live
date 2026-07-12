from query_understanding.parser.query_parser import QueryParser

def test_query_parsing_simple():
    parser = QueryParser()
    
    parsed = parser.parse_query_string("Check stair width")
    
    assert "stair" in parsed.building_components
    assert "width" in parsed.measurements
    assert parsed.jurisdiction == "NYC"
    assert parsed.revision_year == "2022"

def test_query_parsing_complex():
    parser = QueryParser()
    
    parsed = parser.parse_query_string("Check exit travel distance in classroom for NYC 2024")
    
    assert "egress" in parsed.regulatory_concepts
    assert parsed.occupancy == "educational_classroom"
    assert parsed.jurisdiction == "NYC"
    assert parsed.revision_year == "2024"
